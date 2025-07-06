import React, { useState, useEffect, useRef } from "react";
import styles from "./Legend.module.css";

const variableDisplayNames = {
  noise: "Noise",
  light: "Illuminating Lights",
  tree: "Tree Shading",
  trafficLight: "Traffic Lights",
  tactile_pavement: "Tactile Support",
  temperatureSummer: "Temperature Summer",
  temperatureWinter: "Temperature Winter",
  blueinf: "Blue Infrastructure",
  greeninf: "Green Infrastructure",
  station: "Transport Stations",
  wcDisabled: "Accessible Toilets",
  narrowRoads: "Sidewalk Width (narrow)",
  ramp: "Accessible Ramps",
  stair: "Stairs",
  elevator: "Elevators",
  obstacle: "Obstacles",
  slope: "Slope",
  unevenSurface: "Uneven Surface",
  poorPavement: "Poor Pavement",
  kerbsHigh: "Kerbs (high)",
  facility: "Facilities",
  pedestrianFlow: "Pedestrian Flow",
};

const weightLevels = [0.8, 0.85, 0.9, 1];
const weightLabels = [
  "😩",
  "☹️",
  "😐",
  "🙂"
];

const Legend = ({ resultMetadata, onFocusArea }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const bodyRef = useRef(null);

  // prevent scroll on wheel event when legend is expanded
  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.stopPropagation(); 
    };

    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isExpanded]);

  const getWeightLabel = (value) => {
    const index = weightLevels.indexOf(Number(value));
    return index !== -1 ? weightLabels[index] : value;
  };

  return (
    <div className={styles["legend-container"]}>
      <div className={styles["legend-header"]} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles["legend-header-title"]}>Catchment Area Results</div>
        <div className={styles["legend-header-toggle"]}>{isExpanded ? "▼" : "▲"}</div>
      </div>

      {isExpanded && (
        <div className={styles["legend-body"]} ref={bodyRef}>
          {resultMetadata.map((entry, index) => {
            const color = entry.color;
            const features = entry.layers;
            const values = entry.values;

            return (
              <div key={index} className={styles["legend-section"]}>
                <div
                  className={styles["legend-title"]}
                  onClick={() => {
                    if (typeof onFocusArea === "function") {
                      onFocusArea(index);
                    }
                  }}
                >
                  <span
                    className={styles["legend-color-box"]}
                    style={{ backgroundColor: color }}
                  />
                  {entry.isDefault
                    ? `Default ${entry.groupIndex}`
                    : `Area ${entry.groupIndex}.${entry.subIndex}`}
                </div>

                <div>Time: {entry.time} min</div>
                <div>Speed: {entry.speed} km/h</div>
                <div>Area: {entry.area} ha</div>
                {!entry.isDefault && <div>Comfort Area Ratio: {entry.weightedRatio}</div>}

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
                  {features.length > 0 ? (
                    features.map((layer) => (
                      <div key={layer}>
                        • {variableDisplayNames[layer] || layer}: {getWeightLabel(values[layer]) ?? "N/A"}
                      </div>
                    ))
                  ) : (
                    <div className={styles["legend-none"]}>None</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Legend;
