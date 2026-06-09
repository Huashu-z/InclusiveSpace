const BIGMODEL_CHAT_COMPLETIONS_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const BIGMODEL_EMBEDDINGS_URL = "https://open.bigmodel.cn/api/paas/v4/embeddings";

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

export async function callBigModelJson({ messages, temperature = 0.2, maxTokens, timeoutMs } = {}) {
  const config = getBigModelConfig();
  if (!config.apiKey) {
    throw new Error("Missing BIGMODEL_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(timeoutMs || config.timeoutMs));

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

export async function callBigModelEmbeddings(texts, { batchSize = 64 } = {}) {
  const config = getBigModelConfig();
  if (!config.apiKey) {
    throw new Error("Missing BIGMODEL_API_KEY");
  }

  const model = process.env.BIGMODEL_EMBEDDING_MODEL || "embedding-3";
  const dimensions = Number(process.env.BIGMODEL_EMBEDDING_DIMENSIONS || 1024);
  const inputs = Array.isArray(texts) ? texts : [texts];
  const allEmbeddings = [];
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let offset = 0; offset < inputs.length; offset += batchSize) {
    const batch = inputs.slice(offset, offset + batchSize);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(BIGMODEL_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: batch,
          dimensions,
        }),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(`BigModel embeddings failed: ${response.status} ${bodyText.slice(0, 500)}`);
      }

      const payload = JSON.parse(bodyText);
      const ordered = (payload.data || [])
        .slice()
        .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
      allEmbeddings.push(...ordered.map((item) => item.embedding));

      if (payload.usage) {
        usage = {
          prompt_tokens: usage.prompt_tokens + Number(payload.usage.prompt_tokens || 0),
          completion_tokens: usage.completion_tokens + Number(payload.usage.completion_tokens || 0),
          total_tokens: usage.total_tokens + Number(payload.usage.total_tokens || 0),
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    embeddings: allEmbeddings,
    model,
    dimensions,
    usage,
  };
}
