# Evaluation V2

This evaluation separates five concerns that the previous all-or-nothing score mixed together: routing, action correctness, retrieval, response quality, and safety.

## Why V2 exists

The previous evaluator had four sources of optimistic bias:

1. Metrics with zero applicable examples returned `1` (100%) instead of `null`/`n/a`.
2. Required variables were measured but missing variables did not fail a case.
3. The response's own `groundingCheck` and `ragSufficiency` declarations were counted as evidence of quality.
4. Runs requested with BigModel could silently fall back to the deterministic pipeline and still be reported as BigModel results.

V2 fixes these issues. It also records dataset/config hashes, Git revision, provider provenance, latency, Wilson confidence intervals, category/language slices, and a failure taxonomy.

## Case score and hard gates

Applicable checks are grouped and weighted:

- routing: 25%
- action: 25%
- retrieval: 20%
- response: 15%
- safety: 15%

Weights are renormalized when a dimension is not applicable. A case passes only when its score is at least 0.80, the requested provider really ran, and no critical check failed. Safety, action contract, schema, and provider provenance are critical checks.

The aggregate quality gate is defined in `eval/evaluation_config_v2.json`. A report can be valid but fail quality targets. A real-model report with any mock fallback is invalid.

## Metric semantics

- Required-variable coverage checks that every labelled minimum-required variable is selected. It does not penalize additional supported variables.
- Retrieval hit@3, recall@5, and MRR are computed only when expected sources exist.
- Retrieval precision is deliberately not reported: existing labels list required sources, not an exhaustive set of all relevant sources.
- Inapplicable metrics are `null`/`n/a`, never 100%.
- Self-reported grounding/RAG checks remain in case diagnostics but never affect the score.

## Datasets and limitations

The default run combines the curated multilingual regression set, the conversation challenge set, and the generated 100-case development challenge. These are development benchmarks, not a statistically independent hidden test set. The generated set is useful for breadth and regression detection but must not be described as unbiased production accuracy.

A future externally labelled holdout should be added as another suite with frozen labels, versioned provenance, and no use during prompt/router development. Human review remains necessary for nuanced answer helpfulness and claim-level faithfulness.

## Commands

```powershell
npm run eval:v2
npm run eval:v2:real
npm run eval:v2:canary
npm run eval:v2:fullstack
node scripts/eval-agent-v2.mjs --suite=core_multilingual --llm=off --report=eval/custom.json
node --test tests/evaluation_v2.test.mjs
```

`eval:v2` is fully local. `eval:v2:real` isolates real LLM generation while keeping retrieval deterministic. `eval:v2:fullstack` also enables remote query embeddings and is the end-to-end infrastructure check.

`eval:v2:canary` runs five representative cases with a 10-second per-model-call timeout. Use it before an expensive full real-provider run.

The evaluator writes a JSONL checkpoint after every case. An interrupted run can continue with `--resume`; the checkpoint is removed after a complete report is written. It writes matching JSON and Markdown reports and exits non-zero when the run is invalid or an aggregate quality gate fails.
