import React from "react";
import styles from "./plasmic/saa_s_website/PlasmicUser.module.css";

export default function AccessibilityControls({
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  startPoint,
  setComputeAccessibility,
  handleResetResults
}) {
  return (
    <div className={styles["sidebar-section"]}>
      <h3 className={styles["sidebar-title"]}>Personal Accessibility Area</h3>

      <div className={styles["sidebar-text-bold"]}>
        Walking Time <span className={styles["sidebar-text"]}>({walkingTime} minutes)</span>
      </div>
      <div className={styles["sidebar-slider"]}>
        <input
          type="range"
          min="1"
          max="60"
          step="1"
          value={walkingTime}
          onChange={(e) => setWalkingTime(Number(e.target.value))}
        />
      </div>

      <div className={styles["sidebar-text-bold"]}>
        Walking Speed <span className={styles["sidebar-text"]}>({walkingSpeed} km/h)</span>
      </div>
      <div className={styles["sidebar-slider"]}>
        <input
          type="range"
          min="1"
          max="8"
          step="0.1"
          value={walkingSpeed}
          onChange={(e) => setWalkingSpeed(Number(e.target.value))}
        />
      </div>

      <div className={styles["button-container"]}>
        <button onClick={() => setSelectingStart(true)} className={styles["setup-button"]}>
          <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" alt="Location Icon" className={styles["img"]} />
          <span className={styles["sidebar-text-bold"]}>Select Start Point</span>
        </button>
      </div>

      <div className={styles["button-container"]}>
        <button
          onClick={() => {
            if (!startPoint) {
              alert("Please select a starting point first!");
              return;
            }
            setComputeAccessibility(true);
          }}
          className={styles["setup-button"]}
        >
          <span className={styles["sidebar-text-bold"]}>Get Attachment Area</span>
        </button>

        <button onClick={handleResetResults} className={styles["setup-button"]}>
          <span className={styles["sidebar-text-bold"]}>Reset</span>
        </button>
      </div>
    </div>
  );
}
