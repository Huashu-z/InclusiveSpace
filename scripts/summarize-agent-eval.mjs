import fs from "fs/promises";
import path from "path";

const DEFAULT_REPORTS = [
  "eval/agent_eval_report_regression_mock.json",
  "eval/agent_eval_report_blind_mock.json",
  "eval/agent_eval_report_blind_bigmodel.json",
];

function pct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function pick(summary) {
  return {
    totalCases: summary.totalCases,
    intentAccuracy: summary.intentAccuracy,
    profileAccuracy: summary.profileAccuracy,
    retrievalRecallAt5: summary.retrievalRecallAt5,
    retrievalPrecisionAt5: summary.retrievalPrecisionAt5,
    mrr: summary.mrr,
    variableRecall: summary.variableRecall,
    unsupportedVariableBlockingRate: summary.unsupportedVariableBlockingRate,
    schemaPassRate: summary.schemaPassRate,
    finalGroundingPassRate: summary.finalGroundingPassRate,
    taskEndToEndTaskSuccessRate: summary.taskEndToEndTaskSuccessRate,
    endToEndTaskSuccessRate: summary.endToEndTaskSuccessRate,
  };
}

function failedCategories(report) {
  const counts = {};
  for (const failure of report.failedCases || []) {
    counts[failure.category || "unknown"] = (counts[failure.category || "unknown"] || 0) + 1;
  }
  return counts;
}

async function main() {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_REPORTS;
  const reports = [];
  for (const file of files) {
    const raw = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
    const report = JSON.parse(raw);
    reports.push({
      label: report.label || path.basename(file, ".json"),
      dataset: report.dataset,
      llmMode: report.llmMode,
      llmProvider: report.llmProvider,
      bigModelConfigured: report.bigModelConfigured,
      summary: pick(report.summary),
      failedCount: (report.failedCases || []).length,
      failedCategories: failedCategories(report),
    });
  }

  const output = {
    createdAt: new Date().toISOString(),
    reports,
    markdown: [
      "| Run | Cases | LLM | Intent | Profile | Recall@5 | Precision@5 | MRR | Variable Recall | Unsupported Blocking | Grounding | Task E2E | Strict E2E | Failed |",
      "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
      ...reports.map((report) => {
        const s = report.summary;
        return [
          report.label,
          s.totalCases,
          report.llmProvider || report.llmMode,
          pct(s.intentAccuracy),
          pct(s.profileAccuracy),
          pct(s.retrievalRecallAt5),
          pct(s.retrievalPrecisionAt5),
          Math.round(s.mrr * 100) / 100,
          pct(s.variableRecall),
          pct(s.unsupportedVariableBlockingRate),
          pct(s.finalGroundingPassRate),
          pct(s.taskEndToEndTaskSuccessRate),
          pct(s.endToEndTaskSuccessRate),
          report.failedCount,
        ].join(" | ");
      }).map((line) => `| ${line} |`),
    ].join("\n"),
  };

  const outPath = path.join(process.cwd(), "eval", "agent_eval_summary.json");
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(output.markdown);
  console.log(`\nSummary written to ${path.relative(process.cwd(), outPath).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
