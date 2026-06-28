const BIGMODEL_CHAT_COMPLETIONS_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const BIGMODEL_EMBEDDINGS_URL = "https://open.bigmodel.cn/api/paas/v4/embeddings";

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getAgentModelConfig(providerOverride) {
  const provider = String(providerOverride || process.env.AGENT_LLM_PROVIDER || "").toLowerCase();
  if (provider === "dashscope") {
    const baseUrl = normalizeBaseUrl(process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1");
    return {
      provider,
      apiKey: process.env.DASHSCOPE_API_KEY || "",
      model: process.env.DASHSCOPE_MODEL || "qwen3.7-plus",
      chatUrl: `${baseUrl}/chat/completions`,
      embeddingsUrl: `${baseUrl}/embeddings`,
      embeddingModel: process.env.DASHSCOPE_EMBEDDING_MODEL || "text-embedding-v4",
      embeddingDimensions: Number(process.env.DASHSCOPE_EMBEDDING_DIMENSIONS || 1024),
      timeoutMs: Number(process.env.DASHSCOPE_TIMEOUT_MS || 30000),
      maxTokens: Number(process.env.DASHSCOPE_MAX_TOKENS || 1600),
      enableThinking: process.env.DASHSCOPE_ENABLE_THINKING === "true",
      missingKeyMessage: "Missing DASHSCOPE_API_KEY",
    };
  }

  return {
    provider: "bigmodel",
    apiKey: process.env.BIGMODEL_API_KEY || "",
    model: process.env.BIGMODEL_MODEL || "glm-4.5-flash",
    chatUrl: BIGMODEL_CHAT_COMPLETIONS_URL,
    embeddingsUrl: BIGMODEL_EMBEDDINGS_URL,
    embeddingModel: process.env.BIGMODEL_EMBEDDING_MODEL || "embedding-3",
    embeddingDimensions: Number(process.env.BIGMODEL_EMBEDDING_DIMENSIONS || 1024),
    timeoutMs: Number(process.env.BIGMODEL_TIMEOUT_MS || 30000),
    maxTokens: Number(process.env.BIGMODEL_MAX_TOKENS || 1600),
    enableThinking: false,
    missingKeyMessage: "Missing BIGMODEL_API_KEY",
  };
}

export function isAgentLlmEnabled() {
  const config = getAgentModelConfig();
  return ["bigmodel", "dashscope"].includes(String(process.env.AGENT_LLM_PROVIDER || "").toLowerCase()) && Boolean(config.apiKey);
}

export function isBigModelEnabled() {
  return isAgentLlmEnabled();
}

export function getBigModelConfig() {
  return getAgentModelConfig();
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

export async function callAgentModelJson({ messages, temperature = 0.2, maxTokens, timeoutMs, model, jsonRetries } = {}) {
  const config = getAgentModelConfig();
  if (!config.apiKey) {
    throw new Error(config.missingKeyMessage);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(timeoutMs || config.timeoutMs));

  try {
    const body = {
      model: model || config.model,
      messages,
      stream: false,
      temperature,
      max_tokens: maxTokens || config.maxTokens,
      response_format: { type: "json_object" },
    };
    if (config.provider === "bigmodel") body.do_sample = false;
    if (config.provider === "dashscope") body.enable_thinking = config.enableThinking;

    const response = await fetch(config.chatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`${config.provider} API failed: ${response.status} ${bodyText.slice(0, 500)}`);
    }

    const payload = JSON.parse(bodyText);
    const content = payload.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(content);
    if (!parsed) {
      const retriesLeft = Number(jsonRetries ?? (config.provider === "dashscope" ? 1 : 0));
      if (retriesLeft > 0) {
        return callAgentModelJson({
          messages: [
            ...messages,
            { role: "system", content: "The previous response was not valid JSON. Return exactly one valid JSON object matching the requested schema, with no surrounding text." },
          ],
          temperature: Math.max(Number(temperature || 0), 0.1),
          maxTokens,
          timeoutMs,
          model,
          jsonRetries: retriesLeft - 1,
        });
      }
      throw new Error(`${config.provider} response did not contain valid JSON`);
    }

    return {
      parsed,
      rawContent: content,
      provider: config.provider,
      model: payload.model || model || config.model,
      usage: payload.usage || null,
      requestId: payload.request_id || payload.id || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function callBigModelJson(options) {
  return callAgentModelJson(options);
}

export async function callAgentEmbeddings(texts, { batchSize } = {}) {
  const config = getAgentModelConfig(process.env.AGENT_EMBEDDING_PROVIDER);
  if (!config.apiKey) {
    throw new Error(config.missingKeyMessage);
  }

  const model = config.embeddingModel;
  const dimensions = config.embeddingDimensions;
  const inputs = Array.isArray(texts) ? texts : [texts];
  const effectiveBatchSize = Number(batchSize || (config.provider === "dashscope" ? 10 : 64));
  const allEmbeddings = [];
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let offset = 0; offset < inputs.length; offset += effectiveBatchSize) {
    const batch = inputs.slice(offset, offset + effectiveBatchSize);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.embeddingsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: batch,
          ...(Number.isFinite(dimensions) ? { dimensions } : {}),
        }),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(`${config.provider} embeddings failed: ${response.status} ${bodyText.slice(0, 500)}`);
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
    provider: config.provider,
    model,
    dimensions,
    usage,
  };
}

export function callBigModelEmbeddings(texts, options) {
  return callAgentEmbeddings(texts, options);
}
