import React from "react";
import sty from "./Sidebar.module.css";
import Tooltip from "./Sidebar_Tooltip";

export default function VariableControls({
  enabledVariables,
  toggleVariable,
  layerValues,
  handleInputChange,
  openCategory,
  toggleCategory, 
}) {
  const weightLevels = [0.85, 0.9, 0.95, 1]; //4 categories of comfort weights
  const weightLabels = ["😩", "☹️", "😐", "🙂"];
  const renderCheckbox = (layer, label) => {
    const enabled = enabledVariables.includes(layer);
    const value = layerValues[layer];
    const sliderIndex = weightLevels.indexOf(value);

    return (
      <div className={sty["checkbox-container"]}>
        <label className={sty["checkbox-label"]}>
          <input
            type="checkbox"
            onChange={() => toggleVariable(layer)}
            checked={enabled}
          />
          <span className={sty["sidebar-text"]}>{label}</span>
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
        <h3 className={sty["sidebar-title"]}>Comfort Features</h3>
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
              Environmental 
            </span>
          }
          open={openCategory === "venv"}
          onClick={() => toggleCategory("venv")}
        >
          {renderCheckbox("noise", "Noise")}
          {renderCheckbox("temperatureSummer", "Temperature (Summer)")}
          {renderCheckbox("temperatureWinter", "Temperature (Winter)")}
        </Category>

        {/* Physical */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Physical 
            </span>
          }
          open={openCategory === "vphy"}
          onClick={() => toggleCategory("vphy")}
        >
          {renderCheckbox("light", "Street Lights")}
          {renderCheckbox("trafficLight", "Traffic Lights")}
          {renderCheckbox("tactile_pavement", "Tactile Support")} 
          {renderCheckbox("tree", "Tree Shading")} 
          {renderCheckbox("greeninf", "Green Infrastructure")}
          {renderCheckbox("blueinf", "Blue Infrastructure")}
          {renderCheckbox("station", "Transport Stations")}
          {renderCheckbox("narrowRoads", "Sidewalk Width (narrow)")}
          {renderCheckbox("wcDisabled", "Accessible Toilets")}
          {renderCheckbox("ramp", "Accessible Ramps")}
          {renderCheckbox("stair", "Stairs")}
          {renderCheckbox("elevator", "Elevators")}
          {renderCheckbox("obstacle", "Obstacles")}
          {renderCheckbox("slope", "Slope")}
          {renderCheckbox("unevenSurface", "Uneven Surface")}
          {renderCheckbox("poorPavement", "Poor Pavement")}
          {renderCheckbox("kerbsHigh", "Kerbs (high)")}
        </Category>

        {/* Psychological */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Psychological 
            </span>
          }
          open={openCategory === "barrier"}
          onClick={() => toggleCategory("barrier")}
        > 
          {renderCheckbox("facility", "Facilities")}
          {renderCheckbox("pedestrianFlow", "Pedestrian Flow")}
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
