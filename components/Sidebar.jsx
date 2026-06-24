import React from "react";
import projectcss from "./plasmic/saa_s_website/PlasmicUser.module.css";
import sty from "./Sidebar.module.css";
import classNames from "classnames";
import ArrowSvgIcon from "./plasmic/saa_s_website/icons/PlasmicIcon__ArrowSvg";
import AccessibilityControls from "./Sidebar_AccessibilityControls";
import VariableControls from "./Sidebar_VariableControls";
import MapLayers from "./Sidebar_ManageLayers";
import AgentPanel from "./AgentPanel";
import { useTranslation } from "next-i18next";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  selectedLayers,
  enabledVariables,
  toggleVariable,
  toggleLayer,
  layerValues,
  availableLayers,
  handleInputChange,
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  selectingStart,
  startPoints,
  setStartPoints,
  setComputeAccessibility,
  handleResetResults,
  handleClearResult,
  handleClearVariables,
  openCategory,
  toggleCategory,
  showInfo,
  setShowInfo,
  isSearchZoom,
  setIsSearchZoom,
  city,
  cityBoundaries,
  agentProfile,
  selectedCity,
  resultMetadata,
  onApplyAgentSettings,
  onRunAgentComputation,
  onExecuteAgentAction,
}) {
  const { t } = useTranslation("common");
  const [srStatus, setSrStatus] = React.useState("");
  const [showAgentWindow, setShowAgentWindow] = React.useState(false);
  const [agentGuideTargets, setAgentGuideTargets] = React.useState([]);

  const isGuideActive = React.useCallback(
    (target) => agentGuideTargets.includes(target),
    [agentGuideTargets]
  );
  const guideTargetVariables = React.useMemo(
    () => agentGuideTargets
      .filter((target) => target.startsWith("variable:"))
      .map((target) => target.replace("variable:", "")),
    [agentGuideTargets]
  );
  const guideTargetLayers = React.useMemo(
    () => agentGuideTargets
      .filter((target) => target.startsWith("layer:"))
      .map((target) => target.replace("layer:", "")),
    [agentGuideTargets]
  );

  const pickCategoryForVariables = React.useCallback((variables = []) => {
    const envVariables = new Set(["noise", "temperatureSummer", "temperatureWinter"]);
    const psychVariables = new Set(["facility", "pedestrianFlow"]);
    const counts = variables.reduce((acc, variable) => {
      if (envVariables.has(variable)) acc.venv += 1;
      else if (psychVariables.has(variable)) acc.vpsy += 1;
      else acc.vphy += 1;
      return acc;
    }, { venv: 0, vphy: 0, vpsy: 0 });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "vphy";
  }, []);

  const pickComfortReviewCategory = React.useCallback(() => {
    const envVariables = new Set(["noise", "temperatureSummer", "temperatureWinter"]);
    const psychVariables = new Set(["facility", "pedestrianFlow"]);
    const enabled = Array.isArray(enabledVariables) ? enabledVariables : [];

    if (enabled.some((variable) => psychVariables.has(variable))) return "vpsy";
    if (enabled.some((variable) => envVariables.has(variable))) return "venv";
    return "vphy";
  }, [enabledVariables]);

  const revealAgentTarget = React.useCallback(({ target = "comfort_factors", category = null, guideTargets = [] } = {}) => {
    setSidebarOpen(true);
    if (category && openCategory !== category) {
      toggleCategory(category);
    }
    if (guideTargets.length) {
      setAgentGuideTargets(guideTargets);
    }

    window.setTimeout(() => {
      const selector = `[data-agent-target="${target}"]`;
      const element = document.querySelector(selector) || document.getElementById(target);
      if (!element) return;
      element.setAttribute("tabindex", "-1");
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      element.focus({ preventScroll: true });
    }, 80);
  }, [openCategory, setSidebarOpen, toggleCategory]);

  const updateGuideTargetsFromResponse = React.useCallback((response = {}) => {
    const targets = new Set();
    const actions = [response.action, response.alternativeAction].filter(Boolean);

    actions.forEach((action) => {
      if (!action || action.type === "ANSWER_ONLY") return;
      targets.add("comfort");
      if (action.requiresStartPoint || action.type === "ASK_USER_TO_SELECT_POINT") targets.add("start");
      if (action.canRunNow || action.type === "RUN_ACCESSIBILITY_ANALYSIS") targets.add("run");
    });

    const steps = [
      ...(Array.isArray(response.nextSteps) ? response.nextSteps : []),
      ...(Array.isArray(response.followUpSuggestions) ? response.followUpSuggestions : []),
    ];
    steps.forEach((step) => {
      const key = `${step.action || ""} ${step.uiTarget || ""} ${step.precondition || ""} ${(step.willChange || []).join(" ")}`.toLowerCase();
      if (key.includes("start")) targets.add("start");
      if (key.includes("factor") || key.includes("comfort")) targets.add("comfort");
      if (key.includes("run") || key.includes("analysis_result")) targets.add("run");
      if (key.includes("data_layers") || key.includes("map_layer")) targets.add("data");
      (step.targetVariables || []).forEach((variable) => targets.add(`variable:${variable}`));
      (step.targetLayers || []).forEach((layer) => targets.add(`layer:${layer}`));
    });

    setAgentGuideTargets(Array.from(targets));
  }, []);

  return (
    <div
      id="sidebar"
      tabIndex={-1}
      className={classNames(
        projectcss.all,
        sty.sideBarBox,
        {
          [sty.sideBarBoxsidebarOpen]: sidebarOpen,
          [sty.sideBarBoxsidebarClose]: !sidebarOpen,
        }
      )}
    >
      <p className={sty.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {srStatus}
      </p>
      <div className={sty.arrowToggleContainer}>
        <button
          className={sty.sidebarToggleButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? t("aria_collapse_sidebar") : t("aria_expand_sidebar")}
          aria-expanded={sidebarOpen}
        >
          <ArrowSvgIcon className={sty.sidebarToggleArrow} aria-hidden="true" />
        </button>
      </div>

      <div className={`${sty.freeBox} ${sidebarOpen ? sty.freeBoxsidebarOpen : ""}`}>
        <AccessibilityControls
          city={city}
          cityBoundaries={cityBoundaries}
          walkingTime={walkingTime}
          setWalkingTime={setWalkingTime}
          walkingSpeed={walkingSpeed}
          setWalkingSpeed={setWalkingSpeed}
          setSelectingStart={setSelectingStart}
          selectingStart={selectingStart}
          startPoints={startPoints}
          setStartPoints={setStartPoints}
          handleResetResults={handleResetResults}
          handleClearResult={handleClearResult}
          isSearchZoom={isSearchZoom}
          setIsSearchZoom={setIsSearchZoom}
          guideActive={isGuideActive("start")}
        />

        <VariableControls
          enabledVariables={enabledVariables}
          toggleVariable={toggleVariable}
          selectedLayers={selectedLayers}
          toggleLayer={toggleLayer}
          layerValues={layerValues}
          handleInputChange={handleInputChange}
          openCategory={openCategory}
          toggleCategory={toggleCategory}
          showInfo={showInfo}
          setShowInfo={setShowInfo}
          startPoints={startPoints}
          setComputeAccessibility={setComputeAccessibility}
          walkingTime={walkingTime}
          walkingSpeed={walkingSpeed}
          handleClearResult={handleClearResult}
          handleClearVariables={handleClearVariables}
          guideActive={isGuideActive("comfort") && guideTargetVariables.length === 0}
          runGuideActive={isGuideActive("run")}
          guideTargetVariables={guideTargetVariables}
        />

        <MapLayers
          selectedLayers={selectedLayers}
          toggleLayer={toggleLayer}
          availableLayers={availableLayers}
          isSearchZoom={isSearchZoom}
          setIsSearchZoom={setIsSearchZoom}
          guideActive={isGuideActive("data") && guideTargetLayers.length === 0}
          guideTargetLayers={guideTargetLayers}
        />
      </div>

      <div
        className={[
          sty.agentFloatingDock,
          sidebarOpen ? sty.agentFloatingDockOpen : sty.agentFloatingDockClosed,
          showAgentWindow ? sty.agentFloatingDockExpanded : sty.agentFloatingDockCollapsed,
        ].filter(Boolean).join(" ")}
      >
        <button
          type="button"
          className={showAgentWindow ? sty.agentFloatingToggleOpen : sty.agentFloatingToggle}
          onClick={() => setShowAgentWindow((open) => !open)}
          aria-label={showAgentWindow
            ? t("agent_collapse_assistant", { defaultValue: "Collapse AI assistant" })
            : t("agent_open_assistant")}
          aria-expanded={showAgentWindow}
        >
          <span className={sty.agentEntryIcon} aria-hidden="true">AI</span>
          {!showAgentWindow && <span className={sty.agentEntryText}>{t("agent_open_assistant")}</span>}
          {showAgentWindow && <span className={sty.agentFloatingCloseIcon} aria-hidden="true">x</span>}
        </button>

        {showAgentWindow && (
          <div className={sty.agentFloatingWindow}>
            <AgentPanel
              selectedCity={selectedCity}
              resultMetadata={resultMetadata}
              selectedLayers={selectedLayers}
              enabledVariables={enabledVariables}
              layerValues={layerValues}
              agentProfile={agentProfile}
              startPoint={startPoints?.[startPoints.length - 1]}
              startPoints={startPoints}
              walkingTime={walkingTime}
              walkingSpeed={walkingSpeed}
              onApplySettings={(settings) => {
                const applied = onApplyAgentSettings?.(settings);
                setAgentGuideTargets(["comfort", "start"]);
                return applied;
              }}
              onRunRealComputation={onRunAgentComputation}
              onExecuteAgentAction={(action, options) => {
                const result = onExecuteAgentAction?.(action, options);
                updateGuideTargetsFromResponse({ action });
                return result;
              }}
              onSelectStartSuggestion={() => {
                setSelectingStart(true);
                revealAgentTarget({
                  target: "start_point",
                  guideTargets: ["start"],
                });
                setSrStatus(t("sr_select_start_enabled"));
                return true;
              }}
              onReviewFactorsSuggestion={(suggestion = {}) => {
                const targetVariables = Array.isArray(suggestion.targetVariables) ? suggestion.targetVariables : [];
                revealAgentTarget({
                  target: "comfort_factors",
                  category: targetVariables.length ? pickCategoryForVariables(targetVariables) : pickComfortReviewCategory(),
                  guideTargets: [
                    "comfort",
                    ...targetVariables.map((variable) => `variable:${variable}`),
                  ],
                });
                setSrStatus(t("agent_suggestion_review_factors_active"));
                return true;
              }}
              onReviewDataLayersSuggestion={(suggestion = {}) => {
                const targetLayers = Array.isArray(suggestion.targetLayers) ? suggestion.targetLayers : [];
                revealAgentTarget({
                  target: "data_layers",
                  guideTargets: [
                    "data",
                    ...targetLayers.map((layer) => `layer:${layer}`),
                  ],
                });
                setSrStatus("Data Information layers highlighted.");
                return true;
              }}
              onGuideTargetsChange={setAgentGuideTargets}
              onResponse={updateGuideTargetsFromResponse}
            />
          </div>
        )}
      </div>
    </div>
  );
}
