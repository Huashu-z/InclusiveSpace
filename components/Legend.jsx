// Legend.jsx
import React from "react";
import styles from "./Legend.module.css";

const variableDisplayNames = {
  noise: "Noise",
  light: "Illuminating Lights",
  tree: "Tree Coverage",
  trafficLight: "Traffic Lights",
  tactile_pavement: "Tactile Support",
  temperatureSummer: "Temperature Summer",
  temperatureWinter: "Temperature Winter"
};

const Legend = ({ resultMetadata, onFocusArea }) => {
  return (
    <div className={styles["legend-container"]}>
      <div className={styles["legend-main-title"]}>Catchment Area Results</div>

      {resultMetadata.map((entry, index) => {
        const color = entry.color;
        const features = entry.layers;
        const values = entry.values;

        return (
          <div key={index} className={styles["legend-section"]}>
            <div
              className={styles["legend-title"]}
              onClick={() => {
                console.log("Legend clicked:", index);
                if (typeof onFocusArea === "function") {
                  onFocusArea(index);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <span
                className={styles["legend-color-box"]}
                style={{ backgroundColor: color }}
              />
              Area {index + 1}
            </div>

            <div>Time: {entry.time} min</div>
            <div>Speed: {entry.speed} km/h</div>
            <div>Area: {entry.area} ha</div>

            {features.length > 0 ? (
              <>
                <button
                  className={styles["toggle-button"]}
                  onClick={(e) => {
                    const container = e.currentTarget.nextSibling;
                    container.style.display =
                      container.style.display === "none" ? "block" : "none";
                    e.currentTarget.innerText =
                      container.style.display === "none"
                        ? "► Comfort Features Weights"
                        : "▼ Comfort Features Weights";
                  }}
                >
                  ► Comfort Features Weights
                </button>
                <div style={{ display: "none", marginLeft: "8px" }}>
                  {features.map((layer) => (
                    <div key={layer}>
                      • {variableDisplayNames[layer] || layer}: {values[layer] ?? "N/A"}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>Comfort Features Weights: None</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Legend;
