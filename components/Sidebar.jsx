import React from "react";
import projectcss from "./plasmic/saa_s_website/PlasmicUser.module.css";
import sty from "./Sidebar.module.css";
import classNames from "classnames";
import ArrowSvgIcon from "./plasmic/saa_s_website/icons/PlasmicIcon__ArrowSvg";
import AccessibilityControls from "./Sidebar_AccessibilityControls";
import VariableControls from "./Sidebar_VariableControls";
import MapLayers from "./Sidebar_ManageLayers";

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
    setIsSearchZoom
  }) {
    return (
        <div
            className={classNames(
            projectcss.all,
            sty.sideBarBox,
            {
                [sty.sideBarBoxsidebarOpen]: sidebarOpen,
                [sty.sideBarBoxsidebarClose]: !sidebarOpen
            }
            )}
        >      
 
        <div className={sty.arrowToggleContainer}>
          <ArrowSvgIcon
            className={sty.sidebarToggleArrow}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            role="img"
          />
        </div>
  
        <div className={`${sty.freeBox} ${sidebarOpen ? sty.freeBoxsidebarOpen : ""}`}>
          <AccessibilityControls
            walkingTime={walkingTime}
            setWalkingTime={setWalkingTime}
            walkingSpeed={walkingSpeed}
            setWalkingSpeed={setWalkingSpeed}
            setSelectingStart={setSelectingStart}
            startPoints={startPoints}
            setStartPoints={setStartPoints}
            // setComputeAccessibility={setComputeAccessibility}
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
        </div>
      </div>
    );
  }
  