import { spawn } from "child_process";

const runs = [
  {
    label: "regression_mock",
    dataset: "eval/agent_eval_cases.json",
    report: "eval/agent_eval_report_regression_mock.json",
    llm: "off",
  },
  {
    label: "blind_mock",
    dataset: "eval/agent_blind_eval_cases.json",
    report: "eval/agent_eval_report_blind_mock.json",
    llm: "off",
  },
  {
    label: "blind_bigmodel",
    dataset: "eval/agent_blind_eval_cases.json",
    report: "eval/agent_eval_report_blind_bigmodel.json",
    llm: "bigmodel",
  },
];

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => resolve(code || 0));
  });
}

async function main() {
  const results = [];
  for (const run of runs) {
    console.log(`\n=== ${run.label} ===`);
    const code = await runCommand("node", [
      "scripts/eval-agent.js",
      `--dataset=${run.dataset}`,
      `--report=${run.report}`,
      `--label=${run.label}`,
      `--llm=${run.llm}`,
    ]);
    results.push({ ...run, exitCode: code });
  }

  console.log("\n=== summary ===");
  await runCommand("node", ["scripts/summarize-agent-eval.mjs"]);

  const failed = results.filter((result) => result.exitCode !== 0);
  if (failed.length) {
    console.log("\nSome evaluation runs had failed cases. Reports were still written for analysis:");
    for (const item of failed) console.log(`- ${item.label}: ${item.report}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
