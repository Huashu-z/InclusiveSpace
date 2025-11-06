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
  const weightLevels = [0.9, 0.7, 0.4, 0.1]; //4 categories of comfort weights
  const weightLabels = ["😐","☹️","😩","❌"];
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
              onChange={() => {
                toggleVariable(layer);
                setLiveMessage(
                  !enabled
                    ? `${label} ${t('aria_enabled', { defaultValue: 'enabled' })}`
                    : `${label} ${t('aria_disabled', { defaultValue: 'disabled' })}`
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
            className={sty["info-icon"]}
            ref={tooltipRef}
            onClick={(e) => { e.stopPropagation(); setShowTooltip(prev => !prev); }}
            aria-label={t('tooltip_variable_title', { defaultValue: `${label} details` })}
            aria-haspopup="dialog"
            aria-expanded={showTooltip}
            aria-controls={`tip-${layer}`}
          >
            i
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
          {/* <label htmlFor={sliderId} className={sty["sr-only"]}>{t('variable_weight_for', { defaultValue: `Weight for ${label}` })}</label> */}
          <input
            id={sliderId}
            type="range"
            min="0"
            max="3"
            step="1"
            disabled={!enabled}
            value={sliderIndex >= 0 ? sliderIndex : 3}
            className={!enabled ? sty["disabled"] : ""}
            aria-label={t('variable_weight_for', { defaultValue: `Weight for ${label}` })}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={sliderIndex >= 0 ? sliderIndex : 3}
            aria-valuetext={
              sliderIndex >= 0 ? weightLabels[sliderIndex] : t('emoji_level_unknown', { defaultValue: 'Unknown' })
            }
            style={{
              background: enabled
                ? `linear-gradient(to right, #ff5e00ff ${((sliderIndex + 0.5) / 4) * 100}%, #ccc ${((sliderIndex + 0.8) / 4) * 100}%)`
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
          <span className={sty["slider-value"]}>
            {sliderIndex >= 0 ? weightLabels[sliderIndex] : "-"}
          </span>
        </div>
      </div>
    );
  };
  
  const [showInfo, setShowInfo] = React.useState(false);
  const infoIconRef = React.useRef();

  return (
    <div className={sty["sidebar-section"]}>
      <div aria-live="polite" className="sr-only" role="status">
        {liveMessage}
      </div>
      <div className={sty["title-container"]}>
        <h3 className={sty["sidebar-title"]}>{t('leg_comfort_features')}</h3>
        <button
          className={sty["info-icon"]}
          ref={infoIconRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(prev => !prev);
          }}
          aria-label={t('tooltip_comfort_features_title')}
          aria-haspopup="dialog"
          aria-expanded={showInfo}
          aria-controls="tip-featureinfo"
        >
          i
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
          onClick={() => {
            if (startPoints.length === 0) {
              alert("Please select a starting point first!");
              return;
            }            
            setComputeAccessibility(true);
          }}
          className={sty["get-catchment-button"]}
        >
          <span className={sty["sidebar-text-bold"]}>✚ {t('get_area')}</span>
        </button>
      </div>
      {/* Clear Result Button */}
      <button
        onClick={handleClearResult}
        className={sty["setup-button"]}  
      >
        <span className={sty["sidebar-text-bold"]}> {t('clear_result')}</span>
      </button>
        {/* NEW: Clear Variables Button */}
      <button
        onClick={handleClearVariables}
        className={sty["setup-button"]}
        style={{ marginTop: 6 }}
      >
        <span className={sty["sidebar-text-bold"]}>
          {t('clear_variables')}
        </span>
      </button>

    </div>
  );
}

function Category({ name, open, onClick, children }) {
  const sty = require("./plasmic/saa_s_website/PlasmicUser.module.css");
  return (
    <div className={sty["faq-item"]}>
      <button className={sty["faq-question"]} onClick={onClick}>
        <span className={sty["sidebar-subtitle"]}>{name}</span>
        <span className={sty["faq-icon"]}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className={sty["faq-answer"]}>{children}</div>}
    </div>
  );
}
