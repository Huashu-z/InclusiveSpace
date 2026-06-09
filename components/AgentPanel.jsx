import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { getDemoScenariosList, getDemoScenario } from "../utils/demoScenarios.js";

export default function AgentPanel({
  selectedCity = "hamburg",
  selectedLayers = [],
  enabledVariables = [],
  layerValues = {},
  agentProfile,
  startPoint,
  startPoints = [],
  walkingTime,
  walkingSpeed,
  resultMetadata = [],
  onApplySettings,
  onRunRealComputation,
  onExecuteAgentAction,
  onLoadScenario,
  onResponse,
}) {
  const [prompt, setPrompt] = useState("我是一位老年人，想知道这个区域是否适合步行/活动？");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [realComputationStatus, setRealComputationStatus] = useState(null);
  const [lastRealComputation, setLastRealComputation] = useState(null);
  const [lastAgentContext, setLastAgentContext] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [pendingCompareAction, setPendingCompareAction] = useState(null);
  const lastSubmittedQuestionRef = React.useRef(null);
  const recordedAnalysisSignaturesRef = React.useRef(new Set());
  const analysisHistoryRef = React.useRef([]);
  const lastAgentContextRef = React.useRef(null);
  const pendingCompareActionRef = React.useRef(null);
  const sendRequestRef = React.useRef(null);
  const hasResultMetadata = Array.isArray(resultMetadata) && resultMetadata.length > 0;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedConversation = sessionStorage.getItem("catConversationHistory");
      const savedAnalysis = sessionStorage.getItem("catAnalysisHistory");
      if (savedConversation) setConversationHistory(JSON.parse(savedConversation));
      if (savedAnalysis) {
        const parsed = JSON.parse(savedAnalysis);
        setAnalysisHistory(parsed);
        recordedAnalysisSignaturesRef.current = new Set(parsed.map((record) => record.signature).filter(Boolean));
      }
    } catch (storageError) {
      console.error("Failed to load CAT agent memory", storageError);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("catConversationHistory", JSON.stringify(conversationHistory.slice(-20)));
  }, [conversationHistory]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("catAnalysisHistory", JSON.stringify(analysisHistory.slice(-20)));
    analysisHistoryRef.current = analysisHistory;
  }, [analysisHistory]);

  React.useEffect(() => {
    lastAgentContextRef.current = lastAgentContext;
  }, [lastAgentContext]);

  React.useEffect(() => {
    pendingCompareActionRef.current = pendingCompareAction;
  }, [pendingCompareAction]);

  const buildAnalysisRecord = React.useCallback((metadataItems) => {
    if (!Array.isArray(metadataItems) || metadataItems.length === 0) return null;
    const weighted = [...metadataItems].reverse().find((item) => item && !item.isDefault);
    const baseline = weighted
      ? [...metadataItems].reverse().find((item) => item?.isDefault && item.groupIndex === weighted.groupIndex)
      : [...metadataItems].reverse().find((item) => item?.isDefault);
    const latest = weighted || baseline;
    if (!latest) return null;
    const point = Array.isArray(startPoint) && startPoint.length === 2 ? startPoint : null;
    if (!point) return null;
    const signature = [
      selectedCity,
      point.map((value) => Number(value).toFixed(6)).join(","),
      latest.groupIndex ?? "",
      weighted?.subIndex ?? "baseline",
      latest.area ?? "",
      weighted?.weightedRatio ?? "",
    ].join("|");
    if (recordedAnalysisSignaturesRef.current.has(signature)) return null;
    const variables = weighted?.values || layerValues || {};
    return {
      id: `analysis_${Date.now()}`,
      signature,
      userQuestion: lastSubmittedQuestionRef.current || lastAgentContext?.originalUserQuestion || "",
      intent: lastAgentContext?.originalIntent || "manual_or_map_analysis",
      profile: agentProfile?.id || agentProfile?.presetId || weighted?.profile || null,
      city: selectedCity,
      startPoint: {
        lon: Number(point[0]),
        lat: Number(point[1]),
        label: latest.locationText || lastAgentContext?.originalLocationText || "Current map start point",
      },
      settings: {
        walkingTime: Number(latest.time ?? walkingTime),
        walkingSpeed: Number(latest.speed ?? walkingSpeed),
        enabledVariables: Array.isArray(weighted?.layers) ? weighted.layers : enabledVariables,
        variables,
        layerValues: variables,
      },
      baseline: baseline
        ? {
            area: Number(baseline.area),
            poiCount: Number(baseline.poiCount),
          }
        : null,
      adjusted: weighted
        ? {
            area: Number(weighted.area),
            comfortRatio: Number(weighted.weightedRatio),
            poiCount: Number(weighted.poiCount),
            values: weighted.values || {},
          }
        : null,
      result: {
        baselineArea: baseline ? Number(baseline.area) : null,
        adjustedArea: weighted ? Number(weighted.area) : null,
        comfortRatio: weighted ? Number(weighted.weightedRatio) : null,
        baselinePoiCount: baseline ? Number(baseline.poiCount) : null,
        adjustedPoiCount: weighted ? Number(weighted.poiCount) : null,
      },
      createdAt: new Date().toISOString(),
    };
  }, [agentProfile, enabledVariables, lastAgentContext, layerValues, selectedCity, startPoint, walkingSpeed, walkingTime]);

  React.useEffect(() => {
    const record = buildAnalysisRecord(resultMetadata);
    if (!record) return;
    recordedAnalysisSignaturesRef.current.add(record.signature);
    const nextHistory = [...analysisHistoryRef.current, record].slice(-20);
    setAnalysisHistory(nextHistory);
    const pendingAction = pendingCompareActionRef.current;
    if (pendingAction?.baseAnalysisId) {
      const base = nextHistory.find((item) => item.id === pendingAction.baseAnalysisId) || nextHistory[nextHistory.length - 2] || null;
      if (base && record.id !== base.id) {
        setPendingCompareAction(null);
        void sendRequestRef.current?.("Compare the latest CAT result with the previous analysis.", {
          analysisHistoryOverride: nextHistory,
          agentContext: {
            originalUserQuestion: lastAgentContextRef.current?.originalUserQuestion || pendingAction.originalUserQuestion || "follow-up comparison",
            originalIntent: "compare_with_previous_result",
          },
        });
      }
    }
  }, [buildAnalysisRecord, resultMetadata]);

  const getActionConclusion = (action) => {
    if (!action || action.type === "ANSWER_ONLY") return "";
    if (action.requiresStartPoint || action.type === "ASK_USER_TO_SELECT_POINT") {
      return "Profile and recommended CAT settings are ready. Please select a start point/address on the map before running the real accessibility calculation.";
    }
    if (action.canRunNow || Array.isArray(action.coordinates)) {
      return "Profile and recommended CAT settings are ready. A start point is available, so you can review the settings and run the real accessibility calculation.";
    }
    return "Structured action is ready. Please review the settings before applying it.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    setRealComputationStatus(null);
    setLastRealComputation(null);
    await sendRequest(prompt);
  };

  async function sendRequest(overridePrompt, options = {}) {
    const p = typeof overridePrompt === "string" ? overridePrompt : prompt;
    lastSubmittedQuestionRef.current = p;
    const outgoingConversation = options.conversationHistoryOverride || conversationHistory;
    const outgoingAnalysisHistory = options.analysisHistoryOverride || analysisHistory;
    setError(null);
    setLoading(true);
    setResult(null);
    setRealComputationStatus(null);
    setLastRealComputation(null);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: p,
          city: selectedCity,
          currentMapState: {
            walkingTime,
            walkingSpeed,
            selectedLayers,
            enabledVariables,
            layerValues,
            startPoint,
            startPoints: Array.isArray(startPoints) && startPoints.length ? startPoints : startPoint ? [startPoint] : [],
            selectedStartPoint: startPoint,
            profile: agentProfile
          },
          resultMetadata: hasResultMetadata ? resultMetadata : null,
          agentContext: options.agentContext || null,
          conversationHistory: outgoingConversation.slice(-20),
          analysisHistory: outgoingAnalysisHistory.slice(-20)
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Agent API 请求失败");
      }
      const data = await response.json();
      const uiData = {
        ...data,
        mode: data.answerMode || data.intent,
        intentMode: data.intent,
        ragResults: data.retrieval?.results?.map((doc, index) => ({
          id: doc.metadata?.source || `${doc.collection}-${index}`,
          description: doc.title,
          summary: doc.content,
          score: doc.similarity,
          collection: doc.collection,
          metadata: doc.metadata
        })) || []
      };
      setResult(uiData);
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: p },
        { role: "assistant", content: data.reply || "" },
      ].slice(-20));
      if (data.intent !== "explain_result") {
        setLastAgentContext({
          originalUserQuestion: p,
          originalIntent: data.intent,
          originalAnswerMode: data.answerMode,
          originalActionType: data.action?.type || null,
          originalLocationText: data.action?.locationText || data.detected?.locationText || null,
          capabilityCheck: data.capabilityCheck || null,
          ragSufficiency: data.ragSufficiency || null,
        });
      }
      onResponse?.(uiData);
    } catch (err) {
      console.error(err);
      setError(err.message || "未知错误");
    } finally {
      setLoading(false);
    }
  }
  sendRequestRef.current = sendRequest;

  const handleApply = () => {
    if (!result?.suggestedSettings) return;
    onApplySettings?.(result.suggestedSettings);
  };

  const handleApplyAndRun = () => {
    if (!result?.suggestedSettings) return;
    onApplySettings?.(result.suggestedSettings);
    handleRunRealComputation();
  };

  const handleSelectRegionAndRun = (region) => {
    if (!region || !region.center) return;
    if (result?.suggestedSettings) onApplySettings?.(result.suggestedSettings);
    handleRunRealComputation({ startPointOverride: region.center, region });
  };

  const handleApplyAction = ({ run = false } = {}) => {
    executeAgentAction(result?.action, { run, alternative: false });
    return;
    if (!result?.action) return;
    const didExecute = onExecuteAgentAction?.(result.action, { run });
    if (didExecute === false) {
      setRealComputationStatus("请先检查 AI action，或在地图上选择起点后再运行。");
      return;
    }
    if (run && result.action.coordinates) {
      setLastRealComputation({
        type: "agent_action",
        label: result.action.locationText || "Agent selected start point",
        center: result.action.coordinates
      });
      setRealComputationStatus("已应用 AI action，并通过现有 CAT 地图流程触发真实可达性计算。");
    } else if (result.action.type === "ASK_USER_TO_SELECT_POINT") {
      setRealComputationStatus("已应用 AI 建议参数。请在地图上选择起点后再运行分析。");
    } else {
      setRealComputationStatus("已应用 AI action。你可以在运行前检查速度、时间、变量和起点。");
    }
  };

  const handleApplyAlternativeAction = ({ run = false } = {}) => {
    executeAgentAction(result?.alternativeAction, { run, alternative: true });
  };

  const executeAgentAction = (action, { run = false, alternative = false } = {}) => {
    if (!action) return;
    if (run && action.type === "RUN_ANALYSIS_THEN_COMPARE") {
      setPendingCompareAction({
        ...action,
        originalUserQuestion: lastSubmittedQuestionRef.current,
      });
    }
    const didExecute = onExecuteAgentAction?.(action, { run });
    if (didExecute === false) {
      setRealComputationStatus(alternative
        ? "Alternative CAT settings were prepared. Please select a start point on the map before running this related catchment analysis."
        : "Please check the AI action, or select a start point on the map before running.");
      return;
    }
    if (run && action.coordinates) {
      setLastRealComputation({
        type: alternative ? "alternative_agent_action" : "agent_action",
        label: action.locationText || (alternative ? "Alternative CAT start point" : "Agent selected start point"),
        center: action.coordinates
      });
      setRealComputationStatus(alternative
        ? "Alternative catchment analysis was triggered. This result is related context, not a direct answer to the original unsupported task."
        : "AI action applied and real CAT accessibility computation triggered.");
    } else if (action.type === "ASK_USER_TO_SELECT_POINT") {
      setRealComputationStatus(alternative
        ? "Alternative CAT settings were applied. Select a start point on the map to run the related catchment analysis."
        : "AI recommended settings applied. Select a start point on the map before running analysis.");
    } else {
      setRealComputationStatus(alternative
        ? "Alternative CAT action applied. Check settings before running this related analysis."
        : "AI action applied. Check speed, time, variables, and start point before running.");
    }
  };

  const handleRunRealComputation = ({ startPointOverride = null, region = null } = {}) => {
    const hasStartPoint = Array.isArray(startPoint) && startPoint.length === 2;
    if (!hasStartPoint && !startPointOverride) {
      setLastRealComputation(null);
      setRealComputationStatus("请先在地图上选择起点，或从推荐区域中设置起点后再运行真实计算。");
      return;
    }

    window.setTimeout(() => {
      const didRun = onRunRealComputation?.({ startPointOverride });
      setLastRealComputation(
        didRun === false
          ? null
          : {
              type: region ? "recommended_region" : "current_start_point",
              label: region?.name || "Current map start point",
              center: startPointOverride || startPoint
            }
      );
      setRealComputationStatus(
        didRun === false
          ? "请先在地图上选择起点，或从推荐区域中设置起点后再运行真实计算。"
          : "已触发真实路网可达性计算。结果会显示在地图和图例中。"
      );
    }, 0);
  };

  const handleLoadDemoScenario = (scenarioId) => {
    const scenario = getDemoScenario(scenarioId);
    if (!scenario) return;

    onLoadScenario?.(scenario);

    // 预填充问题
    setPrompt(scenario.question);
    setResult(null);
    setError(null);
    setRealComputationStatus(null);
    setLastRealComputation(null);
    setShowDemoMenu(false);
    // 自动发送请求以便快速演示（如果希望仅预填，请取消下一行）
    void sendRequest(scenario.question);
  };

  const formatLonLat = (point) => {
    if (!Array.isArray(point) || point.length !== 2) return "";
    const [lon, lat] = point;
    if (!Number.isFinite(Number(lon)) || !Number.isFinite(Number(lat))) return "";
    return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
  };

  const knowledgeAnswerModes = [
    "explain_variable",
    "ask_data_availability",
    "explain_result",
    "compare_profiles",
    "how_to_use",
    "troubleshooting",
    "route_recommendation",
    "specific_poi_query",
    "unsupported_specific_poi_query",
    "parameter_recommendation",
    "DIRECT_ANSWER",
    "PARTIAL_ANSWER",
    "UNSUPPORTED_WITH_ALTERNATIVE",
    "RESULT_EXPLANATION",
    "DATA_LIMITATION",
    "general_question"
  ];
  const isKnowledgeAnswer = result && knowledgeAnswerModes.includes(result.mode);
  const legacyMode = result?.intentMode || result?.mode;

  return (
    <section className={sty.agentPanel} aria-label="AI 代理分析">
      <div className={sty.sidebarSectionTitle}>AI 可达性助手</div>
      
      {/* 演示场景快捷菜单 */}
      <div style={{ marginBottom: "12px" }}>
        <button 
          type="button"
          onClick={() => setShowDemoMenu(!showDemoMenu)}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold"
          }}
        >
          {showDemoMenu ? "▼ 隐藏演示场景" : "▶ 加载演示场景"}
        </button>
        
        {showDemoMenu && (
          <div style={{
            marginTop: "8px",
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}>
            <div className={sty.sidebarText} style={{ fontSize: "12px", marginBottom: "8px", color: "#666" }}>
              💡 选择一个演示场景快速加载（会预填充问题和配置建议）：
            </div>
            {getDemoScenariosList().map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleLoadDemoScenario(scenario.id)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginBottom: "6px",
                  backgroundColor: "#fff",
                  border: "1px solid #bbb",
                  borderRadius: "3px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "12px"
                }}
              >
                <strong>{scenario.title}</strong>
                <br />
                <span style={{ color: "#666", fontSize: "11px" }}>
                  {scenario.description.substring(0, 60)}...
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={sty.sidebarText}>
        {agentProfile
          ? `当前画像：${agentProfile.label || agentProfile.id}`
          : "未选择画像，建议先在用户画像面板中选择一个预设。"}
      </div>
      <div className={sty.sidebarText}>
        {startPoint
          ? `当前起点：${startPoint[1].toFixed(6)}, ${startPoint[0].toFixed(6)}`
          : "请先在地图上选择起点，AI 分析会基于此起点的区域。"}
      </div>
      <form className={sty.agentForm} onSubmit={handleSubmit}>
        <textarea
          className={sty.agentInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          aria-label="AI 问题输入"
        />
        <button type="submit" className={sty.getCatchmentButton} disabled={loading}>
          {loading ? "分析中…" : "发送给 AI"}
        </button>
      </form>

      {error && <div className={sty.sidebarError}>{error}</div>}
      {hasResultMetadata && (
        <button
          type="button"
          className={sty.setupButton}
          onClick={() => sendRequest("Explain the latest CAT result.", { agentContext: lastAgentContext })}
          disabled={loading}
          style={{ width: "100%", marginTop: "8px" }}
        >
          Explain latest result
        </button>
      )}
      {realComputationStatus && (
        <div className={sty.sidebarText} style={{ fontSize: "12px", marginTop: "8px", color: "#444" }}>
          {realComputationStatus}
        </div>
      )}

      {result && (
        <div className={sty.agentResultBox}>
          <div
            className={sty.sidebarText}
            style={{
              marginBottom: "10px",
              padding: "8px",
              border: "1px solid #d7e3f4",
              borderRadius: "6px",
              background: lastRealComputation ? "#eef8f1" : "#f6f9fd",
              fontSize: "12px",
              color: "#334155"
            }}
          >
            <div>
              <strong>{isKnowledgeAnswer ? "Knowledge answer:" : "AI estimate:"}</strong>{" "}
              {isKnowledgeAnswer ? "based on local CAT RAG knowledge" : "based on spatial summaries and local RAG context"}
              {result.runtimeMode ? ` (${result.runtimeMode})` : ""}.
            </div>
            {result.answerMode && (
              <div style={{ marginTop: "4px" }}>
                <strong>Answer mode:</strong> {result.answerMode}
              </div>
            )}
            {result.ragSufficiency && (
              <div style={{ marginTop: "4px" }}>
                <strong>RAG sufficiency:</strong>{" "}
                {result.ragSufficiency.retrievalSufficient ? "sufficient" : "not sufficient"}
                {Array.isArray(result.ragSufficiency.missingEvidence) && result.ragSufficiency.missingEvidence.length > 0
                  ? `; missing: ${result.ragSufficiency.missingEvidence.join(", ")}`
                  : ""}
              </div>
            )}
            {result.capabilityCheck?.systemCanFullyAnswer === false && (
              <div style={{ marginTop: "4px", color: "#8a5a00" }}>
                <strong>Capability boundary:</strong> CAT cannot fully provide {result.capabilityCheck.requiredCapability}.
                {result.capabilityCheck.closestSupportedAlternative
                  ? ` Closest supported alternative: ${result.capabilityCheck.closestSupportedAlternative}.`
                  : ""}
              </div>
            )}
            {result.confidence?.caveat && (
              <div style={{ marginTop: "4px" }}>{result.confidence.caveat}</div>
            )}
            {isKnowledgeAnswer ? (
              <div style={{ marginTop: "4px" }}>
                <strong>Map computation:</strong> not triggered for this knowledge question.
              </div>
            ) : lastRealComputation ? (
              <div style={{ marginTop: "4px" }}>
                <strong>Real computation triggered:</strong> pgRouting is using {lastRealComputation.label}
                {formatLonLat(lastRealComputation.center) ? ` (${formatLonLat(lastRealComputation.center)})` : ""}. Check the map and legend for the computed catchment result.
              </div>
            ) : (
              <div style={{ marginTop: "4px" }}>
                <strong>Real computation:</strong> not run from this AI answer yet. Use the action buttons below to calculate the map result.
              </div>
            )}
          </div>
          <div className={sty.sidebarSubtitle}>AI 分析结果</div>

          {/* 人性化优先展示：结论 -> 简要依据 -> 详细说明 */}
          {(() => {
            const conclusionFromResult = result.conclusion || null;
            let conclusionText = '';
            if (result.action && result.action.type !== "ANSWER_ONLY") {
              conclusionText = getActionConclusion(result.action);
            } else if (isKnowledgeAnswer) {
              conclusionText = '知识库回答';
            } else if (conclusionFromResult) {
              conclusionText = conclusionFromResult;
            } else if (legacyMode === 'region_recommendation') {
              const top = result.recommendedRegions && result.recommendedRegions[0];
              conclusionText = top ? `结论：优先推荐 ${top.name}（得分 ${top.score}/100）。` : '结论：未找到明显推荐区域。';
            } else if (typeof result.score === 'number') {
              conclusionText = result.score >= 60 ? `结论：基于当前数据，对该用户类型总体上是相对友好的（得分 ${result.score}/100）。` : `结论：基于当前数据，存在改进需求（得分 ${result.score}/100）。`;
            } else {
              conclusionText = '结论：未能基于当前数据得出明确结论。';
            }

            // 简要依据：优先使用 factors，回退到 references
            let evidenceText = '';
            if (Array.isArray(result.factors) && result.factors.length > 0) {
              const top = result.factors.slice(0, 3).map(f => {
                const short = f.value ? `${f.name}（${f.value}）` : f.name;
                return short;
              });
              evidenceText = `依据：主要发现包括 ${top.join('、')}。`;
            } else if (Array.isArray(result.references) && result.references.length > 0) {
              const refs = result.references.slice(0, 3).map(r => `${r.description}${r.count ? `（${r.count}）` : ''}`);
              evidenceText = `依据：参考了地图要素数据（例如 ${refs.join('、')}）。`;
            }

            return (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{conclusionText}</div>
                {evidenceText && <div className={sty.sidebarText} style={{ fontSize: '13px', color: '#444' }}>{evidenceText}</div>}
                {/* 详细说明（可折叠/预览） */}
                {result.reply && (
                  <div className={sty.sidebarText} style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#666', fontSize: '12px' }}>
                    {result.reply}
                  </div>
                )}
              </div>
            );
          })()}

          {result.action && result.action.type !== "ANSWER_ONLY" && (
            <div style={{ marginTop: "12px", padding: "10px", border: "1px solid #d8e2ef", borderRadius: "6px", background: "#fbfdff" }}>
              <div className={sty.sidebarSubtitle}>AI action preview</div>
              <div className={sty.sidebarText} style={{ fontSize: "12px", lineHeight: 1.5 }}>
                <div><strong>Action:</strong> {result.action.type}</div>
                {result.action.profile && <div><strong>Profile:</strong> {result.action.profile}</div>}
                {result.action.profileInference?.reason && (
                  <div>
                    <strong>Profile match:</strong>{" "}
                    {result.action.profileInference.isApproximation ? "Approximate match" : "Direct match"}
                    {Number.isFinite(Number(result.action.profileInference.confidence))
                      ? ` (${Math.round(Number(result.action.profileInference.confidence) * 100)}%)`
                      : ""}
                    <br />
                    {result.action.profileInference.reason}
                  </div>
                )}
                {result.action.city && <div><strong>City:</strong> {result.action.city}</div>}
                {result.action.locationText && <div><strong>Location:</strong> {result.action.locationText}</div>}
                {Array.isArray(result.action.coordinates) && (
                  <div><strong>Coordinates:</strong> {formatLonLat(result.action.coordinates)}</div>
                )}
                {result.action.walkingTime && <div><strong>Walking time:</strong> {result.action.walkingTime} min</div>}
                {result.action.walkingSpeed && <div><strong>Walking speed:</strong> {result.action.walkingSpeed} km/h</div>}
                {Array.isArray(result.action.enabledVariables) && result.action.enabledVariables.length > 0 && (
                  <div><strong>Variables:</strong> {result.action.enabledVariables.join(", ")}</div>
                )}
              </div>
              {result.action.layerValues && Object.keys(result.action.layerValues).length > 0 && (
                <pre className={sty.agentSettingsPre}>
                  {JSON.stringify(result.action.layerValues, null, 2)}
                </pre>
              )}
              {Array.isArray(result.missingDataWarnings) && result.missingDataWarnings.length > 0 && (
                <ul className={sty.agentFactorList}>
                  {result.missingDataWarnings.map((warning, index) => (
                    <li key={index} className={sty.agentFactorItem}>{warning}</li>
                  ))}
                </ul>
              )}
              {result.action.type !== "ANSWER_ONLY" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                  <button type="button" className={sty.setupButton} onClick={() => handleApplyAction({ run: false })}>
                    {result.action.requiresStartPoint ? "Apply settings" : "Apply action"}
                  </button>
                  <button
                    type="button"
                    className={sty.setupButton}
                    onClick={() => handleApplyAction({ run: true })}
                    disabled={!Array.isArray(result.action.coordinates)}
                    style={{ backgroundColor: Array.isArray(result.action.coordinates) ? "#1976d2" : "#9ca3af", color: "#fff" }}
                  >
                    {result.action.requiresStartPoint ? "Select start point first" : "Apply and run"}
                  </button>
                </div>
              )}
            </div>
          )}

          {result.alternativeAction && (
            <div style={{ marginTop: "12px", padding: "10px", border: "1px solid #f0c36d", borderRadius: "6px", background: "#fffaf0" }}>
              <div className={sty.sidebarSubtitle}>Alternative CAT analysis</div>
              <div className={sty.sidebarText} style={{ fontSize: "12px", lineHeight: 1.5 }}>
                <div><strong>Purpose:</strong> related catchment/accessibility-area analysis, not a direct answer to the original request.</div>
                {result.alternativeAction.limitation && <div><strong>Boundary:</strong> {result.alternativeAction.limitation}</div>}
                {result.alternativeAction.profile && <div><strong>Profile:</strong> {result.alternativeAction.profile}</div>}
                {result.alternativeAction.locationText && <div><strong>Start point:</strong> {result.alternativeAction.locationText}</div>}
                {Array.isArray(result.alternativeAction.coordinates) && (
                  <div><strong>Coordinates:</strong> {formatLonLat(result.alternativeAction.coordinates)}</div>
                )}
                {result.alternativeAction.walkingTime && <div><strong>Walking time:</strong> {result.alternativeAction.walkingTime} min</div>}
                {result.alternativeAction.walkingSpeed && <div><strong>Walking speed:</strong> {result.alternativeAction.walkingSpeed} km/h</div>}
                {Array.isArray(result.alternativeAction.enabledVariables) && result.alternativeAction.enabledVariables.length > 0 && (
                  <div><strong>Variables:</strong> {result.alternativeAction.enabledVariables.join(", ")}</div>
                )}
              </div>
              {result.alternativeAction.layerValues && Object.keys(result.alternativeAction.layerValues).length > 0 && (
                <pre className={sty.agentSettingsPre}>
                  {JSON.stringify(result.alternativeAction.layerValues, null, 2)}
                </pre>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                <button type="button" className={sty.setupButton} onClick={() => handleApplyAlternativeAction({ run: false })}>
                  Apply alternative settings
                </button>
                <button
                  type="button"
                  className={sty.setupButton}
                  onClick={() => handleApplyAlternativeAction({ run: true })}
                  disabled={!Array.isArray(result.alternativeAction.coordinates)}
                  style={{ backgroundColor: Array.isArray(result.alternativeAction.coordinates) ? "#b7791f" : "#9ca3af", color: "#fff" }}
                >
                  {result.alternativeAction.requiresStartPoint ? "Select start point first" : "Run alternative catchment analysis"}
                </button>
              </div>
            </div>
          )}

          {/* 区域推荐模式 */}
          {legacyMode === "region_recommendation" && (
            <div>
              <div className={sty.sidebarText} style={{ whiteSpace: "pre-wrap" }}>
                {result.reply}
              </div>
              {result.recommendedRegions && result.recommendedRegions.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div className={sty.sidebarSubtitle}>推荐区域列表</div>
                  <ul className={sty.agentFactorList}>
                    {result.recommendedRegions.map((region, idx) => (
                      <li key={idx} className={sty.agentFactorItem}>
                        <strong>{region.name}</strong> (得分: {region.score}/100)
                        <br />
                        {region.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 点位查询模式 */}
          {(!legacyMode || legacyMode === "point_analysis") && (
            <div>
              <div className={sty.sidebarText}>{result.reply}</div>
              {typeof result.score === "number" && (
                <div className={sty.sidebarTextBold}>AI 估计可达性得分：{result.score}/100</div>
              )}
              {Array.isArray(result.factors) && result.factors.length > 0 && (
                <div>
                  <div className={sty.sidebarSubtitle}>关键因素</div>
                  <ul className={sty.agentFactorList}>
                    {result.factors.map((factor, index) => (
                      <li key={index} className={sty.agentFactorItem}>
                        <strong>{factor.name}：</strong>
                        {factor.value}，{factor.explain || factor.impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 推荐参数 */}
          {result.suggestedSettings && Object.keys(result.suggestedSettings).length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div className={sty.sidebarSubtitle}>推荐参数</div>
              <pre className={sty.agentSettingsPre}>
                {JSON.stringify(result.suggestedSettings, null, 2)}
              </pre>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className={sty.setupButton} onClick={handleApply}>
                  应用推荐参数
                </button>
                <button type="button" className={sty.setupButton} onClick={handleApplyAndRun} style={{ backgroundColor: '#1976d2', color: '#fff' }}>
                  应用并运行真实计算
                </button>
              </div>
            </div>
          )}

          {/* 运行真实计算按钮 */}
          {result.askRealComputation && legacyMode === "point_analysis" && startPoint && (
            <div style={{ marginTop: "12px" }}>
              <button 
                type="button" 
                className={sty.setupButton}
                onClick={handleRunRealComputation}
                style={{ backgroundColor: "#4CAF50" }}
              >
                🔧 运行真实计算（基于路网）
              </button>
              <div className={sty.sidebarText} style={{ fontSize: "12px", marginTop: "8px", color: "#666" }}>
                ⚠️ 当前结果为启发式估计。点击此按钮将调用 pgRouting 进行精确的路网可达性计算。
              </div>
            </div>
          )}

          {/* 渲染 references（支持结论的参考资料） */}
          {result.references && result.references.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div className={sty.sidebarSubtitle}>参考资料</div>
              <ul className={sty.agentFactorList}>
                {result.references.map((ref, i) => (
                  <li key={i} className={sty.agentFactorItem}>
                    <strong>{ref.description}</strong>：{ref.count} 个
                    {ref.sampleHighlights && ref.sampleHighlights.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>示例要素 id: {ref.sampleHighlights.join(', ')}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.ragResults && result.ragResults.length > 0 && (
            <div style={{ marginTop: '12px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
              <div className={sty.sidebarSubtitle}>RAG 检索结果</div>
              <div className={sty.sidebarText} style={{ fontSize: '12px', marginBottom: '8px' }}>
                以下是基于你的问题从本地 CAT 知识库检索到的相关文本知识，用于检查检索质量。
              </div>
              <ul className={sty.agentFactorList}>
                {result.ragResults.map((doc, idx) => (
                  <li key={doc.id || idx} className={sty.agentFactorItem}>
                    <strong>{idx + 1}. {doc.description}</strong>（score: {Number(doc.score).toFixed(3)}）
                    <div style={{ fontSize: '12px', color: '#444', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{doc.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 区域推荐后的"选择起点"提示 */}
          {legacyMode === "region_recommendation" && (
            <div style={{ marginTop: "12px", backgroundColor: "#f0f8ff", padding: "8px", borderRadius: "4px" }}>
              <div className={sty.sidebarSubtitle}>下一步</div>
              <div className={sty.sidebarText} style={{ fontSize: "13px" }}>
                在地图上选择推荐区域附近作为起点，或使用下列按钮将推荐区域设为起点并直接运行真实计算。
              </div>
              {result.recommendedRegions && result.recommendedRegions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {result.recommendedRegions.map((region, idx) => (
                    <div key={region.id || idx} style={{ marginBottom: '8px', padding: '6px', background: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                      <div style={{ fontWeight: '600' }}>{region.name} （得分 {region.score}/100）</div>
                      <div style={{ fontSize: '12px', color: '#444' }}>{region.description}</div>
                      {formatLonLat(region.center) && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          Computation start point: {formatLonLat(region.center)}
                        </div>
                      )}
                      <div style={{ marginTop: '6px' }}>
                        <button type="button" className={sty.setupButton} onClick={() => handleSelectRegionAndRun(region)}>
                          设为起点并运行真实计算
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
