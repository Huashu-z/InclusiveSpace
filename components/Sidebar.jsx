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
    enabledVariables={enabledVariables},
    toggleVariable={toggleVariable},
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
    const [showAgentSidebar, setShowAgentSidebar] = React.useState(false);
    return (
        <div
            id="sidebar"
            tabIndex={-1}
            className={classNames(
            projectcss.all,
            sty.sideBarBox,
            {
                [sty.sideBarBoxsidebarOpen]: sidebarOpen,
                [sty.sideBarBoxsidebarClose]: !sidebarOpen
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
          {showAgentSidebar ? (
            <>
              <button
                type="button"
                className={sty.agentBackButton}
                onClick={() => setShowAgentSidebar(false)}
              >
                <span aria-hidden="true">←</span>
                {t("agent_back_to_tools")}
              </button>
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
                onApplySettings={onApplyAgentSettings}
                onRunRealComputation={onRunAgentComputation}
                onExecuteAgentAction={onExecuteAgentAction}
                onSelectStartSuggestion={() => {
                  setSelectingStart(true);
                  setSrStatus(t("sr_select_start_enabled"));
                  return true;
                }}
                onReviewFactorsSuggestion={() => {
                  setSrStatus(t("agent_suggestion_review_factors_active"));
                  return true;
                }}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                className={sty.agentEntryButton}
                onClick={() => setShowAgentSidebar(true)}
                aria-label={t("agent_open_assistant")}
              >
                <span className={sty.agentEntryIcon} aria-hidden="true">AI</span>
                <span className={sty.agentEntryText}>{t("agent_open_assistant")}</span>
              </button>
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
                isSearchZoom = {isSearchZoom}
                setIsSearchZoom={setIsSearchZoom}
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
              />
      
              <MapLayers
                selectedLayers={selectedLayers}
                toggleLayer={toggleLayer}
                availableLayers={availableLayers}
                isSearchZoom={isSearchZoom}
                setIsSearchZoom={setIsSearchZoom}
              />
            </>
          )}
        </div>
      </div>
    );
  }
  
