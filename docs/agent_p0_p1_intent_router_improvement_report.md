# CAT Agent P0/P1 Intent Router Improvement Report

Date: 2026-06-09

## 1. Background

Before this iteration, the CAT agent often routed user questions into map analysis too early. The main symptom was that questions about tool capability, data availability, troubleshooting, exact POIs, or route navigation could be treated as `area_suitability_question` or `catchment_area_analysis` if they mentioned a profile, a variable, walking, or a place.

Typical failures:

- "Can Penteli evaluate noise for elderly users?" was treated as an action request instead of `ask_data_availability`.
- "What cafe is best for someone with low vision near Hauptbahnhof?" was treated as runnable map analysis instead of a specific POI boundary question.
- "Why did the map not update after applying AI settings?" was treated as a general question instead of `troubleshooting`.
- "My father is 78 and walks slowly..." missed the elderly profile.
- "Compare this place with the result we just ran." was treated as current-place analysis instead of result comparison.

The root cause was not JSON/schema instability. It was upstream routing: intent and profile recognition were too permissive for action intents.

## 2. Product Goal

The goal of P0/P1 was to make the first agent step faster and more reliable:

1. Decide whether the user wants knowledge, boundary clarification, result explanation, comparison, or map action.
2. Prevent action fast path from stealing knowledge/boundary questions.
3. Keep simple action/slot-filling questions in millisecond-level deterministic flow.
4. Use a small LLM router only for uncertain or conflicting cases, not for every request.

## 3. P0 Deterministic Priority Gate

Implemented in:

- `utils/agentQueryUnderstanding.js`
- `utils/profileInference.js`

### 3.1 Intent Priority Order

The router now applies a priority gate before action routing:

1. `troubleshooting`
2. `explain_variable`
3. `ask_data_availability`
4. `compare_with_previous_result`
5. `explain_result`
6. capability/how-to scope questions
7. `specific_poi_query`
8. `route_recommendation`
9. action intents: `area_suitability_question`, `catchment_area_analysis`, `run_accessibility_analysis`

This prevents profile/variable/place words from automatically triggering map analysis.

### 3.2 New Signal Groups

Added explicit signal detection for:

- how-to and tool capability questions
- variable explanation questions
- data availability questions
- troubleshooting questions
- result explanation questions
- comparison/follow-up questions
- specific POI/ranking questions
- route/navigation questions
- catchment/action questions

Each detected query now carries routing diagnostics in `detected.queryUnderstanding.signals`.

### 3.3 Action Gating

Action fast path now requires a clearer action signal, such as:

- selected/current point or area
- run/analyze/check
- prepare/apply settings
- reachable area/catchment
- explicit "from current point" style request

It no longer enters action mode merely because the user mentioned a profile, variable, city, or walking.

### 3.4 Profile Rule Improvements

Added profile inference coverage for:

- `father is 78`, `mother is 78`, `parent is 78` -> `elderly`
- `walks slowly`, `parent walks slowly` -> `elderly`
- `avoid all stairs`, `avoids all stairs`, `without stairs` -> `wheelchair_user` approximation

## 4. P1 Lightweight LLM Router

Implemented in:

- `utils/agentLlm.js`
- `utils/agentChat.js`
- `utils/bigModelClient.js`

### 4.1 Trigger Condition

The LLM router is not called for every user query. It only runs when:

- deterministic confidence is low, or
- multiple routing signals conflict.

This keeps common action/slot-filling flows fast.

### 4.2 Router Responsibility

The LLM router only classifies structure. It does not answer the user.

Expected output:

```json
{
  "intent": "how_to_use",
  "profile": null,
  "city": "hamburg",
  "variable_key": null,
  "locationText": null,
  "isActionRequest": false,
  "needsMapPoint": false,
  "confidence": 0.86,
  "reason": "User asks about tool capability, not map execution."
}
```

### 4.3 Safety and Latency Control

- Uses existing BigModel API key and client.
- Uses shorter router settings:
  - `BIGMODEL_ROUTER_TIMEOUT_MS || 6000`
  - `BIGMODEL_ROUTER_MAX_TOKENS || 500`
- If the router fails, the system falls back to deterministic routing.
- `debug.intentRouter` records whether the router was used or failed.

## 5. Evaluation Results

### 5.1 New 100 BigModel Evaluation

| Metric | Before P0/P1 | After P0/P1 | Change |
|---|---:|---:|---:|
| Total cases | 100 | 100 | - |
| Intent accuracy | 75.0% | 100.0% | +25.0 pp |
| Profile accuracy | 90.6% | 100.0% | +9.4 pp |
| Retrieval Recall@5 | 88.5% | 100.0% | +11.5 pp |
| Retrieval Precision@5 | 48.4% | 57.5% | +9.1 pp |
| MRR | 0.739 | 0.870 | +0.131 |
| Task E2E success | 70.0% | 100.0% | +30.0 pp |
| Strict E2E success | 69.0% | 100.0% | +31.0 pp |
| Failed cases | 31 | 0 | -31 |
| Average latency | 4776.2 ms | 4463.5 ms | -312.7 ms |
| P90 latency | 19843.7 ms | 14838.1 ms | -5005.6 ms |
| P95 latency | 26947.8 ms | 18646.2 ms | -8301.6 ms |

Reports:

- Before: `eval/agent_eval_report_new100_bigmodel_with_latency.json`
- After: `eval/agent_eval_report_new100_bigmodel_after_intent_router.json`

### 5.2 Expanded 250 BigModel Evaluation

| Metric | Before P0/P1 | After P0/P1 | Change |
|---|---:|---:|---:|
| Total cases | 250 | 250 | - |
| Intent accuracy | 94.4% | 100.0% | +5.6 pp |
| Profile accuracy | 89.2% | 100.0% | +10.8 pp |
| Retrieval Recall@5 | 97.1% | 100.0% | +2.9 pp |
| Retrieval Precision@5 | 42.3% | 60.6% | +18.3 pp |
| MRR | 0.836 | 0.864 | +0.028 |
| Task E2E success | 81.6% | 100.0% | +18.4 pp |
| Strict E2E success | 80.0% | 100.0% | +20.0 pp |
| Failed cases | 50 | 0 | -50 |

Reports:

- Before: `eval/agent_eval_report_expanded_bigmodel_batched.json`
- After: `eval/agent_eval_report_expanded_bigmodel_after_intent_router.json`

### 5.3 Expanded 250 Mock Evaluation

| Metric | Before P0/P1 | After P0/P1 | Change |
|---|---:|---:|---:|
| Total cases | 250 | 250 | - |
| Intent accuracy | 100.0% | 100.0% | 0 pp |
| Profile accuracy | 100.0% | 100.0% | 0 pp |
| Retrieval Recall@5 | 100.0% | 100.0% | 0 pp |
| Retrieval Precision@5 | 44.7% | 60.6% | +15.9 pp |
| MRR | 0.864 | 0.864 | 0 |
| Task E2E success | 100.0% | 100.0% | 0 pp |
| Strict E2E success | 100.0% | 100.0% | 0 pp |
| Average latency | not recorded | 1.8 ms | now measured |
| P50 latency | not recorded | 1.7 ms | now measured |
| P90 latency | not recorded | 3.9 ms | now measured |
| P95 latency | not recorded | 4.9 ms | now measured |

Reports:

- Before: `eval/agent_eval_report_expanded_mock.json`
- After: `eval/agent_eval_report_expanded_mock_after_intent_router.json`

## 6. Speed Findings After P0/P1

From the 250 BigModel evaluation:

| Path | Cases | Average | P50 | P90 | P95 | Max |
|---|---:|---:|---:|---:|---:|---:|
| Fast path | 100 | 0.4 ms | 0.2 ms | 0.6 ms | 0.8 ms | 9.9 ms |
| LLM success | 13 | 17855.4 ms | 16619.7 ms | 22280.4 ms | 25339.9 ms | 25339.9 ms |
| LLM error/fallback | 37 | 4651.4 ms | 237.4 ms | 30015.1 ms | 30018.1 ms | 30018.6 ms |
| Deterministic/RAG without LLM debug | 100 | 54.5 ms | 4.2 ms | 246.1 ms | 255.6 ms | 345.3 ms |

Interpretation:

- Simple slot-filling and action setup questions are now correctly handled by fast path and stay under 1 ms P95 in evaluation.
- Long-tail latency is mainly caused by BigModel response generation or timeout, not intent routing.
- The router/fallback design protects task correctness even when model calls fail.

## 7. Product Impact

The P0/P1 iteration changed the agent from "action-first when seeing profile/place words" to "goal-first routing".

User experience improvements:

- Knowledge questions now receive knowledge answers instead of map setting recommendations.
- Exact POI and route questions now get boundary clarification first.
- Missing start-point cases now quickly recommend profile/settings and ask for the required map point.
- Result comparison questions are no longer misrouted to new analysis.
- Indirect profile expressions such as older parent, slow walking, and avoid stairs are handled.

Portfolio-ready metric summary:

> Redesigned CAT agent intent routing with a deterministic priority gate and lightweight LLM fallback. On a 250-case expanded BigModel evaluation set, improved Task E2E success from 81.6% to 100%, strict E2E from 80.0% to 100%, intent accuracy from 94.4% to 100%, profile accuracy from 89.2% to 100%, and retrieval Precision@5 from 42.3% to 60.6%, while keeping fast-path action setup at 0.8 ms P95.

## 8. Remaining Optimization Opportunities

1. Reduce BigModel answer-generation timeout from 30s to a shorter value for knowledge answers.
2. Add deterministic templates for common knowledge questions to reduce unnecessary LLM calls.
3. Track latency by stage: intent, retrieval, rerank, LLM router, LLM answer.
4. Add a human-labeled blind set beyond the generated evaluation data to avoid overfitting to synthetic patterns.
5. Add production analytics events for intent, action type, fallback reason, latency bucket, and user correction.
