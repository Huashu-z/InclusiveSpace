import fs from "fs/promises";
import path from "path";
import { performance } from "perf_hooks";
import { retrieveKnowledge } from "../utils/agentKnowledge.js";

async function loadDotEnvLocal() {
  const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const cases = [
  { query: "I use a wheelchair and need step-free walking around Hamburg station", intent: "area_suitability_question", city: "hamburg", profile: "wheelchair_user", expected: "profiles/wheelchair_user.md" },
  { query: "What does a high kerb mean for accessibility?", intent: "explain_variable", city: "hamburg", variable_key: "kerbsHigh", expected: "variables/comfort_variables.md" },
  { query: "Can an older pedestrian use noise data in Penteli?", intent: "ask_data_availability", city: "penteli", expected: "cities/penteli.md" },
];

await loadDotEnvLocal();
const failures = [];
for (const item of cases) {
  const started = performance.now();
  const retrieval = await retrieveKnowledge({ ...item, topK: 5 });
  const results = retrieval.results || [];
  const sources = results.map((result) => result.metadata?.source).filter(Boolean);
  const dense = results.filter((result) => Number.isFinite(result.metadata?.semanticSimilarity));
  console.log(JSON.stringify({ query: item.query, latencyMs: Math.round(performance.now() - started), retrievalMode: results[0]?.metadata?.retrievalMode || null, denseResults: dense.length, sources, scores: results.map((result) => Number(result.similarity || 0).toFixed(4)) }, null, 2));
  if (!dense.length) failures.push(`${item.query}: dense similarity was not used`);
  if (!sources.includes(item.expected)) failures.push(`${item.query}: missing ${item.expected}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("DashScope dense retrieval smoke test passed.");
