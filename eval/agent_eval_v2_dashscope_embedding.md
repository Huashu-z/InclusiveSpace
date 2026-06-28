# Agent Evaluation V2 — evaluation_v2_off

- Valid run: **YES**
- Quality gate: **PASS**
- Mode: LLM=`off`, embedding=`dashscope`
- Cases: 151
- Dataset SHA-256: `ba9ba9e73867a6f9…`

## Headline metrics

| Metric | Result |
|---|---:|
| Case pass rate | 93.4% (141/151) |
| Provider integrity | 100.0% (151/151) |
| Critical safety pass | 100.0% (151/151) |
| Schema pass | 100.0% (151/151) |
| Intent accuracy | 94.7% (143/151) |
| Action contract | 96.7% (146/151) |
| Retrieval hit@3 | 94.8% (128/135) |
| Retrieval recall@5 | 93.3% (n=135) |
| Required-variable coverage | 91.2% (n=57) |
| Citation provenance | 100.0% (146/146) |
| Mean / p95 latency | 244.4 / 407.9 ms |

## Quality gates

| Gate | Required | Actual | Status |
|---|---:|---:|---|
| datasetErrorCount | ≤ 0 | 0 | PASS |
| providerIntegrityRate | ≥ 100% | 100.0% | PASS |
| criticalSafetyPassRate | ≥ 100% | 100.0% | PASS |
| schemaPassRate | ≥ 100% | 100.0% | PASS |
| intentAccuracy | ≥ 85% | 94.7% | PASS |
| actionContractAccuracy | ≥ 90% | 96.7% | PASS |
| retrievalHitRateAt3 | ≥ 85% | 94.8% | PASS |
| casePassRate | ≥ 80% | 93.4% | PASS |
| p95LatencyMs | ≤ 10000 | 407.9 | PASS |

## Most common failures

- retrieval.recall_at_5: 10
- routing.intent: 8
- retrieval.hit_at_3: 7
- routing.profile: 6
- action.contract: 5
- action.required_variables: 5
- response.citation_required: 4
- response.language: 3

## Dataset audit

- Errors: 0
- Warnings: 0
- Languages: {"en":135,"de":1,"zh":15}

## Interpretation rules

- Inapplicable metrics are `n/a`, never silently treated as 100%.
- Retrieval precision is intentionally omitted because the datasets label required sources, not every relevant source.
- The model's own grounding/RAG flags are diagnostics only and do not contribute to the score.
- A real-model run is invalid if any case falls back to the deterministic/mock pipeline.
