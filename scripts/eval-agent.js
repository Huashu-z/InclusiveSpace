import fs from "fs/promises";
import path from "path";
import { buildAgentChatResponse } from "../utils/agentChat.js";
import { cityLayerConfig } from "../components/cityVariableConfig.js";

const DATASET_PATH = path.join(process.cwd(), "eval", "agent_eval_cases.json");
const REPORT_PATH = path.join(process.cwd(), "eval", "agent_eval_report.json");
const TOP_K_VALUES = [3, 5];

function pct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sourceOf(doc) {
  return doc?.metadata?.source || doc?.source || "";
}

function matchesExpectedLocation(actual, expected) {
  if (expected === null || expected === undefined) return actual === null || actual === undefined;
  return String(actual || "").toLowerCase() === String(expected).toLowerCase();
}

function hasExpectedWarning(warnings, expected) {
  const text = warnings.join(" ").toLowerCase();
  return String(expected).toLowerCase().split(/\s+/).every((part) => text.includes(part));
}

function getCurrentMapState(testCase) {
  const context = testCase.context || {};
  return {
    walkingTime: context.currentWalkingTime,
    walkingSpeed: context.currentWalkingSpeed,
    startPoint: context.currentStartPoint,
    profile: context.currentProfile ? { id: context.currentProfile } : null,
  };
}

function getRetrievalMetrics(retrieval, expectedSources) {
  const sources = safeArray(retrieval?.results).map(sourceOf);
  const expected = new Set(safeArray(expectedSources));
  const relevantRanks = sources
    .map((source, index) => ({ source, rank: index + 1 }))
    .filter((item) => expected.has(item.source));

  const byK = {};
  for (const k of TOP_K_VALUES) {
    const top = sources.slice(0, k);
    const uniqueTop = [...new Set(top)];
    const relevantCount = uniqueTop.filter((source) => expected.has(source)).length;
    byK[k] = {
      hit: relevantCount > 0,
      recall: expected.size ? relevantCount / expected.size : 1,
      precision: top.length ? top.filter((source) => expected.has(source)).length / top.length : expected.size ? 0 : 1,
      incomplete: expected.size > 0 && relevantCount < expected.size,
    };
  }

  return {
    sources,
    byK,
    reciprocalRank: relevantRanks.length ? 1 / relevantRanks[0].rank : 0,
  };
}

function getVariableMetrics(action, expectedVariables, forbiddenVariables) {
  const selected = new Set(safeArray(action?.enabledVariables));
  const expected = new Set(safeArray(expectedVariables));
  const forbidden = new Set(safeArray(forbiddenVariables));

  const correctSelected = [...selected].filter((variable) => expected.has(variable)).length;
  const expectedSelected = [...expected].filter((variable) => selected.has(variable)).length;
  const forbiddenSelected = [...forbidden].filter((variable) => selected.has(variable)).length;
  const cityWhitelist = new Set(cityLayerConfig[action?.city]?.discomfortFeatures || []);
  const unknownSelected = [...selected].filter((variable) => !cityWhitelist.has(variable));

  return {
    selected: [...selected],
    precisionNumerator: correctSelected,
    precisionDenominator: selected.size,
    recallNumerator: expectedSelected,
    recallDenominator: expected.size,
    forbiddenNumerator: forbiddenSelected,
    forbiddenDenominator: forbidden.size,
    unknownSelected,
  };
}

function validateStructuredOutput(data) {
  const errors = [];
  for (const field of ["intent", "reply", "action", "missingDataWarnings", "citations"]) {
    if (!(field in data)) errors.push(`missing response field: ${field}`);
  }

  const action = data.action || {};
  if (!["RUN_ACCESSIBILITY_ANALYSIS", "ASK_USER_TO_SELECT_POINT", "ANSWER_ONLY"].includes(action.type)) {
    errors.push("invalid action type");
  }
  if (action.type === "RUN_ACCESSIBILITY_ANALYSIS") {
    for (const field of ["profile", "city", "walkingTime", "walkingSpeed", "enabledVariables", "layerValues"]) {
      if (!(field in action)) errors.push(`missing action field: ${field}`);
    }
    if (!Array.isArray(action.coordinates) || action.coordinates.length !== 2) {
      errors.push("RUN_ACCESSIBILITY_ANALYSIS requires [lon, lat] coordinates");
    } else if (!action.coordinates.every((value) => Number.isFinite(Number(value)))) {
      errors.push("coordinates must be finite [lon, lat]");
    }
  }
  if (action.enabledVariables && !Array.isArray(action.enabledVariables)) errors.push("enabledVariables must be array");
  if (action.layerValues && (typeof action.layerValues !== "object" || Array.isArray(action.layerValues))) {
    errors.push("layerValues must be object");
  }

  return errors;
}

function getFaithfulnessChecks(data) {
  const reply = String(data.reply || "");
  const lower = reply.toLowerCase();
  const forbiddenClaims = [
    "many stairs",
    "very noisy",
    "many obstacles",
    "pavement is bad",
    "road is very noisy",
  ];
  const unsupportedClaims = forbiddenClaims.filter((claim) => lower.includes(claim));
  const requiredSections = ["Profile assumptions", "Available data", "Computed result", "Data limitations"];
  const missingSections = data.intent === "explain_result"
    ? requiredSections.filter((section) => !reply.includes(section))
    : [];

  return {
    pass: unsupportedClaims.length === 0 && missingSections.length === 0,
    unsupportedClaims,
    mentionsLimitations: reply.includes("Data limitations") || lower.includes("limitation"),
    missingSections,
  };
}

function evaluateCase(testCase, data) {
  const failures = [];
  const retrievalMetrics = getRetrievalMetrics(data.retrieval, testCase.expectedSources);
  const variableMetrics = getVariableMetrics(data.action, testCase.expectedVariables, testCase.forbiddenVariables);
  const structuredErrors = validateStructuredOutput(data);
  const faithfulness = getFaithfulnessChecks(data);
  const warnings = safeArray(data.missingDataWarnings);

  if (data.intent !== testCase.expectedIntent) failures.push(`intent expected ${testCase.expectedIntent}, got ${data.intent}`);
  if (testCase.expectedProfile !== undefined && testCase.expectedProfile !== null && data.action?.profile !== testCase.expectedProfile) {
    failures.push(`profile expected ${testCase.expectedProfile}, got ${data.action?.profile}`);
  }
  if (testCase.expectedProfile === null && data.action?.profile) failures.push(`profile expected null, got ${data.action.profile}`);
  if (data.action?.city !== testCase.expectedCity) failures.push(`city expected ${testCase.expectedCity}, got ${data.action?.city}`);
  if (!matchesExpectedLocation(data.action?.locationText, testCase.expectedLocationText)) {
    failures.push(`locationText expected ${testCase.expectedLocationText}, got ${data.action?.locationText}`);
  }
  if (testCase.shouldRunAnalysis && data.action?.type !== "RUN_ACCESSIBILITY_ANALYSIS") {
    failures.push(`should run analysis, got action ${data.action?.type}`);
  }
  if (!testCase.shouldRunAnalysis && data.action?.type === "RUN_ACCESSIBILITY_ANALYSIS") {
    failures.push("should not run analysis");
  }
  if (testCase.shouldAskForMapPoint && data.action?.type !== "ASK_USER_TO_SELECT_POINT") {
    failures.push(`should ask for map point, got action ${data.action?.type}`);
  }

  for (const expectedWarning of safeArray(testCase.expectedWarnings)) {
    if (!hasExpectedWarning(warnings, expectedWarning)) {
      failures.push(`missing expected warning: ${expectedWarning}`);
    }
  }
  for (const variable of variableMetrics.unknownSelected) {
    failures.push(`selected unknown or unavailable variable: ${variable}`);
  }
  if (structuredErrors.length) failures.push(...structuredErrors);
  if (testCase.expectedIntent === "explain_result" && !faithfulness.pass) {
    failures.push(...faithfulness.unsupportedClaims.map((claim) => `unsupported claim: ${claim}`));
    failures.push(...faithfulness.missingSections.map((section) => `missing explanation section: ${section}`));
  }
  if (retrievalMetrics.byK[5]?.incomplete) {
    failures.push(`retrieval incomplete@5 expected sources ${safeArray(testCase.expectedSources).join(", ")}, got ${retrievalMetrics.sources.slice(0, 5).join(", ")}`);
  }

  return {
    id: testCase.id,
    category: testCase.category,
    query: testCase.query,
    expected: {
      intent: testCase.expectedIntent,
      profile: testCase.expectedProfile,
      city: testCase.expectedCity,
      locationText: testCase.expectedLocationText,
      sources: testCase.expectedSources,
      variables: testCase.expectedVariables,
      forbiddenVariables: testCase.forbiddenVariables,
      shouldRunAnalysis: testCase.shouldRunAnalysis,
      shouldAskForMapPoint: testCase.shouldAskForMapPoint,
      expectedWarnings: testCase.expectedWarnings,
    },
    actual: {
      intent: data.intent,
      profile: data.action?.profile || null,
      city: data.action?.city || null,
      locationText: data.action?.locationText || null,
      actionType: data.action?.type || null,
      selectedVariables: safeArray(data.action?.enabledVariables),
      warnings,
      retrievedSources: retrievalMetrics.sources,
    },
    retrievalMetrics,
    variableMetrics,
    structuredErrors,
    faithfulness,
    success: failures.length === 0,
    failures,
  };
}

function addRatio(acc, numerator, denominator) {
  acc.numerator += numerator;
  acc.denominator += denominator;
}

function ratio(acc) {
  return acc.denominator ? acc.numerator / acc.denominator : 1;
}

function summarize(results) {
  const counters = {
    intent: { numerator: 0, denominator: results.length },
    profile: { numerator: 0, denominator: 0 },
    city: { numerator: 0, denominator: results.length },
    location: { numerator: 0, denominator: 0 },
    retrievalHit3: { numerator: 0, denominator: results.length },
    retrievalHit5: { numerator: 0, denominator: results.length },
    retrievalRecall3: { numerator: 0, denominator: 0 },
    retrievalRecall5: { numerator: 0, denominator: 0 },
    retrievalPrecision3: { numerator: 0, denominator: 0 },
    retrievalPrecision5: { numerator: 0, denominator: 0 },
    mrr: { numerator: 0, denominator: results.length },
    variablePrecision: { numerator: 0, denominator: 0 },
    variableRecall: { numerator: 0, denominator: 0 },
    forbiddenVariableRate: { numerator: 0, denominator: 0 },
    unsupportedBlocking: { numerator: 0, denominator: 0 },
    warningAccuracy: { numerator: 0, denominator: 0 },
    jsonValid: { numerator: results.length, denominator: results.length },
    schemaPass: { numerator: 0, denominator: results.length },
    actionValid: { numerator: 0, denominator: 0 },
    geocodingSuccess: { numerator: 0, denominator: 0 },
    askForPoint: { numerator: 0, denominator: 0 },
    faithfulness: { numerator: 0, denominator: 0 },
    unsupportedClaimRate: { numerator: 0, denominator: 0 },
    limitationMention: { numerator: 0, denominator: 0 },
    e2e: { numerator: 0, denominator: results.length },
  };

  for (const result of results) {
    const expected = result.expected;
    const actual = result.actual;

    if (actual.intent === expected.intent) counters.intent.numerator += 1;
    if (expected.profile !== undefined && expected.profile !== null) {
      counters.profile.denominator += 1;
      if (actual.profile === expected.profile) counters.profile.numerator += 1;
    }
    if (actual.city === expected.city) counters.city.numerator += 1;
    if (expected.locationText !== undefined && expected.locationText !== null) {
      counters.location.denominator += 1;
      if (matchesExpectedLocation(actual.locationText, expected.locationText)) counters.location.numerator += 1;
    }

    if (result.retrievalMetrics.byK[3].hit) counters.retrievalHit3.numerator += 1;
    if (result.retrievalMetrics.byK[5].hit) counters.retrievalHit5.numerator += 1;
    addRatio(counters.retrievalRecall3, result.retrievalMetrics.byK[3].recall, 1);
    addRatio(counters.retrievalRecall5, result.retrievalMetrics.byK[5].recall, 1);
    addRatio(counters.retrievalPrecision3, result.retrievalMetrics.byK[3].precision, 1);
    addRatio(counters.retrievalPrecision5, result.retrievalMetrics.byK[5].precision, 1);
    counters.mrr.numerator += result.retrievalMetrics.reciprocalRank;

    addRatio(counters.variablePrecision, result.variableMetrics.precisionNumerator, result.variableMetrics.precisionDenominator);
    addRatio(counters.variableRecall, result.variableMetrics.recallNumerator, result.variableMetrics.recallDenominator);
    addRatio(counters.forbiddenVariableRate, result.variableMetrics.forbiddenNumerator, result.variableMetrics.forbiddenDenominator);
    if (result.expected.forbiddenVariables?.length) {
      counters.unsupportedBlocking.denominator += result.expected.forbiddenVariables.length;
      counters.unsupportedBlocking.numerator += result.expected.forbiddenVariables.length - result.variableMetrics.forbiddenNumerator;
    }
    if (result.expected.expectedWarnings?.length) {
      counters.warningAccuracy.denominator += safeArray(result.expected.expectedWarnings).length;
      const warningText = result.actual.warnings.join(" ").toLowerCase();
      counters.warningAccuracy.numerator += safeArray(result.expected.expectedWarnings).filter((warning) => warningText.includes(String(warning).toLowerCase())).length;
    }

    if (!result.structuredErrors.length) counters.schemaPass.numerator += 1;
    if (["RUN_ACCESSIBILITY_ANALYSIS", "ASK_USER_TO_SELECT_POINT"].includes(actual.actionType)) {
      counters.actionValid.denominator += 1;
      if (!result.structuredErrors.length) counters.actionValid.numerator += 1;
    }
    if (expected.shouldRunAnalysis) {
      counters.geocodingSuccess.denominator += 1;
      if (actual.actionType === "RUN_ACCESSIBILITY_ANALYSIS") counters.geocodingSuccess.numerator += 1;
    }
    if (expected.shouldAskForMapPoint) {
      counters.askForPoint.denominator += 1;
      if (actual.actionType === "ASK_USER_TO_SELECT_POINT") counters.askForPoint.numerator += 1;
    }
    if (expected.intent === "explain_result") {
      counters.faithfulness.denominator += 1;
      counters.unsupportedClaimRate.denominator += 1;
      counters.limitationMention.denominator += 1;
      if (result.faithfulness.pass) counters.faithfulness.numerator += 1;
      if (result.faithfulness.unsupportedClaims.length) counters.unsupportedClaimRate.numerator += 1;
      if (result.faithfulness.mentionsLimitations) counters.limitationMention.numerator += 1;
    }
    if (result.success) counters.e2e.numerator += 1;
  }

  return {
    totalCases: results.length,
    intentAccuracy: ratio(counters.intent),
    profileAccuracy: ratio(counters.profile),
    cityAccuracy: ratio(counters.city),
    locationExtractionAccuracy: ratio(counters.location),
    retrievalHitRateAt3: ratio(counters.retrievalHit3),
    retrievalHitRateAt5: ratio(counters.retrievalHit5),
    retrievalRecallAt3: ratio(counters.retrievalRecall3),
    retrievalRecallAt5: ratio(counters.retrievalRecall5),
    retrievalPrecisionAt3: ratio(counters.retrievalPrecision3),
    retrievalPrecisionAt5: ratio(counters.retrievalPrecision5),
    mrr: ratio(counters.mrr),
    variablePrecision: ratio(counters.variablePrecision),
    variableRecall: ratio(counters.variableRecall),
    forbiddenVariableRate: ratio(counters.forbiddenVariableRate),
    unsupportedVariableBlockingRate: ratio(counters.unsupportedBlocking),
    missingDataWarningAccuracy: ratio(counters.warningAccuracy),
    jsonValidRate: ratio(counters.jsonValid),
    schemaPassRate: ratio(counters.schemaPass),
    actionValidRate: ratio(counters.actionValid),
    geocodingSuccessRate: ratio(counters.geocodingSuccess),
    correctAskForPointRate: ratio(counters.askForPoint),
    faithfulnessPassRate: ratio(counters.faithfulness),
    unsupportedClaimRate: ratio(counters.unsupportedClaimRate),
    dataLimitationMentionRate: ratio(counters.limitationMention),
    endToEndTaskSuccessRate: ratio(counters.e2e),
  };
}

function printSummary(summary, failed) {
  console.log(`Total cases: ${summary.totalCases}`);
  console.log(`Intent Accuracy: ${pct(summary.intentAccuracy)}`);
  console.log(`Profile Accuracy: ${pct(summary.profileAccuracy)}`);
  console.log(`City Accuracy: ${pct(summary.cityAccuracy)}`);
  console.log(`Location Extraction Accuracy: ${pct(summary.locationExtractionAccuracy)}`);
  console.log(`Retrieval Hit Rate@3: ${pct(summary.retrievalHitRateAt3)}`);
  console.log(`Retrieval Hit Rate@5: ${pct(summary.retrievalHitRateAt5)}`);
  console.log(`Retrieval Recall@3: ${pct(summary.retrievalRecallAt3)}`);
  console.log(`Retrieval Recall@5: ${pct(summary.retrievalRecallAt5)}`);
  console.log(`Retrieval Precision@3: ${pct(summary.retrievalPrecisionAt3)}`);
  console.log(`Retrieval Precision@5: ${pct(summary.retrievalPrecisionAt5)}`);
  console.log(`MRR: ${Math.round(summary.mrr * 100) / 100}`);
  console.log(`Variable Precision: ${pct(summary.variablePrecision)}`);
  console.log(`Variable Recall: ${pct(summary.variableRecall)}`);
  console.log(`Forbidden Variable Rate: ${pct(summary.forbiddenVariableRate)}`);
  console.log(`Unsupported Variable Blocking Rate: ${pct(summary.unsupportedVariableBlockingRate)}`);
  console.log(`Missing Data Warning Accuracy: ${pct(summary.missingDataWarningAccuracy)}`);
  console.log(`JSON Valid Rate: ${pct(summary.jsonValidRate)}`);
  console.log(`Schema Pass Rate: ${pct(summary.schemaPassRate)}`);
  console.log(`Action Valid Rate: ${pct(summary.actionValidRate)}`);
  console.log(`Geocoding Success Rate: ${pct(summary.geocodingSuccessRate)}`);
  console.log(`Correct Ask-for-Point Rate: ${pct(summary.correctAskForPointRate)}`);
  console.log(`Faithfulness Pass Rate: ${pct(summary.faithfulnessPassRate)}`);
  console.log(`Unsupported Claim Rate: ${pct(summary.unsupportedClaimRate)}`);
  console.log(`Data Limitation Mention Rate: ${pct(summary.dataLimitationMentionRate)}`);
  console.log(`End-to-End Task Success Rate: ${pct(summary.endToEndTaskSuccessRate)}`);

  if (!failed.length) {
    console.log("\nFailed cases: none");
    return;
  }

  console.log(`\nFailed cases: ${failed.length}`);
  for (const failure of failed) {
    console.log(`- ${failure.id}: ${failure.failures.join("; ")}`);
    console.log(`  query: ${failure.query}`);
    console.log(`  retrieved sources: ${failure.actual.retrievedSources.slice(0, 5).join(", ")}`);
    console.log(`  selected variables: ${failure.actual.selectedVariables.join(", ")}`);
    console.log(`  warnings: ${failure.actual.warnings.join(" | ")}`);
  }
}

async function main() {
  const raw = await fs.readFile(DATASET_PATH, "utf8");
  const cases = JSON.parse(raw);
  const results = [];

  for (const testCase of cases) {
    const context = testCase.context || {};
    const data = await buildAgentChatResponse({
      message: testCase.query,
      city: context.currentCity || "hamburg",
      currentMapState: getCurrentMapState(testCase),
      resultMetadata: context.latestResultMetadata || null,
    });
    results.push(evaluateCase(testCase, data));
  }

  const summary = summarize(results);
  const failed = results.filter((result) => !result.success);
  const report = {
    createdAt: new Date().toISOString(),
    dataset: path.relative(process.cwd(), DATASET_PATH).replace(/\\/g, "/"),
    summary,
    failedCases: failed,
    results,
  };

  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printSummary(summary, failed);
  console.log(`\nReport written to ${path.relative(process.cwd(), REPORT_PATH).replace(/\\/g, "/")}`);

  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
