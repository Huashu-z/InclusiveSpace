import { buildAgentChatResponse } from "../../../utils/agentChat.js";

function detectResponseLanguage(message = "") {
  const raw = String(message || "");
  const text = raw.toLowerCase();
  if (/[\u4e00-\u9fff]/u.test(raw)) return "zh";
  if (/[äöüß]/i.test(raw) || /\b(wo|welche|welcher|geeignet|spazieren|ältere|rollstuhl|karte)\b/i.test(raw)) return "de";
  if (/[α-ωάέήίόύώ]/i.test(raw)) return "el";
  if (/\b(donde|dónde|adecuado|caminar|mayores|silla de ruedas|ruta)\b/i.test(text)) return "es";
  return "en";
}

function getStatusMessages(language = "en") {
  if (language === "zh") {
    return [
      "正在理解你的问题和当前地图状态...",
      "正在检查 CAT 可以回答什么，以及是否需要地图操作...",
      "正在准备回答和下一步建议...",
      "还在结合城市数据和你关心的环境因素进行整理...",
    ];
  }
  if (language === "de") {
    return [
      "Ich verstehe gerade deine Frage und den aktuellen Kartenkontext...",
      "Ich pruefe, was CAT beantworten kann und ob eine Kartenaktion noetig ist...",
      "Ich bereite die Antwort und moegliche naechste Schritte vor...",
      "Ich arbeite noch die Stadtdaten und Komfortfaktoren durch...",
    ];
  }
  return [
    "Understanding your question and the current map context...",
    "Checking what CAT can answer and whether a map action is needed...",
    "Preparing a reply and possible next steps...",
    "Still working through the city data and comfort factors...",
  ];
}

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
    const wantsStream = String(req.headers.accept || "").includes("text/event-stream") || req.body?.stream === true;
    if (wantsStream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const statusMessages = getStatusMessages(detectResponseLanguage(input.message));
      sendEvent("status", { message: statusMessages[0] });
      const progressTimers = [
        setTimeout(() => {
          sendEvent("status", { message: statusMessages[1] });
        }, 600),
        setTimeout(() => {
          sendEvent("status", { message: statusMessages[2] });
        }, 1400),
        setTimeout(() => {
          sendEvent("status", { message: statusMessages[3] });
        }, 3200),
      ];

      let result;
      try {
        result = await buildAgentChatResponse(input);
      } finally {
        progressTimers.forEach(clearTimeout);
      }
      console.log("[agent/chat]", {
        detectedIntent: result.debug?.detectedIntent,
        detectedCity: result.debug?.detectedCity,
        detectedProfile: result.debug?.detectedProfile,
        detectedLocationText: result.debug?.detectedLocationText,
        referenceResolution: result.debug?.referenceResolution,
      });

      const reply = String(result.reply || "");
      const chunks = reply.match(/[\s\S]{1,80}/g) || (reply ? [reply] : []);
      for (const chunk of chunks) {
        sendEvent("reply_delta", { text: chunk });
      }
      sendEvent("final", result);
      return res.end();
    }

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
    if (res.headersSent) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message || "Agent chat failed" })}\n\n`);
      return res.end();
    }
    return res.status(500).json({
      reply: "The agent could not process this message safely.",
      intent: "general_question",
      answerMode: "SAFE_FALLBACK",
      action: { type: "ANSWER_ONLY" },
      alternativeAction: null,
      followUpSuggestions: [],
      followUpQuestions: [],
      nextSteps: [],
      capabilityCheck: {
        systemCanFullyAnswer: false,
        requiredCapability: "safe_agent_response",
        unsupportedParts: [error.message || "Agent chat failed"],
        closestSupportedAlternative: null,
      },
      missingDataWarnings: [error.message || "Agent chat failed"],
      citations: [],
    });
  }
}
