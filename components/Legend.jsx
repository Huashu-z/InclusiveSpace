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
    stair: t('checkbox_stair'), 
    obstacle: t('checkbox_obstacle'),
    slope: t('checkbox_slope'),
    unevenSurface: t('checkbox_uneven'),
    poorPavement: t('checkbox_poor'),
    kerbsHigh: t('checkbox_kerb'),
    facility: t('checkbox_facility'),
    pedestrianFlow: t('checkbox_crowd'),
  };

  const weightLevels = [0.1, 0.4, 0.7, 0.9];
  const weightLabels = [
    "❌",
    "😩",
    "☹️",
    "😐"
  ];

  // const poiCategoryNames = {
  //   film_theater: t("leg_poi_cinema"), 
  //   museen: t("leg_poi_museum"),  
  //   musik_ausstellungen: t("leg_poi_music"), 
  //   religioese_gemeinschaften: t("leg_poi_religious"), 
  //   spezialbibliotheken: t("leg_poi_library"), 
  //   stadtteilkulturzentren_buergerhaeuser: t("leg_poi_cultural_center"), 
  //   weiterbildung: t("leg_poi_education"), 
  //   Unknown: t("leg_poi_other")
  // };
  const poiCategoryNames = {
    poi_hh_gastronomy: t("leg_poi_gastronomy"),
    poi_hh_haltstelle: t("leg_poi_haltstelle"),
    poi_hh_health: t("leg_poi_health"),
    poi_hh_kita_schule: t("leg_poi_kita_schule"),
    poi_hh_park_spiel: t("leg_poi_park_spiel"),
    poi_hh_supermarket: t("leg_poi_supermarket"),
    poi_hh_uni_fh: t("leg_poi_uni_fh"),
  };

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
      {/* Dedicated area for screen readers: Number of new results to be displayed */}
      <div aria-live="polite" className={styles["sr-only"]} role="status">
        {resultMetadata.length > 0 &&
          `${resultMetadata.length} accessibility result${resultMetadata.length > 1 ? 's' : ''} loaded.`}
      </div>

      <div
        className={styles["legend-header"]}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles["legend-header-title"]}>{t('leg_catchment_result')}</div>
        <div className={styles["legend-header-toggle"]}>{isExpanded ? "▼" : "▲"}</div>
      </div>

      {isExpanded && (
        <div className={styles["legend-body"]} ref={bodyRef}>
          {resultMetadata.map((entry, index) => {
            const color = entry.color;
            const features = entry.layers;
            const values = entry.values;

            const comfortId = `comfort-${index}`;
            const poiId = `poi-${index}`;

            return (
              <div
                key={index}
                className={styles["legend-section"]}
                role="region"
                aria-label={`${t('leg_area_label')} ${entry.groupIndex}.${entry.subIndex ?? ''}, ${t('leg_time_label')} ${entry.time} ${t('minutes')}`}
              >
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
                    aria-hidden="true"
                    role="presentation"
                  />
                  {entry.isDefault ? (
                    <div>
                      <div>{t('legend_base_area')} {entry.groupIndex}</div>
                      <div style={{ fontSize: "1.0em", color: "#666" }}>
                        {t('legend_without_factors')}
                      </div>
                    </div>
                  ) : (
                    `${t('leg_area_label')} ${entry.groupIndex}.${entry.subIndex}`
                  )}
                </div>

                <div>{t('leg_time_label')} {entry.time} {t('minutes')}</div>
                <div>{t('leg_speed_label')} {entry.speed} km/h</div>
                <div>{t('leg_area_label')} {entry.area} ha</div>
                {!entry.isDefault && <div>{t('leg_comfort_ratio')} {entry.weightedRatio}</div>}

                {/* Comfort Feature Weight Categories */}
                <button
                  className={styles["toggle-button"]}
                  aria-expanded="false"
                  aria-controls={comfortId}
                  onClick={(e) => {
                    const container = e.currentTarget.nextSibling;
                    const isOpen = container.style.display !== "none";
                    container.style.display = isOpen ? "none" : "block";
                    e.currentTarget.setAttribute("aria-expanded", (!isOpen).toString());
                    e.currentTarget.innerText = (!isOpen ? "▼ " : "► ") + t('leg_comfort_weight_title');
                  }}
                >
                  ► {t('leg_comfort_weight_title')}
                </button>
                <div id={comfortId} style={{ display: "none", marginLeft: "8px" }}>
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

                {/* Points of Interest Count */}
                {entry.poiCount > 0 && (
                  <div style={{ marginTop: 0 }}>
                    <button
                      className={styles["toggle-button"]}
                      style={{ marginBottom: 2 }}
                      aria-expanded="false"
                      aria-controls={poiId}
                      onClick={(e) => {
                        const btn = e.currentTarget;
                        const container = btn.nextSibling;
                        const isOpen = container.style.display !== "none";
                        container.style.display = isOpen ? "none" : "block";
                        btn.setAttribute("aria-expanded", (!isOpen).toString());
                        btn.innerText = (!isOpen ? "▼ " : "► ") + t('leg_poi_count') + `: ${entry.poiCount}`;
                      }}
                    >
                      ► {t('leg_poi_count')}: {entry.poiCount}
                    </button>
                    <div id={poiId} style={{ display: "none", marginLeft: 8 }}>
                      {entry.poiGroupCounts && Object.keys(entry.poiGroupCounts).length > 0 ? (
                        Object.entries(entry.poiGroupCounts).map(([cat, count]) => (
                          <div key={cat}>
                            • {poiCategoryNames[cat] || cat}: {count}
                          </div>
                        ))
                      ) : (
                        <div className={styles["legend-none"]}>{t('leg_none')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

};

export default Legend;
