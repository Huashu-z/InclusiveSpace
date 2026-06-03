const BIGMODEL_CHAT_COMPLETIONS_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export function isBigModelEnabled() {
  return process.env.AGENT_LLM_PROVIDER === "bigmodel" && Boolean(process.env.BIGMODEL_API_KEY);
}

export function getBigModelConfig() {
  return {
    apiKey: process.env.BIGMODEL_API_KEY || "",
    model: process.env.BIGMODEL_MODEL || "glm-4.5-flash",
    timeoutMs: Number(process.env.BIGMODEL_TIMEOUT_MS || 30000),
    maxTokens: Number(process.env.BIGMODEL_MAX_TOKENS || 1600),
  };
}

export function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const withoutFence = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function callBigModelJson({ messages, temperature = 0.2, maxTokens } = {}) {
  const config = getBigModelConfig();
  if (!config.apiKey) {
    throw new Error("Missing BIGMODEL_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(BIGMODEL_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        do_sample: false,
        temperature,
        max_tokens: maxTokens || config.maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`BigModel API failed: ${response.status} ${bodyText.slice(0, 500)}`);
    }

    const payload = JSON.parse(bodyText);
    const content = payload.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(content);
    if (!parsed) {
      throw new Error("BigModel response did not contain valid JSON");
    }

    return {
      parsed,
      rawContent: content,
      model: payload.model || config.model,
      usage: payload.usage || null,
      requestId: payload.request_id || payload.id || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
