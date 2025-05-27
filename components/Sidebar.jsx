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
    setComputeAccessibility,
    handleResetResults,
    openCategory,
    toggleCategory,
    showInfo,
    setShowInfo
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
            setComputeAccessibility={setComputeAccessibility}
            handleResetResults={handleResetResults}
          />
  
          <VariableControls
            selectedLayers={selectedLayers}
            toggleLayer={toggleLayer}
            layerValues={layerValues}
            handleInputChange={handleInputChange}
            openCategory={openCategory}
            toggleCategory={toggleCategory}
            showInfo={showInfo}
            setShowInfo={setShowInfo}
          />
  
          <MapLayers
            selectedLayers={selectedLayers}
            toggleLayer={toggleLayer}
            availableLayers={availableLayers}
          />
        </div>
      </div>
    );
  }
  