import React, { useState } from "react";
import { useTranslation } from "next-i18next";
import sty from "./Sidebar.module.css";

let agentPanelMemory = {
  chatMessages: [],
  conversationHistory: [],
  analysisHistory: [],
  lastAgentContext: null,
};

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
  onSelectStartSuggestion,
  onReviewFactorsSuggestion,
  onResponse,
}) {
  const [prompt, setPrompt] = useState("");
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [realComputationStatus, setRealComputationStatus] = useState(null);
  const [lastRealComputation, setLastRealComputation] = useState(null);
  const [lastAgentContext, setLastAgentContext] = useState(() => agentPanelMemory.lastAgentContext);
  const [conversationHistory, setConversationHistory] = useState(() => agentPanelMemory.conversationHistory);
  const [analysisHistory, setAnalysisHistory] = useState(() => agentPanelMemory.analysisHistory);
  const [chatMessages, setChatMessages] = useState(() => agentPanelMemory.chatMessages);
  const [pendingCompareAction, setPendingCompareAction] = useState(null);
  const [showExamples, setShowExamples] = useState(() => agentPanelMemory.chatMessages.length === 0);
  const [preparedActionKey, setPreparedActionKey] = useState(null);
  const [streamingReply, setStreamingReply] = useState("");
  const [streamingStatus, setStreamingStatus] = useState("");
  const lastSubmittedQuestionRef = React.useRef(null);
  const recordedAnalysisSignaturesRef = React.useRef(new Set(agentPanelMemory.analysisHistory.map((record) => record.signature).filter(Boolean)));
  const analysisHistoryRef = React.useRef([]);
  const lastAgentContextRef = React.useRef(null);
  const pendingCompareActionRef = React.useRef(null);
  const sendRequestRef = React.useRef(null);
  const pendingExplainAfterRunRef = React.useRef(false);
  const pendingExpectedAnalysisCountRef = React.useRef(1);
  const pendingRunMetadataStartIndexRef = React.useRef(0);
  const pendingExplainTimerRef = React.useRef(null);
  const pendingCompareStartSelectionRef = React.useRef(null);
  const chatBoxRef = React.useRef(null);
  const hasResultMetadata = Array.isArray(resultMetadata) && resultMetadata.length > 0;
  const hasCurrentStartPoint = Array.isArray(startPoint) && startPoint.length === 2;

  React.useEffect(() => {
    agentPanelMemory.conversationHistory = conversationHistory.slice(-20);
  }, [conversationHistory]);

  React.useEffect(() => {
    agentPanelMemory.analysisHistory = analysisHistory.slice(-20);
    analysisHistoryRef.current = analysisHistory;
  }, [analysisHistory]);

  React.useEffect(() => {
    agentPanelMemory.lastAgentContext = lastAgentContext;
    lastAgentContextRef.current = lastAgentContext;
  }, [lastAgentContext]);

  React.useEffect(() => {
    agentPanelMemory.chatMessages = chatMessages.slice(-30);
  }, [chatMessages]);

  React.useEffect(() => {
    if (!chatBoxRef.current) return;
    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chatMessages, streamingReply]);

  React.useEffect(() => {
    pendingCompareActionRef.current = pendingCompareAction;
  }, [pendingCompareAction]);

  React.useEffect(() => () => {
    if (pendingExplainTimerRef.current) {
      window.clearTimeout(pendingExplainTimerRef.current);
    }
  }, []);

  const pointKey = React.useCallback((point) => (
    Array.isArray(point) && point.length === 2
      ? point.map((value) => Number(value).toFixed(6)).join(",")
      : ""
  ), []);

  const getComparePromptCopy = React.useCallback((language = "en") => {
    if (language === "zh") {
      return {
        ready: "我看到了新的起点。为了和上一个结果公平比较，我可以沿用刚才的环境因素设置，在这里运行一次分析。",
        question: "运行后，请比较这个起点和上一个结果。",
        run: "运行可达性分析",
      };
    }
    if (language === "de") {
      return {
        ready: "Ich sehe den neuen Startpunkt. Fuer einen fairen Vergleich mit dem vorherigen Ergebnis kann ich hier mit denselben Komforteinstellungen eine Analyse starten.",
        question: "Vergleiche diesen Startpunkt nach der Analyse mit dem vorherigen Ergebnis.",
        run: "Erreichbarkeitsanalyse starten",
      };
    }
    return {
      ready: "I see the new start point. To compare it fairly with the previous result, I can run the analysis here using the same comfort settings.",
      question: "After running it, compare this start point with the previous result.",
      run: "Run the accessibility analysis",
    };
  }, []);

  const buildCompareCurrentPointAction = React.useCallback((point, baseAnalysis) => {
    if (!Array.isArray(point) || point.length !== 2 || !baseAnalysis) return null;
    const settings = baseAnalysis.settings || {};
    const variables = settings.variables || settings.layerValues || baseAnalysis.adjusted?.values || {};
    return {
      type: "RUN_ANALYSIS_THEN_COMPARE",
      baseAnalysisId: baseAnalysis.id,
      useSameSettingsAs: baseAnalysis.id,
      settingsSource: "previous_analysis",
      targetPoint: { lon: Number(point[0]), lat: Number(point[1]), label: t("agent_current_map_start_point") },
      coordinates: [Number(point[0]), Number(point[1])],
      city: baseAnalysis.city || selectedCity,
      profile: baseAnalysis.profile || agentProfile?.id || agentProfile?.presetId || "default_adult",
      walkingTime: Number(settings.walkingTime || walkingTime || 15),
      walkingSpeed: Number(settings.walkingSpeed || walkingSpeed || 5),
      enabledVariables: Array.isArray(settings.enabledVariables)
        ? settings.enabledVariables
        : Object.keys(variables || {}),
      layerValues: variables || {},
      afterRun: {
        type: "COMPARE_WITH_BASE_ANALYSIS",
        baseAnalysisId: baseAnalysis.id,
      },
      requiresStartPoint: false,
      canRunNow: true,
      nextStep: "apply_same_settings_run_then_compare",
      missingDataWarnings: [],
    };
  }, [agentProfile, selectedCity, t, walkingSpeed, walkingTime]);

  React.useEffect(() => {
    const pending = pendingCompareStartSelectionRef.current;
    if (!pending) return;
    const currentKey = pointKey(startPoint);
    if (!currentKey || currentKey === pending.previousPointKey) return;
    const fallbackMetadata = Array.isArray(resultMetadata)
      ? [...resultMetadata].reverse().find((item) => {
          const itemPoint = Array.isArray(item?.startPoint) && item.startPoint.length === 2 ? item.startPoint : null;
          return itemPoint && pointKey(itemPoint) !== currentKey;
        })
      : null;
    const fallbackAnalysis = fallbackMetadata
      ? {
          id: `result_${fallbackMetadata.groupIndex ?? "latest"}_${fallbackMetadata.subIndex ?? "weighted"}`,
          city: selectedCity,
          profile: agentProfile?.id || agentProfile?.presetId || fallbackMetadata.profile || "default_adult",
          startPoint: fallbackMetadata.startPoint,
          resultMetadata: fallbackMetadata,
          settings: {
            walkingTime,
            walkingSpeed,
            enabledVariables: Array.isArray(enabledVariables) ? enabledVariables : Object.keys(layerValues || {}),
            layerValues: fallbackMetadata.values || layerValues || {},
          },
        }
      : null;
    const baseAnalysis = analysisHistoryRef.current.find((item) => item.id === pending.baseAnalysisId) ||
      analysisHistoryRef.current[analysisHistoryRef.current.length - 1] ||
      fallbackAnalysis ||
      null;
    const compareAction = buildCompareCurrentPointAction(startPoint, baseAnalysis);
    if (!compareAction) return;
    compareAction.responseLanguage = pending.responseLanguage || lastAgentContextRef.current?.responseLanguage || "en";
    const compareCopy = getComparePromptCopy(compareAction.responseLanguage);
    pendingCompareStartSelectionRef.current = null;
    const promptMessage = {
      id: `assistant_compare_prompt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: "assistant",
      content: compareCopy.ready,
      result: {
        action: compareAction,
        alternativeAction: null,
        missingDataWarnings: [],
        nextSteps: [
          {
            id: "action_run_current_start_compare",
            type: "action",
            label: compareCopy.run,
            action: "run_analysis",
            actionRef: "action",
            actionRole: "primary",
            appliesSettings: true,
            requiresStartPoint: false,
            canRunNow: true,
            willChange: ["analysis_result", "comparison_result"],
          },
          {
            id: "question_compare_after_run",
            type: "question",
            label: compareCopy.question,
            prompt: compareCopy.question,
          },
        ],
      },
      suggestions: [
        {
          id: "action_run_current_start_compare",
          type: "action",
          label: compareCopy.run,
          action: "run_analysis",
          actionRef: "action",
          actionRole: "primary",
          appliesSettings: true,
          requiresStartPoint: false,
          canRunNow: true,
          willChange: ["analysis_result", "comparison_result"],
        },
        {
          id: "question_compare_after_run",
          type: "question",
          label: compareCopy.question,
          prompt: compareCopy.question,
        },
      ],
    };
    setResult(promptMessage.result);
    setChatMessages((prev) => [...prev, promptMessage].slice(-30));
    setRealComputationStatus(compareCopy.ready);
  }, [agentProfile, buildCompareCurrentPointAction, enabledVariables, getComparePromptCopy, layerValues, pointKey, resultMetadata, selectedCity, startPoint, walkingSpeed, walkingTime]);

  const buildAnalysisRecord = React.useCallback((metadataItems) => {
    if (!Array.isArray(metadataItems) || metadataItems.length === 0) return null;
    const weighted = [...metadataItems].reverse().find((item) => item && !item.isDefault);
    const baseline = weighted
      ? [...metadataItems].reverse().find((item) => item?.isDefault && item.groupIndex === weighted.groupIndex)
      : [...metadataItems].reverse().find((item) => item?.isDefault);
    const latest = weighted || baseline;
    if (!latest) return null;
    const point = Array.isArray(latest.startPoint) && latest.startPoint.length === 2
      ? latest.startPoint
      : Array.isArray(startPoint) && startPoint.length === 2
        ? startPoint
        : null;
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
        pendingExplainAfterRunRef.current = false;
        void sendRequestRef.current?.("Compare the latest CAT result with the previous analysis.", {
          analysisHistoryOverride: nextHistory,
          agentContext: {
            originalUserQuestion: lastAgentContextRef.current?.originalUserQuestion || pendingAction.originalUserQuestion || "follow-up comparison",
            originalIntent: "compare_with_previous_result",
          },
        });
        return;
      }
    }
    if (pendingExplainAfterRunRef.current) {
      const latestMetadata = Array.isArray(resultMetadata) ? resultMetadata[resultMetadata.length - 1] : null;
      const expectedCount = Math.max(1, pendingExpectedAnalysisCountRef.current || 1);
      const newMetadata = Array.isArray(resultMetadata)
        ? resultMetadata.slice(pendingRunMetadataStartIndexRef.current)
        : [];
      const completedCount = newMetadata
        .filter((item) => enabledVariables.length > 0 ? item && !item.isDefault : item?.isDefault).length;
      const shouldWaitForWeightedResult = Array.isArray(enabledVariables) &&
        enabledVariables.length > 0 &&
        (latestMetadata?.isDefault === true || completedCount < expectedCount);
      if (shouldWaitForWeightedResult) return;
      if (pendingExplainTimerRef.current) {
        window.clearTimeout(pendingExplainTimerRef.current);
      }
      pendingExplainTimerRef.current = window.setTimeout(() => {
        pendingExplainAfterRunRef.current = false;
        pendingExplainTimerRef.current = null;
        const shouldCompareMultiple = expectedCount > 1 && nextHistory.length >= 2;
        void sendRequestRef.current?.(
          shouldCompareMultiple ? "Compare all selected CAT analysis results." : "Explain the latest CAT result.",
          {
            analysisHistoryOverride: nextHistory,
            agentContext: {
              ...(lastAgentContextRef.current || {}),
              originalUserQuestion: lastAgentContextRef.current?.originalUserQuestion || lastSubmittedQuestionRef.current || "explain latest result after analysis",
              originalIntent: shouldCompareMultiple ? "compare_all_selected_results_after_run" : "explain_result_after_run",
            },
          }
        );
      }, 700);
    }
  }, [buildAnalysisRecord, enabledVariables, resultMetadata]);

  const getActionConclusion = (action) => {
    if (!action || action.type === "ANSWER_ONLY") return "";
    if ((action.requiresStartPoint || action.type === "ASK_USER_TO_SELECT_POINT") && hasCurrentStartPoint) {
      return t("agent_settings_advice_ready_to_run");
    }
    if (action.requiresStartPoint || action.type === "ASK_USER_TO_SELECT_POINT") {
      return t("agent_settings_advice_select_start");
    }
    if (action.canRunNow || Array.isArray(action.coordinates)) {
      return t("agent_settings_advice_ready_to_run");
    }
    return t("agent_settings_advice_review");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!String(prompt || "").trim()) return;
    setShowExamples(false);
    setError(null);
    setLoading(true);
    setStreamingReply("");
    setStreamingStatus("");
    setRealComputationStatus(null);
    setLastRealComputation(null);
    await sendRequest(prompt);
  };

  async function sendRequest(overridePrompt, options = {}) {
    const p = typeof overridePrompt === "string" ? overridePrompt : prompt;
    if (!String(p || "").trim()) return;
    lastSubmittedQuestionRef.current = p;
    const outgoingConversation = options.conversationHistoryOverride || conversationHistory;
    const outgoingAnalysisHistory = options.analysisHistoryOverride || analysisHistory;
    setError(null);
    setLoading(true);
    setStreamingReply("");
    setStreamingStatus("");
    setRealComputationStatus(null);
    setLastRealComputation(null);
    const userMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: "user",
      content: p,
    };
    setChatMessages((prev) => [...prev, userMessage].slice(-30));
    setPrompt("");
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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
          analysisHistory: outgoingAnalysisHistory.slice(-20),
          stream: true
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Agent API 请求失败");
      }
      let data = null;
      const contentType = response.headers.get("content-type") || "";
      if (response.body && contentType.includes("text/event-stream")) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const rawEvent of events) {
            const eventName = rawEvent.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
            const dataLine = rawEvent.match(/^data:\s*(.+)$/m)?.[1];
            if (!dataLine) continue;
            const payload = JSON.parse(dataLine);
            if (eventName === "status") {
              setStreamingStatus(payload.message || "");
            } else if (eventName === "reply_delta") {
              setStreamingReply((prev) => `${prev}${payload.text || ""}`);
            } else if (eventName === "final") {
              data = payload;
            } else if (eventName === "error") {
              throw new Error(payload.message || "Agent stream failed");
            }
          }
        }
      } else {
        data = await response.json();
        setStreamingReply(data.reply || "");
      }
      if (!data) {
        throw new Error("Agent stream ended before returning a final result");
      }
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
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: "assistant",
          content: data.reply || "",
          result: uiData,
          suggestions: Array.isArray(uiData.nextSteps)
            ? uiData.nextSteps
            : Array.isArray(uiData.followUpSuggestions)
              ? uiData.followUpSuggestions
              : Array.isArray(uiData.followUpQuestions)
              ? uiData.followUpQuestions.map((question) => ({ type: "question", label: question, prompt: question }))
              : [],
        },
      ].slice(-30));
      setStreamingReply("");
      setStreamingStatus("");
      setPreparedActionKey(null);
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
          responseLanguage: data.detected?.responseLanguage || data.detected?.language || "en",
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
      setStreamingStatus("");
    }
  }
  sendRequestRef.current = sendRequest;

  const focusAgentTarget = (targetId) => {
    if (typeof document === "undefined" || !targetId) return false;
    const element = document.getElementById(targetId);
    if (!element) return false;
    element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  const handleFollowUpQuestion = (question) => {
    if (!question || loading) return;
    setPrompt(question);
    setShowExamples(false);
    void sendRequest(question);
  };

  const appendAssistantStatusMessage = (content) => {
    if (!content) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `assistant_status_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role: "assistant",
        content,
        kind: "status",
      },
    ].slice(-30));
  };

  const resolveActionForSuggestion = (suggestion, sourceResult = result) => {
    const ref = suggestion?.actionRef || suggestion?.targetAction || suggestion?.payload?.actionRef;
    if (ref === "alternativeAction") {
      return {
        action: sourceResult?.alternativeAction || null,
        alternative: true,
      };
    }
    if (ref === "action") {
      return {
        action: sourceResult?.action || null,
        alternative: false,
      };
    }
    if (sourceResult?.action && sourceResult.action.type !== "ANSWER_ONLY") {
      return { action: sourceResult.action, alternative: false };
    }
    if (sourceResult?.alternativeAction && sourceResult.alternativeAction.type !== "ANSWER_ONLY") {
      return { action: sourceResult.alternativeAction, alternative: true };
    }
    return { action: null, alternative: false };
  };

  const handleNewConversation = () => {
    agentPanelMemory = {
      chatMessages: [],
      conversationHistory: [],
      analysisHistory: [],
      lastAgentContext: null,
    };
    setChatMessages([]);
    setConversationHistory([]);
    setAnalysisHistory([]);
    setLastAgentContext(null);
    setResult(null);
    setPrompt("");
    setStreamingReply("");
    setStreamingStatus("");
    setRealComputationStatus(null);
    setPendingCompareAction(null);
    recordedAnalysisSignaturesRef.current = new Set();
    analysisHistoryRef.current = [];
    setShowExamples(true);
  };

  const handleFollowUpSuggestion = (suggestion, sourceResult = result) => {
    if (!suggestion || loading) return;
    if (sourceResult) setResult(sourceResult);
    if (suggestion.type === "question") {
      handleFollowUpQuestion(suggestion.prompt || suggestion.label);
      return;
    }

    const action = suggestion.action;
    if (action === "apply_settings_select_start") {
      const resolved = resolveActionForSuggestion(suggestion, sourceResult);
      if (resolved.action && resolved.action.type !== "ANSWER_ONLY") {
        executeAgentAction(resolved.action, { run: false, alternative: resolved.alternative });
      }
      const didHandle = onSelectStartSuggestion?.({ another: false });
      focusAgentTarget("map-region") || focusAgentTarget("map") || focusAgentTarget("sidebar");
      const statusText = didHandle === false
        ? t("agent_suggestion_select_start")
        : t(resolved.alternative ? "agent_chat_status_alt_settings_select_start" : "agent_chat_status_settings_select_start");
      setRealComputationStatus(statusText);
      appendAssistantStatusMessage(statusText);
      return;
    }

    if (action === "run_analysis") {
      const resolved = resolveActionForSuggestion(suggestion, sourceResult);
      if (resolved.action && resolved.action.type !== "ANSWER_ONLY") {
        executeAgentAction(resolved.action, { run: true, alternative: resolved.alternative });
        appendAssistantStatusMessage(t(resolved.alternative ? "agent_chat_status_alt_run_requested" : "agent_chat_status_run_requested"));
      } else {
        handleRunRealComputation();
        appendAssistantStatusMessage(t("agent_chat_status_run_requested"));
      }
      return;
    }

    if (action === "apply_settings") {
      const resolved = resolveActionForSuggestion(suggestion, sourceResult);
      if (resolved.action && resolved.action.type !== "ANSWER_ONLY") {
        executeAgentAction(resolved.action, { run: false, alternative: resolved.alternative });
      }
      const statusText = t(resolved.alternative ? "agent_status_alt_settings_applied" : "agent_status_settings_applied");
      setRealComputationStatus(statusText);
      appendAssistantStatusMessage(statusText);
      return;
    }

    if (action === "review_comfort_factors") {
      const didHandle = onReviewFactorsSuggestion?.();
      focusAgentTarget("sidebar");
      const statusText = didHandle === false
        ? t("agent_suggestion_review_factors")
        : t("agent_chat_status_review_factors");
      setRealComputationStatus(statusText);
      appendAssistantStatusMessage(statusText);
      return;
    }

    if (action === "select_start_point" || action === "select_another_start_point") {
      if (action === "select_another_start_point") {
        const latestAnalysis = analysisHistoryRef.current[analysisHistoryRef.current.length - 1] || null;
        pendingCompareStartSelectionRef.current = {
          baseAnalysisId: latestAnalysis?.id || null,
          previousPointKey: pointKey(startPoint),
          responseLanguage: lastAgentContextRef.current?.responseLanguage || result?.detected?.responseLanguage || result?.detected?.language || "en",
        };
      }
      const didHandle = onSelectStartSuggestion?.({ another: action === "select_another_start_point" });
      focusAgentTarget("map-region") || focusAgentTarget("map") || focusAgentTarget("sidebar");
      const statusText = didHandle === false
        ? (
            action === "select_another_start_point"
              ? t("agent_suggestion_select_another_start")
              : t("agent_suggestion_select_start")
          )
        : (
            action === "select_another_start_point"
              ? t("agent_chat_status_select_another_start")
              : t("agent_chat_status_select_start")
          );
      setRealComputationStatus(statusText);
      appendAssistantStatusMessage(statusText);
    }
  };

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

  const getActionKey = (action, kind = "primary") => {
    if (!action) return "";
    return `${kind}:${JSON.stringify({
      type: action.type,
      profile: action.profile,
      city: action.city,
      walkingSpeed: action.walkingSpeed,
      walkingTime: action.walkingTime,
      enabledVariables: action.enabledVariables,
      layerValues: action.layerValues,
      requiresStartPoint: action.requiresStartPoint,
    })}`;
  };

  const executeAgentAction = (action, { run = false, alternative = false } = {}) => {
    if (!action) return;
    if (!run) {
      setPreparedActionKey(getActionKey(action, alternative ? "alternative" : "primary"));
    }
    if (run && actionNeedsStartPoint(action) && !canRunActionWithCurrentPoint(action)) {
      pendingExplainAfterRunRef.current = false;
      setRealComputationStatus(alternative
        ? t("agent_status_alt_select_start")
        : t("agent_status_select_start_or_region"));
      return;
    }
    const validStartPoints = Array.isArray(startPoints)
      ? startPoints.filter((point) => Array.isArray(point) && point.length === 2)
      : [];
    if (run && !Array.isArray(action.coordinates) && validStartPoints.length > 1) {
      const didApply = onExecuteAgentAction?.(action, { run: false });
      if (didApply === false) {
        pendingExplainAfterRunRef.current = false;
        setRealComputationStatus(alternative
          ? t("agent_status_alt_select_start")
          : t("agent_status_check_action"));
        return;
      }
      const didRunAll = onRunRealComputation?.({ runAllStartPoints: true });
      pendingExpectedAnalysisCountRef.current = validStartPoints.length;
      pendingRunMetadataStartIndexRef.current = Array.isArray(resultMetadata) ? resultMetadata.length : 0;
      pendingExplainAfterRunRef.current = didRunAll !== false;
      setLastRealComputation(
        didRunAll === false
          ? null
          : {
              type: "multi_start_points",
              label: `${validStartPoints.length} selected start points`,
              center: validStartPoints[validStartPoints.length - 1],
            }
      );
      setRealComputationStatus(
        didRunAll === false
          ? t("agent_status_select_start_or_region")
          : t("agent_status_real_computation_started")
      );
      return;
    }
    const runnableAction = run && !Array.isArray(action.coordinates) && hasCurrentStartPoint
      ? {
          ...action,
          coordinates: startPoint,
          requiresStartPoint: false,
          canRunNow: true,
          locationText: action.locationText || t("agent_current_map_start_point"),
        }
      : action;
    if (run && runnableAction.type === "RUN_ANALYSIS_THEN_COMPARE") {
      setPendingCompareAction({
        ...runnableAction,
        originalUserQuestion: lastSubmittedQuestionRef.current,
      });
    }
    const didExecute = onExecuteAgentAction?.(runnableAction, { run });
    if (didExecute === false) {
      if (run) pendingExplainAfterRunRef.current = false;
      setRealComputationStatus(alternative
        ? t("agent_status_alt_select_start")
        : t("agent_status_check_action"));
      return;
    }
    if (run && runnableAction.coordinates) {
      pendingExpectedAnalysisCountRef.current = 1;
      pendingRunMetadataStartIndexRef.current = Array.isArray(resultMetadata) ? resultMetadata.length : 0;
      pendingExplainAfterRunRef.current = true;
      setLastRealComputation({
        type: alternative ? "alternative_agent_action" : "agent_action",
        label: runnableAction.locationText || (alternative ? "Alternative CAT start point" : "Agent selected start point"),
        center: runnableAction.coordinates
      });
      setRealComputationStatus(alternative
        ? t("agent_status_alt_run_triggered")
        : t("agent_status_run_triggered"));
    } else if (runnableAction.type === "ASK_USER_TO_SELECT_POINT") {
      setRealComputationStatus(alternative
        ? t("agent_status_alt_settings_applied")
        : t("agent_status_settings_applied"));
    } else {
      setRealComputationStatus(alternative
        ? t("agent_status_alt_action_applied")
        : t("agent_status_action_applied"));
    }
  };

  const handleRunRealComputation = ({ startPointOverride = null, region = null } = {}) => {
    const hasStartPoint = Array.isArray(startPoint) && startPoint.length === 2;
    if (!hasStartPoint && !startPointOverride) {
      setLastRealComputation(null);
      setRealComputationStatus(t("agent_status_select_start_or_region"));
      return;
    }

    window.setTimeout(() => {
      const didRun = onRunRealComputation?.({ startPointOverride });
      pendingExpectedAnalysisCountRef.current = startPointOverride
        ? 1
        : Math.max(1, Array.isArray(startPoints) && startPoints.length ? startPoints.length : 1);
      pendingRunMetadataStartIndexRef.current = Array.isArray(resultMetadata) ? resultMetadata.length : 0;
      pendingExplainAfterRunRef.current = didRun !== false;
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
          ? t("agent_status_select_start_or_region")
          : t("agent_status_real_computation_started")
      );
    }, 0);
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

  const variableLabelKeys = {
    noise_wms: "display_noise",
    noise: "display_noise",
    streetlight: "display_light",
    light: "display_light",
    trafic_light_wms: "display_traffic",
    trafic_light: "display_traffic",
    traffic: "display_traffic",
    tactile_guidance: "display_tactile",
    tactile: "display_tactile",
    tree_wms: "display_tree",
    tree: "display_tree",
    green_infrastructure_wms: "display_green_inf",
    green_infrastructure: "display_green_inf",
    green: "display_green_inf",
    blue_infrastructure_wms: "display_blue_inf",
    blue: "display_blue_inf",
    transport_station_wms: "display_station",
    transport_station: "display_station",
    station: "display_station",
    sidewalk_narrow: "display_narrow",
    narrowRoads: "display_narrow",
    narrow: "display_narrow",
    wc_disabled: "display_wc",
    wcDisabled: "display_wc",
    wc: "display_wc",
    stair: "display_stair",
    obstacle: "display_obstacle",
    slope: "display_slope",
    slope_penteli: "display_slope",
    uneven_surfaces: "display_uneven",
    unevenSurface: "display_uneven",
    uneven: "display_uneven",
    poor_pavement: "display_pavement",
    poorPavement: "display_pavement",
    pavement: "display_pavement",
    kerbs_high: "display_kerb_high",
    kerbsHigh: "display_kerb_high",
    kerb: "display_kerb_high",
    facility_wms: "display_facility",
    facilities: "display_facility",
    facility: "display_facility",
    pedestrian_flow_wms: "display_pedestrian_flow",
    pedestrian_flow: "display_pedestrian_flow",
    temp_summer: "display_summer_heat",
    temp_winter: "display_winter_cold",
  };

  const getVariableLabel = (key) => {
    const normalizedKey = String(key || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase();
    const labelKey = variableLabelKeys[key] || variableLabelKeys[normalizedKey];
    return labelKey ? t(labelKey) : String(key).replace(/_/g, " ");
  };

  const profileLabelKeys = {
    elderly: "profile_elderly",
    wheelchair_user: "profile_wheelchair",
    visually_impaired: "profile_visual",
    children_family: "profile_stroller",
  };

  const getProfileLabel = (profileId) => {
    if (!profileId || profileId === "default_adult") return t("agent_general_walking_needs", { defaultValue: "general walking needs" });
    const labelKey = profileLabelKeys[profileId];
    return labelKey ? t(labelKey) : String(profileId).replace(/_/g, " ");
  };

  const getWeightBucket = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "off";
    if (numeric >= 0.75) return "high";
    if (numeric >= 0.45) return "medium";
    return "low";
  };

  const formatList = (items) => {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(t("agent_list_separator"))}${t("agent_list_last_separator")}${items[items.length - 1]}`;
  };

  const buildNaturalSettings = (actionOrSettings) => {
    if (!actionOrSettings || typeof actionOrSettings !== "object") return [];
    const layerValues = actionOrSettings.layerValues || actionOrSettings;
    const lines = [];
    if (actionOrSettings.profile) {
      lines.push(t("agent_natural_profile", { profile: getProfileLabel(actionOrSettings.profile) }));
    }
    if (actionOrSettings.walkingSpeed) {
      lines.push(t("agent_natural_speed", { speed: actionOrSettings.walkingSpeed }));
    }
    if (actionOrSettings.walkingTime) {
      lines.push(t("agent_natural_time", { time: actionOrSettings.walkingTime }));
    }
    const weightEntries = Object.entries(layerValues || {})
      .filter(([key, value]) => !["profile", "walkingSpeed", "walkingTime", "enabledVariables", "coordinates", "city", "type", "locationText"].includes(key) && Number(value) > 0)
      .slice(0, 6);
    if (weightEntries.length > 0) {
      const grouped = weightEntries.reduce((acc, [key, value]) => {
        const bucket = getWeightBucket(value);
        if (bucket !== "off") acc[bucket].push(getVariableLabel(key));
        return acc;
      }, { high: [], medium: [], low: [] });
      if (grouped.high.length) {
        lines.push(t("agent_natural_weights_high", { factors: formatList(grouped.high) }));
      }
      if (grouped.medium.length) {
        lines.push(t("agent_natural_weights_medium", { factors: formatList(grouped.medium) }));
      }
      if (grouped.low.length) {
        lines.push(t("agent_natural_weights_low", { factors: formatList(grouped.low) }));
      }
    }
    return lines;
  };

  const canRunActionWithCurrentPoint = (action) => (
    Array.isArray(action?.coordinates) || hasCurrentStartPoint
  );

  const actionNeedsStartPoint = (action) => (
    action?.requiresStartPoint || action?.type === "ASK_USER_TO_SELECT_POINT"
  );

  const getRunActionLabel = (action, fallbackRunKey = "agent_apply_and_run") => {
    const needsStartPoint = actionNeedsStartPoint(action);
    if (needsStartPoint && canRunActionWithCurrentPoint(action)) return t("agent_run_analysis");
    if (needsStartPoint) return t("agent_select_start_first");
    return t(fallbackRunKey);
  };

  const shouldOfferMoreStartPoints = (action) => (
    canRunActionWithCurrentPoint(action)
    && actionNeedsStartPoint(action)
  );

  const isActionPrepared = (action, kind = "primary") => (
    preparedActionKey === getActionKey(action, kind)
  );

  const isSettingsAction = (action) => (
    action &&
    !["ANSWER_ONLY", "COMPARE_EXISTING_RESULTS", "ASK_FOR_PREVIOUS_RESULT", "ASK_FOR_LOCATION"].includes(action.type)
  );

  const getSettingsActionForNextStep = (answerResult, suggestions = []) => {
    if (isSettingsAction(answerResult?.action)) return answerResult.action;
    const wantsAlternative = Array.isArray(suggestions) && suggestions.some((suggestion) => (
      suggestion?.actionRef === "alternativeAction" ||
      suggestion?.targetAction === "alternativeAction" ||
      suggestion?.payload?.actionRef === "alternativeAction"
    ));
    if (wantsAlternative && isSettingsAction(answerResult?.alternativeAction)) {
      return answerResult.alternativeAction;
    }
    return null;
  };

  const renderNextStepModule = (answerResult, suggestions = [], keyPrefix = "chat") => {
    const action = getSettingsActionForNextStep(answerResult, suggestions);
    const hasSettings = action && action.type !== "ANSWER_ONLY";
    const visibleSuggestions = Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    if (!hasSettings && visibleSuggestions.length === 0) return null;
    const settingWarnings = [
      ...(Array.isArray(action?.missingDataWarnings) ? action.missingDataWarnings : []),
      ...(Array.isArray(answerResult?.missingDataWarnings) ? answerResult.missingDataWarnings : []),
    ].filter((warning, index, all) => warning && all.indexOf(warning) === index);
    return (
      <div className={sty.agentFollowUpBox}>
        <div className={sty.agentFollowUpTitle}>{t("agent_follow_up_title")}</div>
        {hasSettings && (
          <div className={sty.agentNextStepSettings}>
            <div className={sty.sidebarText} style={{ fontSize: "12px", lineHeight: 1.55 }}>
              {buildNaturalSettings(action).map((line, index) => (
                <div key={`${keyPrefix}-setting-${index}`}>{line}</div>
              ))}
              <div style={{ marginTop: "6px" }}>{t("agent_apply_question")}</div>
            </div>
            {settingWarnings.length > 0 && (
              <ul className={sty.agentFactorList}>
                {settingWarnings.map((warning, index) => (
                  <li key={`${keyPrefix}-warning-${index}`} className={sty.agentFactorItem}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className={sty.agentFollowUpList}>
          {visibleSuggestions.map((suggestion) => (
            <button
              key={`${keyPrefix}:${suggestion.type || "question"}:${suggestion.action || suggestion.label || suggestion.prompt}`}
              type="button"
              className={[
                sty.agentFollowUpButton,
                (suggestion.type === "action" || suggestion.action) ? sty.agentFollowUpActionButton : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleFollowUpSuggestion(suggestion, answerResult)}
              disabled={loading}
            >
              {(suggestion.type === "action" || suggestion.action) && (
                <span className={sty.agentFollowUpType}>{t("agent_suggestion_action_label")}</span>
              )}
              <span>{suggestion.label || suggestion.prompt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getDisplayReply = (answerResult) => {
    if (!answerResult?.reply) return "";
    if (answerResult.action && answerResult.action.type !== "ANSWER_ONLY") return "";
    return String(answerResult.reply)
      .split(/\r?\n/)
      .filter((line) => {
        const text = line.trim();
        if (!text) return true;
        return ![
          /^I detected .* profile and prepared settings/i,
          /^I prepared comfort-factor settings/i,
          /^Recommended walking speed:/i,
          /^Recommended weights:/i,
          /^Profile assumptions:/i,
          /^- Profile used:/i,
          /^- Comfort weights:/i,
          /^建议画像[:：]/,
          /^推荐步行速度[:：]/,
          /^建议权重[:：]/,
          /^Empfohlenes Profil[:：]/i,
          /^Empfohlene Gehgeschwindigkeit[:：]/i,
          /^Empfohlene Gewichte[:：]/i,
        ].some((pattern) => pattern.test(text));
      })
      .join("\n")
      .trim();
  };

  return (
    <section className={sty.agentPanel} aria-label={t("agent_aria_label")}>
      <div className={sty.agentPanelHeader}>
        <span className={sty.agentPanelIcon} aria-hidden="true">AI</span>
        <div className={sty.sidebarSectionTitle}>{t("agent_title")}</div>
      </div>
      {chatMessages.length > 0 && (
        <button
          type="button"
          className={sty.agentNewChatButton}
          onClick={handleNewConversation}
          disabled={loading}
        >
          {t("agent_new_conversation")}
        </button>
      )}
      
      {showExamples && (
      <div style={{ marginBottom: "12px" }}>
        <div className={sty.sidebarText} style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
          {t("agent_examples_title")}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[t("agent_example_question_1"), t("agent_example_question_2"), t("agent_example_question_3")].map((question) => (
            <button
              key={question}
              type="button"
              className={sty.agentExampleButton}
              onClick={() => {
                setPrompt(question);
                setShowExamples(false);
              }}
            >
              <span className={sty.agentExampleSpark} aria-hidden="true">✦</span>
              {question}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className={sty.agentChatBox} aria-live="polite" ref={chatBoxRef}>
        {chatMessages.map((message) => {
          const messageResult = message.result || null;
          const isAssistant = message.role === "assistant";
          const isStatus = message.kind === "status";
          const conclusionText = isAssistant && messageResult?.action && messageResult.action.type !== "ANSWER_ONLY"
            ? getActionConclusion(messageResult.action)
            : "";
          const answerText = isAssistant && messageResult
            ? getDisplayReply(messageResult) || message.content
            : message.content;
          const suggestions = isAssistant
            ? (Array.isArray(message.suggestions) ? message.suggestions : [])
            : [];
          return (
            <div
              key={message.id}
              className={[
                sty.agentChatMessage,
                isAssistant ? sty.agentChatMessageAssistant : sty.agentChatMessageUser,
                isStatus ? sty.agentChatMessageStatus : "",
              ].filter(Boolean).join(" ")}
            >
              <div className={sty.agentChatRole}>
                {isAssistant ? t("agent_chat_assistant_label") : t("agent_chat_user_label")}
              </div>
              {conclusionText && (
                <div className={sty.agentChatConclusion}>{conclusionText}</div>
              )}
              {answerText && (
                <div className={isStatus ? sty.agentStatusText : sty.agentAnswerText}>{answerText}</div>
              )}
              {isAssistant && !isStatus && renderNextStepModule(messageResult, suggestions, message.id)}
            </div>
          );
        })}
        {loading && !streamingReply && (
          <div className={[sty.agentChatMessage, sty.agentChatMessageAssistant, sty.agentChatMessageStatus].join(" ")}>
            <div className={sty.agentChatRole}>{t("agent_chat_assistant_label")}</div>
            <div className={sty.agentThinkingLine}>{streamingStatus || t("agent_thinking_status")}</div>
          </div>
        )}
        {streamingReply && (
          <div className={[sty.agentChatMessage, sty.agentChatMessageAssistant].join(" ")}>
            <div className={sty.agentChatRole}>{t("agent_chat_assistant_label")}</div>
            {streamingStatus && (
              <div className={sty.agentThinkingLine}>{streamingStatus}</div>
            )}
            <div className={sty.agentAnswerText}>{streamingReply}</div>
          </div>
        )}
      </div>

      <form className={sty.agentForm} onSubmit={handleSubmit}>
        <textarea
          className={sty.agentInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          aria-label={t("agent_input_aria")}
        />
        <button type="submit" className={sty.agentSendButton} disabled={loading}>
          {loading ? t("agent_loading") : t("agent_send")}
        </button>
      </form>

      {error && <div className={sty.sidebarError}>{error}</div>}
      {realComputationStatus && (
        <div className={sty.sidebarText} style={{ fontSize: "12px", marginTop: "8px", color: "#444" }}>
          {realComputationStatus}
        </div>
      )}

      {false && !result && streamingReply && (
        <div className={sty.agentResultBox}>
          <div className={sty.agentAnswerText}>{streamingReply}</div>
        </div>
      )}

      {false && result && (
        <div className={sty.agentResultBox}>
          {(() => {
            const conclusionFromResult = result.conclusion || null;
            const displayReply = getDisplayReply(result);
            let conclusionText = '';
            if (result.action && result.action.type !== "ANSWER_ONLY") {
              conclusionText = getActionConclusion(result.action);
            } else if (isKnowledgeAnswer) {
              conclusionText = "";
            } else if (conclusionFromResult) {
              conclusionText = conclusionFromResult;
            } else if (legacyMode === 'region_recommendation') {
              const top = result.recommendedRegions && result.recommendedRegions[0];
              conclusionText = top
                ? t("agent_conclusion_top_region", { name: top.name, score: top.score })
                : t("agent_conclusion_no_region");
            } else if (typeof result.score === 'number') {
              conclusionText = result.score >= 60
                ? t("agent_conclusion_friendly", { score: result.score })
                : t("agent_conclusion_needs_improvement", { score: result.score });
            } else {
              conclusionText = t("agent_conclusion_unclear");
            }

            return (
              <div style={{ marginBottom: '10px' }}>
                {conclusionText && (
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: "#334155" }}>{conclusionText}</div>
                )}
                {displayReply && (
                  <div className={sty.agentAnswerText}>
                    {displayReply}
                  </div>
                )}
              </div>
            );
          })()}

          {result.action && result.action.type !== "ANSWER_ONLY" && (
            <div style={{ marginTop: "12px", padding: "10px", border: "1px solid #d8e2ef", borderRadius: "6px", background: "#fbfdff" }}>
              <div className={sty.sidebarSubtitle}>{t("agent_recommended_settings_title")}</div>
              <div className={sty.sidebarText} style={{ fontSize: "12px", lineHeight: 1.55 }}>
                {buildNaturalSettings(result.action).map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
                <div style={{ marginTop: "6px" }}>{t("agent_apply_question")}</div>
              </div>
              {Array.isArray(result.missingDataWarnings) && result.missingDataWarnings.length > 0 && (
                <ul className={sty.agentFactorList}>
                  {result.missingDataWarnings.map((warning, index) => (
                    <li key={index} className={sty.agentFactorItem}>{warning}</li>
                  ))}
                </ul>
              )}
              {result.action.type !== "ANSWER_ONLY" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                  {(() => {
                    const needsStartPoint = actionNeedsStartPoint(result.action);
                    const prepared = isActionPrepared(result.action, "primary");
                    if (needsStartPoint && !prepared) {
                      return (
                        <button type="button" className={sty.agentSecondaryActionButton} onClick={() => handleApplyAction({ run: false })}>
                          {t("agent_apply_settings")}
                        </button>
                      );
                    }
                    if (needsStartPoint && !canRunActionWithCurrentPoint(result.action)) {
                      return (
                        <button type="button" className={sty.agentPrimaryActionButton} onClick={() => handleApplyAction({ run: false })}>
                          {t("agent_select_start_first")}
                        </button>
                      );
                    }
                    return (
                      <>
                        {!needsStartPoint && (
                          <button type="button" className={sty.agentSecondaryActionButton} onClick={() => handleApplyAction({ run: false })}>
                            {t("agent_apply_action")}
                          </button>
                        )}
                        <button
                          type="button"
                          className={sty.agentPrimaryActionButton}
                          onClick={() => handleApplyAction({ run: true })}
                        >
                          {getRunActionLabel(result.action)}
                        </button>
                        {shouldOfferMoreStartPoints(result.action) && (
                          <button
                            type="button"
                            className={sty.agentSecondaryActionButton}
                            onClick={() => handleApplyAction({ run: false })}
                          >
                            {t("agent_add_start_point")}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {result.alternativeAction && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
              {(() => {
                const needsStartPoint = actionNeedsStartPoint(result.alternativeAction);
                const prepared = isActionPrepared(result.alternativeAction, "alternative");
                if (needsStartPoint && !prepared) {
                  return (
                    <button type="button" className={sty.agentSecondaryActionButton} onClick={() => handleApplyAlternativeAction({ run: false })}>
                      {t("agent_apply_settings")}
                    </button>
                  );
                }
                if (needsStartPoint && !canRunActionWithCurrentPoint(result.alternativeAction)) {
                  return (
                    <button type="button" className={sty.agentPrimaryActionButton} onClick={() => handleApplyAlternativeAction({ run: false })}>
                      {t("agent_select_start_first")}
                    </button>
                  );
                }
                return (
                  <>
                    <button
                      type="button"
                      className={sty.agentPrimaryActionButton}
                      onClick={() => handleApplyAlternativeAction({ run: true })}
                    >
                      {getRunActionLabel(result.alternativeAction, "agent_run_alternative")}
                    </button>
                    {shouldOfferMoreStartPoints(result.alternativeAction) && (
                      <button
                        type="button"
                        className={sty.agentSecondaryActionButton}
                        onClick={() => handleApplyAlternativeAction({ run: false })}
                      >
                        {t("agent_add_start_point")}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}


          {/* 推荐参数 */}
          {result.suggestedSettings && Object.keys(result.suggestedSettings).length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div className={sty.sidebarSubtitle}>{t("agent_recommended_settings_title")}</div>
              <div className={sty.sidebarText} style={{ fontSize: "12px", lineHeight: 1.55, marginBottom: "8px" }}>
                {buildNaturalSettings(result.suggestedSettings).map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
                <div style={{ marginTop: "6px" }}>{t("agent_apply_question")}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className={sty.agentSecondaryActionButton} onClick={handleApply}>
                  {t("agent_apply_recommended_settings")}
                </button>
                <button type="button" className={sty.agentPrimaryActionButton} onClick={handleApplyAndRun}>
                  {t("agent_apply_and_run_real")}
                </button>
              </div>
            </div>
          )}

          {/* 运行真实计算按钮 */}
          {result.askRealComputation && legacyMode === "point_analysis" && startPoint && (
            <div style={{ marginTop: "12px" }}>
              <button 
                type="button" 
                className={sty.agentPrimaryActionButton}
                onClick={handleRunRealComputation}
              >
                {t("agent_run_real")}
              </button>
              <div className={sty.sidebarText} style={{ fontSize: "12px", marginTop: "8px", color: "#666" }}>
                {t("agent_real_computation_hint")}
              </div>
            </div>
          )}

          {(() => {
            const suggestions = Array.isArray(result.followUpSuggestions)
              ? result.followUpSuggestions
              : Array.isArray(result.followUpQuestions)
                ? result.followUpQuestions.map((question) => ({ type: "question", label: question, prompt: question }))
                : [];
            if (!suggestions.length) return null;
            return (
            <div className={sty.agentFollowUpBox}>
              <div className={sty.agentFollowUpTitle}>{t("agent_follow_up_title")}</div>
              <div className={sty.agentFollowUpList}>
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={`${suggestion.type || "question"}:${suggestion.label || suggestion.prompt}`}
                    type="button"
                    className={[
                      sty.agentFollowUpButton,
                      suggestion.type === "action" ? sty.agentFollowUpActionButton : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleFollowUpSuggestion(suggestion)}
                    disabled={loading}
                  >
                    {suggestion.type === "action" && (
                      <span className={sty.agentFollowUpType}>{t("agent_suggestion_action_label")}</span>
                    )}
                    <span>{suggestion.label || suggestion.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
            );
          })()}


        </div>
      )}
    </section>
  );
}
