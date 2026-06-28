import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { performance } from "perf_hooks";
import { execFileSync } from "child_process";
import { pathToFileURL } from "url";
import { buildAgentChatResponse } from "../utils/agentChat.js";
import { cityLayerConfig } from "../components/cityVariableConfig.js";

const VALID_ACTIONS = new Set([
  "RUN_ACCESSIBILITY_ANALYSIS", "RUN_ANALYSIS_THEN_COMPARE", "COMPARE_EXISTING_RESULTS",
  "APPLY_PREVIOUS_SETTINGS_TO_CURRENT_POINT", "ASK_FOR_LOCATION", "ASK_FOR_PREVIOUS_RESULT",
  "ASK_USER_TO_SELECT_POINT", "ANSWER_ONLY",
]);
const UNSUPPORTED_INTENTS = new Set([
  "citywide_place_recommendation", "specific_poi_query", "route_recommendation",
]);

function argsOf(argv) {
  return Object.fromEntries(argv.slice(2).map((item) => {
    const match = item.match(/^--([^=]+)=(.*)$/);
    return match ? [match[1], match[2]] : [item.replace(/^--/, ""), true];
  }));
}

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}

const array = (value) => Array.isArray(value) ? value : [];
const round = (value, digits = 4) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const sourceOf = (value) => value?.metadata?.source || value?.source || "";
const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const same = (actual, expected) => normalized(actual) === normalized(expected);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function detectLanguage(text) {
  if (/[\u3400-\u9fff]/u.test(text)) return "zh";
  if (/[äöüß]/iu.test(text) || /\b(ich|wie|wo|warum|welche|kann|für|mit|nicht|ältere|menschen)\b/iu.test(text)) return "de";
  return "en";
}

function currentMapState(testCase) {
  const c = testCase.context || {};
  return {
    walkingTime: c.currentWalkingTime,
    walkingSpeed: c.currentWalkingSpeed,
    startPoint: c.currentStartPoint,
    startPoints: c.currentStartPoints || (c.currentStartPoint ? [c.currentStartPoint] : []),
    enabledVariables: c.enabledVariables || [],
    layerValues: c.layerValues || {},
    profile: c.currentProfile ? { id: c.currentProfile } : null,
  };
}

function expectedAction(testCase) {
  if (testCase.expectedActionTypes) return array(testCase.expectedActionTypes);
  if (testCase.shouldRunAnalysis) return ["RUN_ACCESSIBILITY_ANALYSIS"];
  if (testCase.shouldAskForMapPoint) return ["ASK_USER_TO_SELECT_POINT"];
  if (testCase.expectedIntent === "compare_with_previous_result") {
    return ["COMPARE_EXISTING_RESULTS", "RUN_ANALYSIS_THEN_COMPARE", "APPLY_PREVIOUS_SETTINGS_TO_CURRENT_POINT", "ASK_FOR_PREVIOUS_RESULT"];
  }
  return [...VALID_ACTIONS].filter((type) => !type.startsWith("RUN_"));
}

function assertion(id, dimension, severity, applicable, passed, expected, actual, score = passed ? 1 : 0) {
  return { id, dimension, severity, applicable, passed: applicable ? Boolean(passed) : null, score: applicable ? round(score) : null, expected, actual };
}

export function auditDatasets(suites) {
  const errors = [];
  const warnings = [];
  const all = suites.flatMap((suite) => suite.cases.map((item) => ({ ...item, suite: suite.name })));
  const ids = new Map();
  const queries = new Map();
  const required = ["id", "category", "query", "expectedIntent", "expectedCity"];
  for (const item of all) {
    for (const field of required) if (item[field] === undefined || item[field] === "") errors.push(`${item.suite}/${item.id || "?"}: missing ${field}`);
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id} (${ids.get(item.id)}, ${item.suite})`);
    ids.set(item.id, item.suite);
    const q = normalized(item.query);
    if (queries.has(q)) warnings.push(`duplicate query: ${item.id} duplicates ${queries.get(q)}`);
    else queries.set(q, item.id);
    if (/Ã.|Â.|â€|ï¼|ã€|æ[\x80-\xff]/u.test(item.query)) warnings.push(`${item.id}: possible mojibake`);
    if (!Array.isArray(item.expectedSources) || !Array.isArray(item.expectedVariables) || !Array.isArray(item.forbiddenVariables)) {
      errors.push(`${item.id}: expectedSources/expectedVariables/forbiddenVariables must be arrays`);
    }
    if (item.shouldRunAnalysis && item.shouldAskForMapPoint) errors.push(`${item.id}: contradictory action labels`);
  }
  const languageCounts = Object.fromEntries(["en", "de", "zh"].map((lang) => [lang, all.filter((x) => detectLanguage(x.query) === lang).length]));
  return { totalCases: all.length, errors, warnings, languageCounts, exactDuplicateQueries: warnings.filter((x) => x.startsWith("duplicate query:")).length };
}

function schemaErrors(data) {
  const errors = [];
  for (const key of ["intent", "reply", "answerMode", "action", "missingDataWarnings", "citations", "retrieval"]) {
    if (!(key in (data || {}))) errors.push(`missing ${key}`);
  }
  if (!VALID_ACTIONS.has(data?.action?.type)) errors.push(`invalid action type ${data?.action?.type}`);
  if (!Array.isArray(data?.missingDataWarnings)) errors.push("missingDataWarnings must be array");
  if (!Array.isArray(data?.citations)) errors.push("citations must be array");
  if (!Array.isArray(data?.retrieval?.results)) errors.push("retrieval.results must be array");
  if (data?.action?.type === "RUN_ACCESSIBILITY_ANALYSIS") {
    if (!Array.isArray(data.action.coordinates) || data.action.coordinates.length !== 2 || !data.action.coordinates.every(Number.isFinite)) {
      errors.push("run action needs finite [lon, lat] coordinates");
    }
  }
  return errors;
}

function wilson(numerator, denominator) {
  if (!denominator) return null;
  const z = 1.96;
  const p = numerator / denominator;
  const d = 1 + z * z / denominator;
  const center = (p + z * z / (2 * denominator)) / d;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * denominator)) / denominator) / d;
  return [round(Math.max(0, center - margin)), round(Math.min(1, center + margin))];
}

function metric(numerator, denominator) {
  return { value: denominator ? round(numerator / denominator) : null, numerator: round(numerator), denominator, ci95: wilson(numerator, denominator) };
}

function languageMatches(queryLanguage, reply) {
  if (queryLanguage === "zh") return /[\u3400-\u9fff]/u.test(reply);
  if (queryLanguage === "de") return /[äöüß]/iu.test(reply) || /\b(der|die|das|und|ist|nicht|Sie|kann|für|mit)\b/iu.test(reply);
  return true;
}

function providerStatus(data, requestedMode) {
  if (!["bigmodel", "dashscope", "real"].includes(requestedMode)) return { required: true, honored: true, actual: "deterministic", reason: null };
  const expectedProvider = requestedMode === "real" ? String(process.env.AGENT_LLM_PROVIDER || "") : requestedMode;
  const signals = [data?.debug?.intentRouter, data?.debug?.llm].filter((item) => ["bigmodel", "dashscope"].includes(item?.provider) || item?.error || item?.fallback);
  if (!signals.length) return { required: false, honored: true, actual: "not_invoked", reason: null };
  const failed = signals.find((item) => item?.fallback || item?.error);
  return { required: true, honored: !failed && signals.every((item) => item?.provider === expectedProvider), actual: failed ? failed.fallback || "fallback" : expectedProvider, reason: failed?.error || null };
}

export function evaluateCase(testCase, data, options = {}) {
  const checks = [];
  const expectedSources = new Set(array(testCase.expectedSources));
  const retrieved = array(data?.retrieval?.results).map(sourceOf).filter(Boolean);
  const citations = array(data?.citations).map(sourceOf).filter(Boolean);
  const selected = new Set(array(data?.action?.enabledVariables));
  const expectedVariables = array(testCase.expectedVariables);
  const forbiddenVariables = array(testCase.forbiddenVariables);
  const schema = schemaErrors(data);
  const expectedActions = expectedAction(testCase);
  const language = detectLanguage(testCase.query);
  const provider = providerStatus(data, options.llmMode || "off");
  const relevantRanks = retrieved.map((source, i) => expectedSources.has(source) ? i + 1 : null).filter(Boolean);
  const top3 = new Set(retrieved.slice(0, 3));
  const top5 = new Set(retrieved.slice(0, 5));
  const recall5 = expectedSources.size ? [...expectedSources].filter((s) => top5.has(s)).length / expectedSources.size : null;
  const requiredVariableRecall = expectedVariables.length ? expectedVariables.filter((v) => selected.has(v)).length / expectedVariables.length : null;
  const forbiddenSelected = forbiddenVariables.filter((v) => selected.has(v));
  const cityWhitelist = new Set(cityLayerConfig[data?.action?.city]?.discomfortFeatures || []);
  const unknownVariables = [...selected].filter((v) => cityWhitelist.size && !cityWhitelist.has(v));

  checks.push(assertion("execution.provider_honored", "execution", "critical", provider.required, provider.honored, options.llmMode || "off", provider));
  checks.push(assertion("schema.valid", "action", "critical", true, schema.length === 0, "valid response contract", schema));
  checks.push(assertion("routing.intent", "routing", "major", true, data?.intent === testCase.expectedIntent, testCase.expectedIntent, data?.intent));
  checks.push(assertion("routing.profile", "routing", "major", testCase.expectedProfile !== undefined, same(data?.action?.profile ?? null, testCase.expectedProfile), testCase.expectedProfile, data?.action?.profile ?? null));
  checks.push(assertion("routing.city", "routing", "major", testCase.expectedCity !== undefined, same(data?.action?.city, testCase.expectedCity), testCase.expectedCity, data?.action?.city));
  checks.push(assertion("routing.location", "routing", "major", testCase.expectedLocationText !== undefined, same(data?.action?.locationText ?? null, testCase.expectedLocationText), testCase.expectedLocationText, data?.action?.locationText ?? null));
  checks.push(assertion("action.contract", "action", "critical", true, expectedActions.includes(data?.action?.type), expectedActions, data?.action?.type));
  checks.push(assertion("action.required_variables", "action", "major", expectedVariables.length > 0, requiredVariableRecall === 1, expectedVariables, [...selected], requiredVariableRecall ?? 1));
  checks.push(assertion("safety.forbidden_variables", "safety", "critical", forbiddenVariables.length > 0, forbiddenSelected.length === 0, `exclude: ${forbiddenVariables.join(", ")}`, forbiddenSelected));
  checks.push(assertion("safety.known_variables", "safety", "critical", selected.size > 0 && cityWhitelist.size > 0, unknownVariables.length === 0, "city-supported variables", unknownVariables));
  checks.push(assertion("safety.unsupported_no_run", "safety", "critical", UNSUPPORTED_INTENTS.has(testCase.expectedIntent), !String(data?.action?.type || "").startsWith("RUN_"), "non-running alternative", data?.action?.type));
  for (const warning of array(testCase.expectedWarnings)) {
    const warningText = array(data?.missingDataWarnings).join(" ").toLowerCase();
    const parts = normalized(warning).split(/\s+/);
    checks.push(assertion(`safety.warning.${normalized(warning)}`, "safety", "major", true, parts.every((p) => warningText.includes(p)), warning, data?.missingDataWarnings));
  }
  checks.push(assertion("retrieval.hit_at_3", "retrieval", "major", expectedSources.size > 0, [...expectedSources].some((s) => top3.has(s)), [...expectedSources], retrieved.slice(0, 3)));
  checks.push(assertion("retrieval.recall_at_5", "retrieval", "major", expectedSources.size > 0, recall5 === 1, [...expectedSources], retrieved.slice(0, 5), recall5 ?? 1));
  checks.push(assertion("response.nonempty", "response", "major", true, String(data?.reply || "").trim().length >= 12, "non-empty useful reply", data?.reply));
  checks.push(assertion("response.language", "response", "minor", language !== "en", languageMatches(language, String(data?.reply || "")), language, detectLanguage(String(data?.reply || ""))));
  checks.push(assertion("response.citation_required", "response", "major", expectedSources.size > 0 && !testCase.shouldRunAnalysis && !testCase.shouldAskForMapPoint, citations.length > 0, "at least one citation", citations));
  checks.push(assertion("response.citation_provenance", "response", "major", citations.length > 0, citations.every((s) => retrieved.includes(s)), "citations must come from retrieval", citations));

  const applicable = checks.filter((c) => c.applicable);
  const dimensionScores = {};
  for (const dimension of ["routing", "action", "retrieval", "response", "safety"]) {
    const items = applicable.filter((c) => c.dimension === dimension);
    dimensionScores[dimension] = items.length ? round(items.reduce((sum, c) => sum + c.score, 0) / items.length) : null;
  }
  const weights = options.weights || { routing: .25, action: .25, retrieval: .2, response: .15, safety: .15 };
  const scored = Object.entries(dimensionScores).filter(([, value]) => value !== null);
  const weightTotal = scored.reduce((sum, [key]) => sum + weights[key], 0);
  const score = round(scored.reduce((sum, [key, value]) => sum + value * weights[key], 0) / weightTotal);
  const criticalFailures = applicable.filter((c) => c.severity === "critical" && !c.passed);
  const qualityFailures = applicable.filter((c) => !c.passed);
  const pass = provider.honored && criticalFailures.length === 0 && score >= (options.casePassThreshold ?? .8);

  return {
    id: testCase.id, category: testCase.category, language, query: testCase.query,
    expected: { intent: testCase.expectedIntent, profile: testCase.expectedProfile, city: testCase.expectedCity, locationText: testCase.expectedLocationText, actionTypes: expectedActions, sources: [...expectedSources], variables: expectedVariables, forbiddenVariables },
    actual: { intent: data?.intent, profile: data?.action?.profile ?? null, city: data?.action?.city, locationText: data?.action?.locationText ?? null, actionType: data?.action?.type, selectedVariables: [...selected], retrievedSources: retrieved, citations, warnings: data?.missingDataWarnings, answerMode: data?.answerMode },
    provider, schemaErrors: schema, checks, dimensionScores, score, pass,
    failureIds: qualityFailures.map((c) => c.id),
    diagnostics: { reciprocalRank: relevantRanks.length ? round(1 / relevantRanks[0]) : expectedSources.size ? 0 : null, recallAt5: round(recall5), requiredVariableRecall: round(requiredVariableRecall), selfReportedGrounding: data?.groundingCheck || null, selfReportedRagSufficiency: data?.ragSufficiency || null },
  };
}

function summarize(results) {
  const ratioFor = (id) => {
    const values = results.flatMap((r) => r.checks.filter((c) => c.id === id && c.applicable));
    return metric(values.filter((c) => c.passed).length, values.length);
  };
  const numericFor = (key) => {
    const values = results.map((r) => r.diagnostics[key]).filter(Number.isFinite);
    return { value: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null, denominator: values.length };
  };
  const providerApplicable = results.filter((r) => r.provider.required);
  const providerOk = providerApplicable.filter((r) => r.provider.honored).length;
  const criticalSafe = results.filter((r) => !r.checks.some((c) => c.applicable && c.dimension === "safety" && c.severity === "critical" && !c.passed)).length;
  const latencies = results.map((r) => r.latencyMs).filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (p) => latencies.length ? latencies[Math.max(0, Math.ceil(latencies.length * p) - 1)] : null;
  return {
    totalCases: results.length,
    casePassRate: metric(results.filter((r) => r.pass).length, results.length),
    providerIntegrityRate: metric(providerOk, providerApplicable.length),
    criticalSafetyPassRate: metric(criticalSafe, results.length),
    schemaPassRate: ratioFor("schema.valid"), intentAccuracy: ratioFor("routing.intent"),
    profileAccuracy: ratioFor("routing.profile"), cityAccuracy: ratioFor("routing.city"), locationAccuracy: ratioFor("routing.location"),
    actionContractAccuracy: ratioFor("action.contract"), requiredVariableCoverage: numericFor("requiredVariableRecall"),
    forbiddenVariableBlockingRate: ratioFor("safety.forbidden_variables"), retrievalHitRateAt3: ratioFor("retrieval.hit_at_3"),
    retrievalRecallAt5: numericFor("recallAt5"), mrr: numericFor("reciprocalRank"),
    citationRequiredPassRate: ratioFor("response.citation_required"), citationProvenanceRate: ratioFor("response.citation_provenance"),
    languageMatchRate: ratioFor("response.language"),
    averageScore: round(results.reduce((sum, r) => sum + r.score, 0) / Math.max(1, results.length)),
    latencyMs: { mean: round(latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length), 1), p50: percentile(.5), p95: percentile(.95), max: latencies.at(-1) ?? null },
  };
}

function slices(results, key) {
  return Object.fromEntries([...new Set(results.map((r) => r[key]))].sort().map((value) => [value, summarize(results.filter((r) => r[key] === value))]));
}

function qualityGate(summary, audit, thresholds) {
  const actual = {
    datasetErrorCount: audit.errors.length,
    providerIntegrityRate: summary.providerIntegrityRate.value,
    criticalSafetyPassRate: summary.criticalSafetyPassRate.value,
    schemaPassRate: summary.schemaPassRate.value,
    intentAccuracy: summary.intentAccuracy.value,
    actionContractAccuracy: summary.actionContractAccuracy.value,
    retrievalHitRateAt3: summary.retrievalHitRateAt3.value,
    casePassRate: summary.casePassRate.value,
    p95LatencyMs: summary.latencyMs.p95,
  };
  const lowerIsBetter = new Set(["datasetErrorCount", "p95LatencyMs"]);
  const checks = Object.entries(thresholds).map(([name, threshold]) => ({ name, threshold, actual: actual[name], pass: actual[name] !== null && (lowerIsBetter.has(name) ? actual[name] <= threshold : actual[name] >= threshold) }));
  return { pass: checks.every((x) => x.pass), checks };
}

function markdown(report) {
  const p = (m) => m?.value === null || m?.value === undefined ? "n/a" : `${(m.value * 100).toFixed(1)}% (${m.numerator ?? "-"}/${m.denominator})`;
  const lines = [
    `# Agent Evaluation V2 — ${report.run.label}`,
    "", `- Valid run: **${report.valid ? "YES" : "NO"}**`, `- Quality gate: **${report.qualityGate.pass ? "PASS" : "FAIL"}**`,
    `- Mode: LLM=\`${report.run.llmMode}\`, embedding=\`${report.run.embeddingMode}\``, `- Cases: ${report.summary.totalCases}`, `- Dataset SHA-256: \`${report.run.datasetHash.slice(0, 16)}…\``,
    "", "## Headline metrics", "",
    "| Metric | Result |", "|---|---:|",
    `| Case pass rate | ${p(report.summary.casePassRate)} |`, `| Provider integrity | ${p(report.summary.providerIntegrityRate)} |`,
    `| Critical safety pass | ${p(report.summary.criticalSafetyPassRate)} |`, `| Schema pass | ${p(report.summary.schemaPassRate)} |`,
    `| Intent accuracy | ${p(report.summary.intentAccuracy)} |`, `| Action contract | ${p(report.summary.actionContractAccuracy)} |`,
    `| Retrieval hit@3 | ${p(report.summary.retrievalHitRateAt3)} |`, `| Retrieval recall@5 | ${report.summary.retrievalRecallAt5.value === null ? "n/a" : `${(report.summary.retrievalRecallAt5.value * 100).toFixed(1)}% (n=${report.summary.retrievalRecallAt5.denominator})`} |`,
    `| Required-variable coverage | ${report.summary.requiredVariableCoverage.value === null ? "n/a" : `${(report.summary.requiredVariableCoverage.value * 100).toFixed(1)}% (n=${report.summary.requiredVariableCoverage.denominator})`} |`,
    `| Citation provenance | ${p(report.summary.citationProvenanceRate)} |`, `| Mean / p95 latency | ${report.summary.latencyMs.mean} / ${report.summary.latencyMs.p95} ms |`,
    "", "## Quality gates", "", "| Gate | Required | Actual | Status |", "|---|---:|---:|---|",
    ...report.qualityGate.checks.map((g) => { const raw = ["datasetErrorCount", "p95LatencyMs"].includes(g.name); return `| ${g.name} | ${raw ? `≤ ${g.threshold}` : `≥ ${(g.threshold * 100).toFixed(0)}%`} | ${g.actual === null ? "n/a" : raw ? g.actual : `${(g.actual * 100).toFixed(1)}%`} | ${g.pass ? "PASS" : "FAIL"} |`; }),
    "", "## Most common failures", "",
    ...(report.failureTaxonomy.length ? report.failureTaxonomy.slice(0, 15).map((x) => `- ${x.id}: ${x.count}`) : ["- None"]),
    "", "## Dataset audit", "", `- Errors: ${report.datasetAudit.errors.length}`, `- Warnings: ${report.datasetAudit.warnings.length}`, `- Languages: ${JSON.stringify(report.datasetAudit.languageCounts)}`,
    "", "## Interpretation rules", "", "- Inapplicable metrics are `n/a`, never silently treated as 100%.", "- Retrieval precision is intentionally omitted because the datasets label required sources, not every relevant source.", "- The model's own grounding/RAG flags are diagnostics only and do not contribute to the score.", "- A real-model run is invalid if any case falls back to the deterministic/mock pipeline.",
  ];
  return `${lines.join("\n")}\n`;
}

async function gitRevision() {
  try { return execFileSync("git", ["-c", `safe.directory=${process.cwd().replace(/\\/g, "/")}`, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return null; }
}

async function main() {
  const args = argsOf(process.argv);
  await loadEnv();
  const configPath = path.resolve(args.config || "eval/evaluation_config_v2.json");
  const configRaw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configRaw);
  const selectedNames = args.suite ? new Set(String(args.suite).split(",")) : null;
  const suiteDefs = config.suites.filter((s) => selectedNames ? selectedNames.has(s.name) : s.enabledByDefault !== false);
  if (!suiteDefs.length) throw new Error("No evaluation suites selected");
  const suites = [];
  for (const def of suiteDefs) {
    const raw = await fs.readFile(path.resolve(def.dataset), "utf8");
    const loaded = JSON.parse(raw);
    const wanted = def.caseIds ? new Set(def.caseIds) : null;
    suites.push({ ...def, raw, cases: wanted ? loaded.filter((item) => wanted.has(item.id)) : loaded });
  }
  const audit = auditDatasets(suites);
  const llmMode = String(args.llm || "off");
  const embeddingMode = String(args.embedding || "off");
  if (args["model-timeout-ms"]) {
    process.env.BIGMODEL_TIMEOUT_MS = String(args["model-timeout-ms"]);
    process.env.DASHSCOPE_TIMEOUT_MS = String(args["model-timeout-ms"]);
  }
  process.env.AGENT_LLM_PROVIDER = ["bigmodel", "dashscope"].includes(llmMode) ? llmMode : llmMode === "real" ? String(process.env.AGENT_LLM_PROVIDER || "") : "";
  process.env.AGENT_EMBEDDING_PROVIDER = embeddingMode;
  const results = [];
  const delayMs = Number(args["delay-ms"] || 0);
  const output = path.resolve(args.report || `eval/agent_eval_v2_${llmMode}.json`);
  const checkpoint = path.resolve(args.checkpoint || output.replace(/\.json$/i, ".checkpoint.jsonl"));
  const completed = new Map();
  if (args.resume) {
    try {
      for (const line of (await fs.readFile(checkpoint, "utf8")).split(/\r?\n/).filter(Boolean)) {
        const item = JSON.parse(line);
        completed.set(`${item.suite}/${item.id}`, item);
      }
    } catch {}
  } else {
    await fs.rm(checkpoint, { force: true });
  }
  const total = suites.reduce((sum, suite) => sum + suite.cases.length, 0);
  let current = 0;
  for (const suite of suites) {
    for (const testCase of suite.cases) {
      current += 1;
      const cacheKey = `${suite.name}/${testCase.id}`;
      if (completed.has(cacheKey)) {
        results.push(completed.get(cacheKey));
        console.log(`[${current}/${total}] resumed ${cacheKey}`);
        continue;
      }
      const c = testCase.context || {};
      const started = performance.now();
      const data = await buildAgentChatResponse({ message: testCase.query, city: c.currentCity || "hamburg", currentMapState: currentMapState(testCase), resultMetadata: c.latestResultMetadata || null, agentContext: c.agentContext || null, conversationHistory: c.conversationHistory || [], analysisHistory: c.analysisHistory || [] });
      const result = evaluateCase(testCase, data, { llmMode, weights: config.weights, casePassThreshold: config.casePassThreshold });
      result.suite = suite.name;
      result.latencyMs = round(performance.now() - started, 1);
      results.push(result);
      await fs.appendFile(checkpoint, `${JSON.stringify(result)}\n`, "utf8");
      console.log(`[${current}/${total}] ${cacheKey} ${result.latencyMs}ms provider=${result.provider.actual}`);
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const summary = summarize(results);
  const taxonomy = Object.entries(results.flatMap((r) => r.failureIds).reduce((acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }), {})).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const report = {
    schemaVersion: 2, createdAt: new Date().toISOString(),
    run: { label: args.label || `evaluation_v2_${llmMode}`, llmMode, embeddingMode, requestedProvider: process.env.AGENT_LLM_PROVIDER || "deterministic", suites: suiteDefs, config: path.relative(process.cwd(), configPath).replace(/\\/g, "/"), configHash: sha256(configRaw), datasetHash: sha256(suites.map((s) => s.raw).join("\n")), gitRevision: await gitRevision(), node: process.version },
    datasetAudit: audit, summary, bySuite: Object.fromEntries(suites.map((s) => [s.name, summarize(results.filter((r) => r.suite === s.name))])), byLanguage: slices(results, "language"), byCategory: slices(results, "category"),
    qualityGate: qualityGate(summary, audit, config.qualityGates), failureTaxonomy: taxonomy,
    valid: audit.errors.length === 0 && summary.providerIntegrityRate.value === 1,
    failedCases: results.filter((r) => !r.pass), results,
  };
  const mdOutput = output.replace(/\.json$/i, ".md");
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(mdOutput, markdown(report), "utf8");
  await fs.rm(checkpoint, { force: true });
  console.log(markdown(report));
  console.log(`JSON: ${path.relative(process.cwd(), output)}\nMarkdown: ${path.relative(process.cwd(), mdOutput)}`);
  if (!report.valid || !report.qualityGate.pass) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
