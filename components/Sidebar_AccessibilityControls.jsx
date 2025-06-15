import React from "react";
import sty from "./Sidebar.module.css";

export default function AccessibilityControls({
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  startPoints,
  setComputeAccessibility,
  handleResetResults
}) {
  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>Comfort Based Accessibility</h3>

      <div className={sty["sidebar-text-bold"]}>
        Walking Time <span className={sty["sidebar-text"]}>({walkingTime} minutes)</span>
      </div>
      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min="1"
          max="60"
          step="1"
          value={walkingTime}
          onChange={(e) => setWalkingTime(Number(e.target.value))}
        />
      </div>

      <div className={sty["sidebar-text-bold"]}>
        Walking Speed <span className={sty["sidebar-text"]}>({walkingSpeed} km/h)</span>
      </div>
      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min="2"
          max="8"
          step="0.1"
          value={walkingSpeed}
          onChange={(e) => setWalkingSpeed(Number(e.target.value))}
        />
        <div className={sty["slider-labels"]}>
          <span>Slow</span>
          <span>Normal</span>
          <span>Fast</span>
        </div>
      </div>

      <div className={sty["button-container"]}>
        <button onClick={() => setSelectingStart(true)} className={sty["setup-button"]}>
          <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" alt="Location Icon" className={sty["img"]} />
          <span className={sty["sidebar-text-bold"]}>Select Start Point</span>
        </button>
      </div>

      <div className={sty["button-container"]}>
        <button
          onClick={() => {
            if (startPoints.length === 0) {
              alert("Please select a starting point first!");
              return;
            }            
            setComputeAccessibility(true);
          }}
          className={sty["setup-button"]}
        >
          <span className={sty["sidebar-text-bold"]}>Get Catchment Area</span>
        </button>

        <button onClick={handleResetResults} className={sty["setup-button"]}>
          <span className={sty["sidebar-text-bold"]}>Reset</span>
        </button>
      </div>
    </div>
  );
}
