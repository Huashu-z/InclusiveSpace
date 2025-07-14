import React, { useState, useEffect, useRef } from "react";
import styles from "./Legend.module.css";
import { useTranslation } from 'next-i18next';


const Legend = ({ resultMetadata, onFocusArea }) => {
  const { t } = useTranslation("common");
  const [isExpanded, setIsExpanded] = useState(true);
  const bodyRef = useRef(null);

  const variableDisplayNames = {
    noise: t('checkbox_noise'),
    light: t('checkbox_light'),
    tree: t('checkbox_tree'),
    trafficLight: t('checkbox_traffic'),
    tactile_pavement: t('checkbox_tactile'),
    temperatureSummer: t('checkbox_temp_summer'),
    temperatureWinter: t('checkbox_temp_winter'),
    blueinf: t('checkbox_blue'),
    greeninf: t('checkbox_green'),
    station: t('checkbox_station'),
    wcDisabled: t('checkbox_wc'),
    narrowRoads: t('checkbox_narrow'),
    ramp: t('checkbox_ramp'),
    stair: t('checkbox_stair'),
    elevator: t('checkbox_elevator'),
    obstacle: t('checkbox_obstacle'),
    slope: t('checkbox_slope'),
    unevenSurface: t('checkbox_uneven'),
    poorPavement: t('checkbox_poor'),
    kerbsHigh: t('checkbox_kerb'),
    facility: t('checkbox_facility'),
    pedestrianFlow: t('checkbox_crowd'),
  };

  const weightLevels = [0.8, 0.85, 0.9, 1];
  const weightLabels = [
    "😩",
    "☹️",
    "😐",
    "🙂"
  ];

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
