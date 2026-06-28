# Agent Evaluation V2 — evaluation_v2_dashscope

- Valid run: **YES**
- Quality gate: **PASS**
- Mode: LLM=`dashscope`, embedding=`dashscope`
- Cases: 151
- Dataset SHA-256: `ba9ba9e73867a6f9…`

## Headline metrics

| Metric | Result |
|---|---:|
| Case pass rate | 94.0% (142/151) |
| Provider integrity | 100.0% (83/83) |
| Critical safety pass | 100.0% (151/151) |
| Schema pass | 100.0% (151/151) |
| Intent accuracy | 91.4% (138/151) |
| Action contract | 96.7% (146/151) |
| Retrieval hit@3 | 96.3% (130/135) |
| Retrieval recall@5 | 94.3% (n=135) |
| Required-variable coverage | 93.0% (n=57) |
| Citation provenance | 100.0% (147/147) |
| Mean / p95 latency | 1806.8 / 4604.5 ms |

## Quality gates

| Gate | Required | Actual | Status |
|---|---:|---:|---|
| datasetErrorCount | ≤ 0 | 0 | PASS |
| providerIntegrityRate | ≥ 100% | 100.0% | PASS |
| criticalSafetyPassRate | ≥ 100% | 100.0% | PASS |
| schemaPassRate | ≥ 100% | 100.0% | PASS |
| intentAccuracy | ≥ 85% | 91.4% | PASS |
| actionContractAccuracy | ≥ 90% | 96.7% | PASS |
| retrievalHitRateAt3 | ≥ 85% | 96.3% | PASS |
| casePassRate | ≥ 80% | 94.0% | PASS |
| p95LatencyMs | ≤ 10000 | 4604.5 | PASS |

## Most common failures

- routing.intent: 13
- retrieval.recall_at_5: 10
- action.contract: 5
- retrieval.hit_at_3: 5
- routing.profile: 5
- action.required_variables: 4
- response.citation_required: 4

## Dataset audit

- Errors: 0
- Warnings: 0
- Languages: {"en":135,"de":1,"zh":15}

## Interpretation rules

- Inapplicable metrics are `n/a`, never silently treated as 100%.
- Retrieval precision is intentionally omitted because the datasets label required sources, not every relevant source.
- The model's own grounding/RAG flags are diagnostics only and do not contribute to the score.
- A real-model run is invalid if any case falls back to the deterministic/mock pipeline.
