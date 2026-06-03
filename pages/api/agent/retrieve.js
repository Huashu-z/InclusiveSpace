import { retrieveKnowledge, retrievalCollectionsByIntent } from "../../../utils/agentKnowledge.js";

const allowedIntents = new Set(Object.keys(retrievalCollectionsByIntent));

function normalizeRequestBody(body = {}) {
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const intent = allowedIntents.has(body.intent) ? body.intent : "general_question";
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
  const profile = typeof body.profile === "string" && body.profile.trim() ? body.profile.trim() : null;
  const variable_key = typeof body.variable_key === "string" && body.variable_key.trim() ? body.variable_key.trim() : null;
  const topK = Number.isFinite(Number(body.topK)) ? Math.max(1, Math.min(10, Number(body.topK))) : 5;
  return { query, intent, city, profile, variable_key, topK };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = normalizeRequestBody(req.body);
  if (!input.query) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const retrieval = await retrieveKnowledge(input);
    return res.status(200).json({
      query: input.query,
      intent: input.intent,
      city: input.city,
      profile: input.profile,
      variable_key: input.variable_key,
      retrievalSource: retrieval.source,
      collectionsSearched: retrieval.collections,
      results: retrieval.results.map((item) => ({
        title: item.title,
        collection: item.collection,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata,
      })),
    });
  } catch (error) {
    console.error("Agent retrieval error:", error);
    return res.status(500).json({ error: error.message || "Agent retrieval failed" });
  }
}
