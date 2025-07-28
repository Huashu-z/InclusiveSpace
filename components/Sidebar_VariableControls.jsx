import React from "react";
import sty from "./Sidebar.module.css";
import Tooltip from "./Sidebar_Tooltip";
import { useTranslation } from 'next-i18next';

export default function VariableControls({
  enabledVariables,
  toggleVariable,
  layerValues,
  handleInputChange,
  openCategory,
  toggleCategory, 
  startPoints,
  setComputeAccessibility,
  walkingTime,
  walkingSpeed
}) {
  const { t } = useTranslation("common");
  const weightLevels = [0.1, 0.4, 0.7]; //4 categories of comfort weights
  const weightLabels = ["❌","😩", "😐"];
  const renderCheckbox = (layer, label) => {
    const enabled = enabledVariables.includes(layer);
    const value = layerValues[layer];
    const sliderIndex = weightLevels.indexOf(value);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const tooltipRef = React.useRef();

    return (
      <div className={sty["checkbox-container"]}>
        <label className={sty["checkbox-label"]}>
          <input
            type="checkbox"
            onChange={() => {
              toggleVariable(layer);
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
          <span
            className={sty["info-icon"]}
            ref={tooltipRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip((prev) => !prev);
            }}
          >
            i
          </span>
          <Tooltip
            show={showTooltip}
            type={layer}
            anchorRef={tooltipRef}
            onClose={() => setShowTooltip(false)}
          />
        </label>

        <div className={sty["slider-container"]}>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            disabled={!enabled}
            value={sliderIndex >= 0 ? sliderIndex : 2}
            className={!enabled ? sty["disabled"] : ""}
            style={{
              background: enabled
                ? `linear-gradient(to right, #2a9d8f ${((sliderIndex + 0.5) / 3) * 100}%, #ccc ${((sliderIndex + 0.8) / 3) * 100}%)`
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
      <div className={sty["title-container"]}>
        <h3 className={sty["sidebar-title"]}>{t('leg_comfort_features')}</h3>
        <span
          className={sty["info-icon"]}
          ref={infoIconRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo((prev) => !prev);
          }}
        >
          i
        </span>
        <Tooltip
          show={showInfo}
          type="variable"
          anchorRef={infoIconRef}
          onClose={() => setShowInfo(false)}
        />
      </div>

      {/* --- Emoji legend for comfort variables--- */}
      <div className={sty["legend-container"]}>
        <h4 className={sty["legend-title"]}>{t('emoji_level_0')}</h4>
        <div className={sty["legend-emoji-row"]}>
          <span className={sty["legend-emoji"]}>❌</span>
          <span className={sty["legend-emoji"]}>😩</span>
          <span className={sty["legend-emoji"]}>😐</span>
        </div>
        <div className={sty["legend-text-row"]}>
          <span className={sty["legend-label"]}>{t('emoji_level_1')}</span>
          <span className={sty["legend-label"]}>{t('emoji_level_2')}</span>
          <span className={sty["legend-label"]}>{t('emoji_level_3')}</span>
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
          {renderCheckbox("noise", t('checkbox_noise'))}
          {renderCheckbox("temperatureSummer",  t('checkbox_temp_summer'))}
          {renderCheckbox("temperatureWinter", t('checkbox_temp_winter'))}
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
          {renderCheckbox("light", t('checkbox_light'))}
          {renderCheckbox("trafficLight", t('checkbox_traffic'))}
          {renderCheckbox("tactile_pavement", t('checkbox_tactile'))} 
          {renderCheckbox("tree", t('checkbox_tree'))} 
          {renderCheckbox("greeninf", t('checkbox_green'))}
          {renderCheckbox("blueinf", t('checkbox_blue'))}
          {renderCheckbox("station", t('checkbox_station'))}
          {renderCheckbox("narrowRoads", t('checkbox_narrow'))}
          {renderCheckbox("wcDisabled", t('checkbox_wc'))}
          {renderCheckbox("ramp", t('checkbox_ramp'))}
          {renderCheckbox("stair", t('checkbox_stair'))} 
          {renderCheckbox("obstacle", t('checkbox_obstacle'))}
          {renderCheckbox("slope", t('checkbox_slope'))}
          {renderCheckbox("unevenSurface", t('checkbox_uneven'))}
          {renderCheckbox("poorPavement", t('checkbox_poor'))}
          {renderCheckbox("kerbsHigh", t('checkbox_kerb'))}
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
          {renderCheckbox("facility", t('checkbox_facility'))}
          {renderCheckbox("pedestrianFlow", t('checkbox_crowd'))}
        </Category> 
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
          className={sty["get-catchment-button"]}
        >
          <span className={sty["sidebar-text-bold"]}>✚ {t('get_area')}</span>
        </button>
      </div>

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
