import fs from "fs/promises";
import path from "path";

const inputPath = path.join(process.cwd(), "eval", "agent_expanded_eval_cases.json");
const outputPath = path.join(process.cwd(), "eval", "agent_expanded_eval_sample25_cases.json");

const cases = JSON.parse(await fs.readFile(inputPath, "utf8"));
const byCategory = new Map();
for (const item of cases) {
  if (!byCategory.has(item.category)) byCategory.set(item.category, []);
  byCategory.get(item.category).push(item);
}

const sample = [];
for (const items of byCategory.values()) {
  sample.push(...items.slice(0, 5));
}

await fs.writeFile(outputPath, `${JSON.stringify(sample, null, 2)}\n`, "utf8");
console.log(`Wrote ${sample.length} cases to ${path.relative(process.cwd(), outputPath)}`);
