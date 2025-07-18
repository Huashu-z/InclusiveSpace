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

  const weightLevels = [0.01, 0.4, 0.7];
  const weightLabels = [
    "❌",
    "😩",
    "😐"
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
        <div className={styles["legend-header-title"]}>{t('leg_catchment_result')}</div>
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

                <div>{t('leg_time_label')} {entry.time} min</div>
                <div>{t('leg_speed_label')} {entry.speed} km/h</div>
                <div>{t('leg_area_label')} {entry.area} ha</div>
                {!entry.isDefault && <div>{t('leg_comfort_ratio')} {entry.weightedRatio}</div>}

                <button
                  className={styles["toggle-button"]}
                  onClick={(e) => {
                    const container = e.currentTarget.nextSibling;
                    container.style.display =
                      container.style.display === "none" ? "block" : "none";
                    e.currentTarget.innerText =
                      container.style.display === "none"
                        ? "► " + t('leg_comfort_weight_title')
                        : "▼ " + t('leg_comfort_weight_title');
                  }}
                >
                  ►  {t('leg_comfort_weight_title')}
                </button>

                <div style={{ display: "none", marginLeft: "8px" }}>
                  {features.length > 0 ? (
                    features.map((layer) => (
                      <div key={layer}>
                        • {variableDisplayNames[layer] || layer}: {getWeightLabel(values[layer]) ?? "N/A"}
                      </div>
                    ))
                  ) : (
                    <div className={styles["legend-none"]}>{t('leg_none')}</div>
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
