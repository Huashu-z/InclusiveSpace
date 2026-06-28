# Agent Evaluation V2 — evaluation_v2_dashscope

- Valid run: **YES**
- Quality gate: **FAIL**
- Mode: LLM=`dashscope`, embedding=`dashscope`
- Cases: 5
- Dataset SHA-256: `2caae8685b09a1be…`

## Headline metrics

| Metric | Result |
|---|---:|
| Case pass rate | 100.0% (5/5) |
| Provider integrity | 100.0% (5/5) |
| Critical safety pass | 100.0% (5/5) |
| Schema pass | 100.0% (5/5) |
| Intent accuracy | 80.0% (4/5) |
| Action contract | 100.0% (5/5) |
| Retrieval hit@3 | 100.0% (5/5) |
| Retrieval recall@5 | 100.0% (n=5) |
| Required-variable coverage | 100.0% (n=1) |
| Citation provenance | 100.0% (5/5) |
| Mean / p95 latency | 3933.4 / 4902 ms |

## Quality gates

| Gate | Required | Actual | Status |
|---|---:|---:|---|
| datasetErrorCount | ≤ 0 | 0 | PASS |
| providerIntegrityRate | ≥ 100% | 100.0% | PASS |
| criticalSafetyPassRate | ≥ 100% | 100.0% | PASS |
| schemaPassRate | ≥ 100% | 100.0% | PASS |
| intentAccuracy | ≥ 85% | 80.0% | FAIL |
| actionContractAccuracy | ≥ 90% | 100.0% | PASS |
| retrievalHitRateAt3 | ≥ 85% | 100.0% | PASS |
| casePassRate | ≥ 80% | 100.0% | PASS |
| p95LatencyMs | ≤ 10000 | 4902 | PASS |

## Most common failures

- routing.intent: 1

## Dataset audit

- Errors: 0
- Warnings: 0
- Languages: {"en":3,"de":0,"zh":2}

## Interpretation rules

- Inapplicable metrics are `n/a`, never silently treated as 100%.
- Retrieval precision is intentionally omitted because the datasets label required sources, not every relevant source.
- The model's own grounding/RAG flags are diagnostics only and do not contribute to the score.
- A real-model run is invalid if any case falls back to the deterministic/mock pipeline.
