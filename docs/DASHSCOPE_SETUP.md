# Alibaba Cloud Bailian / DashScope setup

## Recommended models

- Final response and structured action: `qwen3.7-plus`
- Ambiguous-intent routing: `qwen3.6-flash` with a 1200-token JSON budget
- Follow-up query rewriting: `qwen3.6-flash`
- Thinking mode: disabled for lower latency and more predictable JSON
- Embeddings: `text-embedding-v4`, 1024 dimensions, after rebuilding the entire local dense index

Both chat models support structured output. The split keeps the higher-quality model for user-facing generation and uses the faster model for short classification tasks.

## Decision authority

- Deterministic routing handles confident queries; the LLM router is called only for ambiguity.
- Executable action type, profile preset, variables, weights, coordinates, and warnings are deterministic and immutable.
- The final LLM receives the baseline action only as context and may change the user-facing reply only.
- Invalid JSON, timeout, or provider failure falls back to the deterministic result without changing the action.

## Mapping from the Bailian configuration table

| Table field | Project setting | Notes |
|---|---|---|
| `apiKey` | `DASHSCOPE_API_KEY` | Secret; backend environment only |
| `openAiCompatible` | `DASHSCOPE_BASE_URL` | Preferred source for the complete compatible endpoint |
| `apiHost` | fallback input for `DASHSCOPE_BASE_URL` | Use only when a complete compatible URL is unavailable |
| `dashScope` | reference/fallback endpoint | Not needed when `openAiCompatible` is complete |
| `workspaceId` | encoded in regional workspace URL | Do not send as an extra header |
| `workspaceName` | unused | Metadata only |
| `description` | unused | Metadata only |

The table does not contain a model field. Model selection is explicit in environment configuration.

## `.env.local`

```dotenv
AGENT_LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=<secret API key>
DASHSCOPE_BASE_URL=<the exact openAiCompatible URL>
DASHSCOPE_MODEL=qwen3.7-plus
DASHSCOPE_ROUTER_MODEL=qwen3.6-flash
DASHSCOPE_ROUTER_MAX_TOKENS=1200
DASHSCOPE_ROUTER_TIMEOUT_MS=15000
DASHSCOPE_REWRITE_MODEL=qwen3.6-flash
DASHSCOPE_ENABLE_THINKING=false
DASHSCOPE_TIMEOUT_MS=30000
DASHSCOPE_MAX_TOKENS=1600

AGENT_EMBEDDING_PROVIDER=dashscope
DASHSCOPE_EMBEDDING_MODEL=text-embedding-v4
DASHSCOPE_EMBEDDING_DIMENSIONS=1024
```

Do not paste the API key into source files, client-side variables, screenshots, Git, or evaluation reports.

## Verification

Run the five-case provider canary first:

```powershell
npm run eval:v2:dashscope-canary
```

The report is valid only when provider integrity is 100%; deterministic fallback is not counted as a DashScope result.

Then run the full real-provider evaluation:

```powershell
node scripts/eval-agent-v2.mjs --llm=dashscope --embedding=off --delay-ms=750 --report=eval/agent_eval_v2_dashscope.json
```

## DashScope embeddings

Query vectors from `text-embedding-v4` must only be compared with an index built by the same model and dimension. Configure:

```dotenv
AGENT_EMBEDDING_PROVIDER=dashscope
DASHSCOPE_EMBEDDING_MODEL=text-embedding-v4
DASHSCOPE_EMBEDDING_DIMENSIONS=1024
```

Then rebuild the complete index with `npm run build:rag` before evaluating retrieval. The runtime rejects a local index whose recorded model does not match the query embedding model.

Validate dense retrieval with:

```powershell
npm run test:embedding:dashscope
npm run eval:v2:dashscope-embedding
```

The current 35-chunk benchmark changed rankings in 57 of 151 cases while keeping Hit@3, Recall@5, and MRR unchanged. Mean evaluation latency increased by about 240 ms per case. Dense retrieval is retained to improve semantic robustness on unseen paraphrases; benchmark gains should be reassessed as the knowledge base and independent holdout grow.
