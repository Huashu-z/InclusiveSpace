import fs from "fs/promises";
import path from "path";

const manifestPath = process.argv[2] || "eval/batches/expanded_bigmodel/manifest.json";
const outputPath = process.argv[3] || "eval/agent_eval_report_expanded_bigmodel_batched.json";
const label = process.argv[4] || "expanded_bigmodel_batched";

function pct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function weightedSummary(reports) {
  const totalCases = reports.reduce((sum, report) => sum + (report.summary?.totalCases || 0), 0);
  const keys = new Set(reports.flatMap((report) => Object.keys(report.summary || {})));
  const summary = { totalCases };

  for (const key of keys) {
    if (key === "totalCases") continue;
    let weighted = 0;
    let weight = 0;
    for (const report of reports) {
      const cases = report.summary?.totalCases || 0;
      const value = report.summary?.[key];
      if (!Number.isFinite(value)) continue;
      weighted += value * cases;
      weight += cases;
    }
    summary[key] = weight ? weighted / weight : null;
  }
  return summary;
}

function markdown(report) {
  const s = report.summary;
  return [
    "| Run | Cases | LLM | Intent | Profile | Recall@5 | Precision@5 | MRR | Variable Recall | Unsupported Blocking | Grounding | Task E2E | Strict E2E | Failed |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    [
      report.label,
      s.totalCases,
      report.llmProvider || report.llmMode,
      pct(s.intentAccuracy),
      pct(s.profileAccuracy),
      pct(s.retrievalRecallAt5),
      pct(s.retrievalPrecisionAt5),
      Math.round((s.mrr || 0) * 100) / 100,
      pct(s.variableRecall),
      pct(s.unsupportedVariableBlockingRate),
      pct(s.finalGroundingPassRate),
      pct(s.taskEndToEndTaskSuccessRate),
      pct(s.endToEndTaskSuccessRate),
      report.failedCases.length,
    ].join(" | "),
  ].join("\n| ") + " |";
}

const manifest = JSON.parse(await fs.readFile(path.resolve(process.cwd(), manifestPath), "utf8"));
const reports = [];
const missing = [];

for (const batch of manifest.batches || []) {
  const reportPath = path.resolve(process.cwd(), batch.report);
  try {
    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    reports.push(report);
  } catch {
    missing.push(batch.report);
  }
}

const failedCases = reports.flatMap((report) => report.failedCases || []);
const results = reports.flatMap((report) => report.results || []);
const combined = {
  createdAt: new Date().toISOString(),
  label,
  llmMode: "bigmodel",
  llmProvider: "bigmodel",
  dataset: manifest.input,
  batchManifest: manifestPath.replace(/\\/g, "/"),
  completedBatches: reports.length,
  expectedBatches: manifest.batches?.length || 0,
  missingReports: missing,
  summary: weightedSummary(reports),
  failedCases,
  results,
};

combined.markdown = markdown(combined);
await fs.writeFile(path.resolve(process.cwd(), outputPath), `${JSON.stringify(combined, null, 2)}\n`, "utf8");

console.log(combined.markdown);
if (missing.length) {
  console.log(`\nMissing reports (${missing.length}):`);
  for (const item of missing) console.log(`- ${item}`);
}
console.log(`\nCombined report written to ${outputPath.replace(/\\/g, "/")}`);
