import React from "react";
import styles from "./plasmic/saa_s_website/PlasmicUser.module.css";
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
  handleInputChange,
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  startPoint,
  setComputeAccessibility,
  handleResetResults,
  openCategory,
  toggleCategory,
  showInfo,
  setShowInfo
}) {
  return (
    <div className={`${styles.sideBarBox} ${sidebarOpen ? styles.sideBarBoxsidebarOpen : styles.sideBarBoxsidebarClose}`}>
      <ArrowSvgIcon
        className={`${styles.svg__lhwYj} ${!sidebarOpen ? styles.svgsidebarClose__lhwYj3FoUt : ""}`}
        onClick={() => setSidebarOpen(false)}
        role="img"
      />
      <ArrowSvgIcon
        className={`${styles.svg___9Ata1} ${sidebarOpen ? styles.svgsidebarOpen___9Ata1YaBs4 : ""}`}
        onClick={() => setSidebarOpen(true)}
        role="img"
      />

      <div className={`${styles.freeBox} ${sidebarOpen ? styles.freeBoxsidebarOpen : ""}`}>
        <AccessibilityControls
          walkingTime={walkingTime}
          setWalkingTime={setWalkingTime}
          walkingSpeed={walkingSpeed}
          setWalkingSpeed={setWalkingSpeed}
          setSelectingStart={setSelectingStart}
          startPoint={startPoint}
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
        />
      </div>
    </div>
  );
}
