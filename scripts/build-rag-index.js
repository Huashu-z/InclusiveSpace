import fs from "fs/promises";
import path from "path";
import {
  buildKnowledgeChunks,
  embedTexts,
  getAgentDatabaseUrl,
  summarizeChunks,
  upsertKnowledgeChunks,
} from "../utils/agentKnowledge.js";
import { buildRagIndex } from "../utils/ragIndex.js";

async function writeLocalChunkReport({ chunks, failed, outputPath }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify({ createdAt: new Date().toISOString(), chunks, failed }, null, 2),
    "utf8",
  );
}

function printSummary(summary, failed, storageResult) {
  console.log("=== Agent RAG Indexing Summary ===");
  console.log(`Total chunks indexed: ${summary.total}`);
  console.log("Chunks per collection:", summary.byCollection);
  console.log("Chunks per city:", summary.byCity);
  console.log("Chunks per profile:", summary.byProfile);
  console.log("Chunks per variable:", summary.byVariable);
  console.log(`Failed files: ${failed.length}`);
  failed.forEach((item) => console.log(`- ${item.filePath}: ${item.error}`));

  if (storageResult) {
    console.log("Storage result:", storageResult);
  }
}

async function main() {
  const { chunks, failed } = await buildKnowledgeChunks();
  const summary = summarizeChunks(chunks);
  let storageResult = null;
  const databaseUrl = getAgentDatabaseUrl();

  if (process.env.OPENAI_API_KEY && databaseUrl) {
    const embeddings = await embedTexts(chunks.map((chunk) => `${chunk.title}\n${chunk.content}`));
    storageResult = await upsertKnowledgeChunks({ chunks, embeddings, databaseUrl });
  } else if (!databaseUrl) {
    storageResult = {
      inserted: 0,
      skipped: chunks.length,
      reason: "missing_database_url",
    };
  } else {
    storageResult = {
      inserted: 0,
      skipped: chunks.length,
      reason: "missing_openai_api_key",
    };
  }

  if (storageResult?.inserted === 0) {
    const localReportPath = path.join(process.cwd(), "data", "agent_knowledge_chunks.json");
    await writeLocalChunkReport({ chunks, failed, outputPath: localReportPath });
    await buildRagIndex();
    console.log(`Local fallback chunks written to: ${localReportPath}`);
    console.log("Local fallback RAG index refreshed: data/rag_index.json");
  }

  printSummary(summary, failed, storageResult);
}

main().catch((error) => {
  console.error("Build agent RAG index failed:", error);
  process.exit(1);
});
