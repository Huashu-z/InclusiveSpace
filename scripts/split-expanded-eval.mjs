import fs from "fs/promises";
import path from "path";

const input = process.argv[2] || "eval/agent_expanded_eval_cases.json";
const outputDir = process.argv[3] || "eval/batches/expanded_bigmodel";
const batchSize = Number(process.argv[4] || 10);

if (!Number.isInteger(batchSize) || batchSize <= 0) {
  throw new Error("Batch size must be a positive integer.");
}

const cases = JSON.parse(await fs.readFile(path.resolve(process.cwd(), input), "utf8"));
await fs.mkdir(path.resolve(process.cwd(), outputDir), { recursive: true });

const manifest = [];
for (let start = 0; start < cases.length; start += batchSize) {
  const batchIndex = Math.floor(start / batchSize) + 1;
  const batch = cases.slice(start, start + batchSize);
  const file = path.join(outputDir, `batch_${String(batchIndex).padStart(3, "0")}.json`);
  await fs.writeFile(path.resolve(process.cwd(), file), `${JSON.stringify(batch, null, 2)}\n`, "utf8");
  manifest.push({
    index: batchIndex,
    start,
    count: batch.length,
    file: file.replace(/\\/g, "/"),
    report: path.join(outputDir, `report_${String(batchIndex).padStart(3, "0")}.json`).replace(/\\/g, "/"),
  });
}

const manifestPath = path.join(outputDir, "manifest.json");
await fs.writeFile(path.resolve(process.cwd(), manifestPath), `${JSON.stringify({
  input: input.replace(/\\/g, "/"),
  totalCases: cases.length,
  batchSize,
  batches: manifest,
}, null, 2)}\n`, "utf8");

console.log(`Split ${cases.length} cases into ${manifest.length} batches of ${batchSize}.`);
console.log(`Manifest: ${manifestPath.replace(/\\/g, "/")}`);
