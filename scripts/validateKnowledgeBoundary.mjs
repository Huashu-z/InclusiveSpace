import fs from "fs/promises";
import path from "path";
import { cityLayerConfig } from "../components/cityVariableConfig.js";
import { validateProfilePresets } from "../components/agent/profilePresets.js";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
const geometryPatterns = [
  /"type"\s*:\s*"FeatureCollection"/i,
  /"type"\s*:\s*"Feature"/i,
  /"coordinates"\s*:/i,
  /\[\s*-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\s*\]/,
];

async function listMarkdownFiles(rootDir = KNOWLEDGE_ROOT) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(entryPath);
    }
  }
  return results;
}

function getSupportedVariables() {
  return new Set(Object.values(cityLayerConfig).flatMap((city) => city.discomfortFeatures || []));
}

function extractProfileRecommendedVariables(relativePath, content) {
  if (!relativePath.startsWith("profiles/")) return [];
  const matches = [...content.matchAll(/^\s*-\s*([A-Za-z][A-Za-z0-9_]*):\s*[0-9.]+/gm)];
  return matches.map((match) => match[1]);
}

async function main() {
  const files = await listMarkdownFiles();
  const supportedVariables = getSupportedVariables();
  const problems = [];

  for (const filePath of files) {
    const relativePath = path.relative(KNOWLEDGE_ROOT, filePath).replace(/\\/g, "/");
    const content = await fs.readFile(filePath, "utf8");

    for (const pattern of geometryPatterns) {
      if (pattern.test(content)) {
        problems.push(`${relativePath}: contains forbidden geometry-like content (${pattern})`);
      }
    }

    for (const variable of extractProfileRecommendedVariables(relativePath, content)) {
      if (!supportedVariables.has(variable)) {
        problems.push(`${relativePath}: recommends unsupported CAT variable "${variable}"`);
      }
    }
  }

  if (problems.length) {
    console.error("Knowledge boundary validation failed:");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  const presetProblems = validateProfilePresets();
  if (presetProblems.length) {
    console.error("Profile preset validation failed:");
    for (const problem of presetProblems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log(`Knowledge boundary validation passed. Checked ${files.length} markdown files.`);
  console.log("Profile preset validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
