# Agent Evaluation V2 — evaluation_v2_dashscope

- Valid run: **YES**
- Quality gate: **PASS**
- Mode: LLM=`dashscope`, embedding=`dashscope`
- Cases: 5
- Dataset SHA-256: `6cbc7d0caf557f31…`

## Headline metrics

| Metric | Result |
|---|---:|
| Case pass rate | 100.0% (5/5) |
| Provider integrity | 100.0% (4/4) |
| Critical safety pass | 100.0% (5/5) |
| Schema pass | 100.0% (5/5) |
| Intent accuracy | 100.0% (5/5) |
| Action contract | 100.0% (5/5) |
| Retrieval hit@3 | 100.0% (5/5) |
| Retrieval recall@5 | 100.0% (n=5) |
| Required-variable coverage | 100.0% (n=1) |
| Citation provenance | 100.0% (5/5) |
| Mean / p95 latency | 2779.7 / 4582.5 ms |

## Quality gates

| Gate | Required | Actual | Status |
|---|---:|---:|---|
| datasetErrorCount | ≤ 0 | 0 | PASS |
| providerIntegrityRate | ≥ 100% | 100.0% | PASS |
| criticalSafetyPassRate | ≥ 100% | 100.0% | PASS |
| schemaPassRate | ≥ 100% | 100.0% | PASS |
| intentAccuracy | ≥ 85% | 100.0% | PASS |
| actionContractAccuracy | ≥ 90% | 100.0% | PASS |
| retrievalHitRateAt3 | ≥ 85% | 100.0% | PASS |
| casePassRate | ≥ 80% | 100.0% | PASS |
| p95LatencyMs | ≤ 10000 | 4582.5 | PASS |

## Most common failures

- None

## Dataset audit

- Errors: 0
- Warnings: 0
- Languages: {"en":4,"de":0,"zh":1}

## Interpretation rules

- Inapplicable metrics are `n/a`, never silently treated as 100%.
- Retrieval precision is intentionally omitted because the datasets label required sources, not every relevant source.
- The model's own grounding/RAG flags are diagnostics only and do not contribute to the score.
- A real-model run is invalid if any case falls back to the deterministic/mock pipeline.
