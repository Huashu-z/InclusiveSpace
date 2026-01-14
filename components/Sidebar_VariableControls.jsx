import React from "react";
import sty from "./Sidebar.module.css";
import Tooltip from "./Sidebar_Tooltip";
import { useTranslation } from 'next-i18next';
import { cityLayerConfig } from "./cityVariableConfig";

export default function VariableControls({
  enabledVariables,
  toggleVariable,
  layerValues,
  handleInputChange,
  openCategory,
  toggleCategory, 
  startPoints,
  setComputeAccessibility,
  handleClearResult,
  handleClearVariables,
  walkingTime,
  walkingSpeed
}) {
  const [liveMessage, setLiveMessage] = React.useState("");

  const city = (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) || "hamburg";
  const availableFeatures = cityLayerConfig[city]?.discomfortFeatures || [];

  const { t } = useTranslation("common");
  const weightLevels = [0.9, 0.7, 0.5, 0.1]; //4 categories of comfort weights
  const weightLabels = ["😐","☹️","😩","❌"];
  const weightTexts = [
    t("emoji_level_4"), // 0.9  → Barely Noticeable
    t("emoji_level_3"), // 0.7  → Slightly annoying
    t("emoji_level_2"), // 0.5  → Moderately disturbing
    t("emoji_level_1"), // 0.1  → Totally Unbearable
  ];
  const renderCheckbox = (layer, label) => {
    const enabled = enabledVariables.includes(layer);
    const value = layerValues[layer];
    const sliderIndex = weightLevels.indexOf(value);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const tooltipRef = React.useRef();
    const sliderId = `var-${layer}-slider`;

    return (
      <div className={sty["checkbox-container"]}>
        <div className={sty["checkbox-top-row"]}>
          <label className={sty["checkbox-label"]}>
            <input
              type="checkbox"
              className={sty.kbdFocus}
              onChange={() => {
                toggleVariable(layer);
                setLiveMessage(
                  !enabled
                    ? `${label} ${t('aria_enabled')}`
                    : `${label} ${t('aria_disabled')}`
                );
                if (!enabled) {
                  const fakeEvent = {
                    target: { value: weightLevels[2] } 
                  };
                  handleInputChange(fakeEvent, layer);
                }
              }}
              checked={enabled}
            />
            <span className={sty["sidebar-text"]}>{label}</span>
          </label>
          <button
            type="button"
            className={`${sty["info-icon"]} ${sty.kbdFocus}`}
            ref={tooltipRef}
            onClick={(e) => { e.stopPropagation(); setShowTooltip(prev => !prev); }}
            aria-label={t("aria_feature_info_button", { feature: label })}
            title={t("aria_feature_info_button", { feature: label })}
            aria-haspopup="dialog"
            aria-expanded={showTooltip}
            aria-controls={`tip-${layer}`}
          >
            <img src="/images/icon_info.png" alt="" aria-hidden="true" className={sty.infoIconImg} />
          </button>
        </div>
        
          <Tooltip
            show={showTooltip}
            type={layer}
            anchorRef={tooltipRef}
            onClose={() => setShowTooltip(false)}
            id={`tip-${layer}`}
          /> 

        <div className={sty["slider-container"]}>
          <label htmlFor={sliderId} className={sty["sr-only"]}>{t('variable_weight_for', { label })}</label>
          <input
            id={sliderId}
            type="range"
            min="0"
            max="3"
            step="1"
            disabled={!enabled}
            value={sliderIndex >= 0 ? sliderIndex : 3}
            className={`${sty.kbdFocus} ${!enabled ? sty["disabled"] : ""}`}
            aria-label={t('variable_weight_for' , { label })}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={sliderIndex >= 0 ? sliderIndex : 3}
            aria-valuetext={
              sliderIndex >= 0 ? weightLabels[sliderIndex] : t('emoji_level_unknown')
            }
            style={{
              background: enabled
                ? (() => {
                    const pct = ((sliderIndex + 0.5) / 4) * 100;
                    const pctGray = ((sliderIndex + 0.8) / 4) * 100;
                    return `
                      linear-gradient(to right,
                        transparent 0%,
                        transparent ${pct}%,
                        #9ca3af ${pctGray}%,
                        #9ca3af 100%
                      ),
                      linear-gradient(to right,
                        #e6ea08ff 0%,
                        #dc2626 100%
                      )
                    `;
                  })()
                : undefined
            }}
            onChange={(event) => {
              const index = parseInt(event.target.value, 10);
              const fakeEvent = {
                target: {
                  value: weightLevels[index],
                },
              };
              handleInputChange(fakeEvent, layer);
            }}
          />
          <span className={sty["slider-value"]} aria-hidden="true">
            {sliderIndex >= 0 ? weightLabels[sliderIndex] : "-"}
          </span>
          <span className={sty["sr-only"]}>
            {sliderIndex >= 0 ? weightTexts[sliderIndex] : t('emoji_level_unknown')}
          </span>
        </div>
      </div>
    );
  };
  
  const [showInfo, setShowInfo] = React.useState(false);
  const infoIconRef = React.useRef();

  return (
    <div 
      className={sty["sidebar-section"]}
      role = "region"
      aria-labelledby="comfort-features-heading"
    >
      <div aria-live="polite" className={sty["sr-only"]} role="status">
        {liveMessage}
      </div>
      <div className={sty["title-container"]}>
        {/* <h3 className={sty["sidebar-title"]}>{t('leg_comfort_features')}</h3> */}
        <div className={sty["sidebar-section-title"]} id="comfort-features-heading">
          <img src="/images/icon_features.png" alt={t('icon_discomfort_feature')} />
          <span>{t("leg_comfort_features")}</span>
        </div>
        <button
          type="button"
          className={`${sty["info-icon"]} ${sty.kbdFocus}`}
          ref={infoIconRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(prev => !prev);
          }}
          title={t('tooltip_comfort_features_title')}
          aria-label={t('tooltip_comfort_features_title')}
          aria-haspopup="dialog"
          aria-expanded={showInfo}
          aria-controls="tip-featureinfo"
        >
          <img src="/images/icon_info.png" alt="" aria-hidden="true" className={sty.infoIconImg} />
        </button>
        <Tooltip
          show={showInfo}
          type="variable"
          anchorRef={infoIconRef}
          onClose={() => setShowInfo(false)}
          id="tip-featureinfo"
        />
      </div>

      {/* --- Emoji legend for comfort variables--- */}
      <div className={sty["legend-container"]}>
        <h4 className={sty["legend-title"]}>{t('emoji_level_0')}</h4>
        <div className={sty["legend-emoji-column"]}>
          <div className={sty["legend-emoji-item"]}>
            <span className={sty["legend-emoji"]} aria-hidden="true">❌</span>
            <span className={sty["legend-label"]}>{t('emoji_level_1')}</span>
          </div>
          <div className={sty["legend-emoji-item"]}>
            <span className={sty["legend-emoji"]} aria-hidden="true">😩</span>
            <span className={sty["legend-label"]}>{t('emoji_level_2')}</span>
          </div>
          <div className={sty["legend-emoji-item"]}>
            <span className={sty["legend-emoji"]} aria-hidden="true">☹️</span>
            <span className={sty["legend-label"]}>{t('emoji_level_3')}</span>
          </div>
          <div className={sty["legend-emoji-item"]}>
            <span className={sty["legend-emoji"]} aria-hidden="true">😐</span>
            <span className={sty["legend-label"]}>{t('emoji_level_4')}</span>
          </div>
        </div>
      </div>

      <div className={sty["faq-container"]}> 

        {/* Environment */}
        <Category
          id = "env"
          name={
            <span className={sty["title-with-tooltip"]}>
              {t('env_category')} 
            </span>
          }
          open={openCategory === "venv"}
          onClick={() => toggleCategory("venv")}
        >
          {availableFeatures.includes("noise") && renderCheckbox("noise", t('checkbox_noise'))}
          {availableFeatures.includes("temperatureSummer") && renderCheckbox("temperatureSummer",  t('checkbox_temp_summer'))}
          {availableFeatures.includes("temperatureWinter") && renderCheckbox("temperatureWinter", t('checkbox_temp_winter'))}
        </Category>

        {/* Physical */}
        <Category
          id = "phy"
          name={
            <span className={sty["title-with-tooltip"]}>
              {t('phy_category')} 
            </span>
          }
          open={openCategory === "vphy"}
          onClick={() => toggleCategory("vphy")}
        >
          {availableFeatures.includes("light") && renderCheckbox("light", t('checkbox_light'))}
          {availableFeatures.includes("trafficLight") && renderCheckbox("trafficLight", t('checkbox_traffic'))}
          {availableFeatures.includes("tactile_pavement") && renderCheckbox("tactile_pavement", t('checkbox_tactile'))} 
          {availableFeatures.includes("tree") && renderCheckbox("tree", t('checkbox_tree'))} 
          {availableFeatures.includes("greeninf") && renderCheckbox("greeninf", t('checkbox_green'))}
          {availableFeatures.includes("blueinf") && renderCheckbox("blueinf", t('checkbox_blue'))}
          {availableFeatures.includes("station") && renderCheckbox("station", t('checkbox_station'))}
          {availableFeatures.includes("narrowRoads") && renderCheckbox("narrowRoads", t('checkbox_narrow'))}
          {availableFeatures.includes("wcDisabled") && renderCheckbox("wcDisabled", t('checkbox_wc'))}
          {availableFeatures.includes("stair") && renderCheckbox("stair", t('checkbox_stair'))} 
          {availableFeatures.includes("obstacle") && renderCheckbox("obstacle", t('checkbox_obstacle'))}
          {availableFeatures.includes("slope") && renderCheckbox("slope", t('checkbox_slope'))}
          {availableFeatures.includes("unevenSurface") && renderCheckbox("unevenSurface", t('checkbox_uneven'))}
          {availableFeatures.includes("poorPavement") && renderCheckbox("poorPavement", t('checkbox_poor'))}
          {availableFeatures.includes("kerbsHigh") && renderCheckbox("kerbsHigh", t('checkbox_kerb'))}
        </Category>

        {/* Psychological */}
        <Category
          id = "psy"
          name={
            <span className={sty["title-with-tooltip"]}>
              {t('psy_category')} 
            </span>
          }
          open={openCategory === "vpsy"}
          onClick={() => toggleCategory("vpsy")}
        > 
          {availableFeatures.includes("facility") && renderCheckbox("facility", t('checkbox_facility'))}
          {availableFeatures.includes("pedestrianFlow") && renderCheckbox("pedestrianFlow", t('checkbox_crowd'))}
        </Category> 
      </div>

      {/* Get Catchment Area button */}
      <div className={sty["button-container"]}>
        <button
          type="button"
          onClick={() => {
            if (startPoints.length === 0) {
              alert(t("alert_select_start_first"));
              return;
            }            
            setComputeAccessibility(true);
          }}
          className={`${sty["get-catchment-button"]} ${sty.kbdFocus}`}
        >
          <span className={sty["sidebar-text-bold"]}>✚ {t('get_area')}</span>
        </button>
      </div>
      {/* Clear Result Button */}
      <button
        type="button"
        onClick={handleClearResult}
        className={`${sty["setup-button"]} ${sty.kbdFocus}`} 
      >
        <span className={sty["sidebar-text-bold"]}> {t('clear_result')}</span>
      </button>
        {/* NEW: Clear Variables Button */}
      <button
        type="button"
        onClick={handleClearVariables}
        className={`${sty["setup-button"]} ${sty.kbdFocus}`}
        style={{ marginTop: 6 }}
      >
        <span className={sty["sidebar-text-bold"]}>
          {t('clear_variables')}
        </span>
      </button>

    </div>
  );
}

function Category({ id, name, open, onClick, children }) { 
  const headingId = `var-category-heading-${id}`;
  const contentId = `var-category-content-${id}`;
  return (
    <div className={sty["faq-item"]}>
      <h3 className={sty["sidebar-subtitle"]} id={headingId}>
        <button
          type="button"
          className={`${sty["faq-question"]} ${sty.kbdFocus}`}
          onClick={onClick}
          aria-expanded={open}
          aria-controls={contentId}
        >
          <span>{name}</span>
          <span className={sty["faq-icon"]}>{open ? "−" : "+"}</span>
        </button>
      </h3>

      {open && (
        <div
          className={sty["faq-answer"]}
          role="group"
          id={contentId}
          aria-labelledby={headingId}
        >
          {children}
        </div>
      )}
    </div>
  );
}
