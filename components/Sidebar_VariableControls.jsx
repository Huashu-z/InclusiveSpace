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
}) {
  const { t } = useTranslation("common");
  const weightLevels = [0.8, 0.85, 0.9, 1]; //4 categories of comfort weights
  const weightLabels = ["😩", "☹️", "😐", "🙂"];
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
            onChange={() => toggleVariable(layer)}
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
            max="3"
            step="1"
            disabled={!enabled}
            value={sliderIndex >= 0 ? sliderIndex : 3}
            className={!enabled ? sty["disabled"] : ""}
            style={{
              background: enabled
                ? `linear-gradient(to right, #2a9d8f ${((sliderIndex + 0.5) / 4) * 100}%, #ccc ${((sliderIndex + 0.5) / 4) * 100}%)`
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
        <h3 className={sty["sidebar-title"]}>{t('comfort_features')}</h3>
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
          {renderCheckbox("elevator", t('checkbox_elevator'))}
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
