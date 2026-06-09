import { buildAgentChatResponse } from "../../../utils/agentChat.js";

function normalizeBody(body = {}) {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "hamburg";
  const currentMapState = body.currentMapState && typeof body.currentMapState === "object" ? body.currentMapState : {};
  const resultMetadata = body.resultMetadata && typeof body.resultMetadata === "object" ? body.resultMetadata : null;
  const agentContext = body.agentContext && typeof body.agentContext === "object" ? body.agentContext : null;
  const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const analysisHistory = Array.isArray(body.analysisHistory) ? body.analysisHistory : [];
  return { message, city, currentMapState, resultMetadata, agentContext, conversationHistory, analysisHistory };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = normalizeBody(req.body);
  if (!input.message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const result = await buildAgentChatResponse(input);
    console.log("[agent/chat]", {
      detectedIntent: result.debug?.detectedIntent,
      detectedCity: result.debug?.detectedCity,
      detectedProfile: result.debug?.detectedProfile,
      detectedLocationText: result.debug?.detectedLocationText,
      referenceResolution: result.debug?.referenceResolution,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Agent chat error:", error);
    return res.status(500).json({
      reply: "The agent could not process this message safely.",
      action: { type: "ANSWER_ONLY" },
      missingDataWarnings: [error.message || "Agent chat failed"],
      citations: [],
    });
  }
}
