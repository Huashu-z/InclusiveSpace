import fs from "fs/promises";
import path from "path";
import {
  buildKnowledgeChunks,
  embedTexts,
  embedTextsWithMetadata,
  getAgentDatabaseUrl,
  LOCAL_CHUNKS_FILE,
  LOCAL_EMBEDDINGS_FILE,
  summarizeChunks,
  upsertKnowledgeChunks,
} from "../utils/agentKnowledge.js";
import { buildRagIndex } from "../utils/ragIndex.js";

async function loadDotEnvLocal() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
}

async function writeLocalChunkReport({ chunks, failed, outputPath }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify({ createdAt: new Date().toISOString(), chunks, failed }, null, 2),
    "utf8",
  );
}

async function writeLocalEmbeddingReport({ chunks, embeddingResult, outputPath }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      provider: process.env.AGENT_EMBEDDING_PROVIDER || (process.env.DASHSCOPE_API_KEY ? "dashscope" : process.env.BIGMODEL_API_KEY ? "bigmodel" : "openai"),
      model: embeddingResult.model,
      dimensions: embeddingResult.dimensions,
      usage: embeddingResult.usage,
      items: chunks.map((chunk, index) => ({
        id: chunk.id,
        source: chunk.source,
        collection: chunk.collection,
        embedding: embeddingResult.embeddings[index],
      })),
    }, null, 2),
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
  await loadDotEnvLocal();
  const { chunks, failed } = await buildKnowledgeChunks();
  const summary = summarizeChunks(chunks);
  let storageResult = null;
  const databaseUrl = getAgentDatabaseUrl();
  const texts = chunks.map((chunk) => `${chunk.title}\n${chunk.content}\nTags: ${(chunk.tags || []).join(", ")}`);
  let localEmbeddingResult = null;

  const localEmbeddingProvider = process.env.AGENT_EMBEDDING_PROVIDER || (process.env.DASHSCOPE_API_KEY ? "dashscope" : process.env.BIGMODEL_API_KEY ? "bigmodel" : "");
  if (["bigmodel", "dashscope"].includes(localEmbeddingProvider)) {
    localEmbeddingResult = await embedTextsWithMetadata(texts, { provider: localEmbeddingProvider });
    storageResult = {
      inserted: 0,
      skipped: chunks.length,
      reason: `local_${localEmbeddingProvider}_embeddings`,
      model: localEmbeddingResult?.model,
      dimensions: localEmbeddingResult?.dimensions,
    };
  } else if (process.env.OPENAI_API_KEY && databaseUrl) {
    const embeddings = await embedTexts(texts, { provider: "openai" });
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
    await writeLocalChunkReport({ chunks, failed, outputPath: LOCAL_CHUNKS_FILE });
    if (localEmbeddingResult?.embeddings?.length === chunks.length) {
      await writeLocalEmbeddingReport({ chunks, embeddingResult: localEmbeddingResult, outputPath: LOCAL_EMBEDDINGS_FILE });
      console.log(`Local dense embeddings written to: ${LOCAL_EMBEDDINGS_FILE}`);
    }
    await buildRagIndex();
    console.log(`Local fallback chunks written to: ${LOCAL_CHUNKS_FILE}`);
    console.log("Local fallback RAG index refreshed: data/rag_index.json");
  }

  printSummary(summary, failed, storageResult);
}

main().catch((error) => {
  console.error("Build agent RAG index failed:", error);
  process.exit(1);
});
