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
  const renderCheckbox = (layer, label) => (
    <div className={sty["checkbox-container"]}>
      <label className={sty["checkbox-label"]}>
        <input type="checkbox" onChange={() => toggleVariable(layer)} checked={enabledVariables.includes(layer)} />
        <span className={sty["sidebar-text"]}>{label}</span>
      </label>
      <input
        type="number"
        className={sty["checkbox-input"]}
        placeholder="0 - 1"
        min="0.1"
        max="1"
        step="0.1"
        value={layerValues[layer] ?? ""}
        onChange={(event) => handleInputChange(event, layer)}
        disabled={!enabledVariables.includes(layer)} // Disable input if the variable is not selected
      />
    </div>
  );

  const [showContributorTooltip, setShowContributorTooltip] = React.useState(false);
  const [showBarrierTooltip, setShowBarrierTooltip] = React.useState(false);

  return (
    <div className={sty["sidebar-section"]}>
      <div className={sty["title-container"]}>
        <h3 className={sty["sidebar-title"]}>Variable</h3> 
      </div>

      <div className={sty["faq-container"]}>
        {/* Default */}
        {/* <div className={sty["faq-answer"]}>
          <div className={sty["checkbox-container"]}>
            <label className={sty["checkbox-label"]}>
              <input type="checkbox" onChange={() => toggleLayer("default")} checked={selectedLayers.includes("default")} />
              <span className={sty["sidebar-text"]}>Default</span>
            </label>
          </div>
        </div> */}

        {/* Environment */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Environmental
              <span className={sty["info-icon"]} onClick={(e) => {
                e.stopPropagation(); // Avoid triggering the expand event
                setShowContributorTooltip(!showContributorTooltip);
              }}>i</span>
              <Tooltip show={showContributorTooltip} type="contributor" />
            </span>
          }
          open={openCategory === "venv"}
          onClick={() => toggleCategory("venv")}
        >
          {renderCheckbox("noise", "Noise")}
          {renderCheckbox("trees", "Tree Coverage")}
        </Category>

        {/* Physical */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Physical
              <span className={sty["info-icon"]} onClick={(e) => {
                e.stopPropagation(); // Avoid triggering the expand event
                setShowContributorTooltip(!showContributorTooltip);
              }}>i</span>
              <Tooltip show={showContributorTooltip} type="contributor" />
            </span>
          }
          open={openCategory === "vphy"}
          onClick={() => toggleCategory("vphy")}
        >
          {renderCheckbox("light", "Illuminating Lights")}
          {renderCheckbox("trafic_light_wms", "Traffic Lights")}
          {renderCheckbox("tactile_pavement", "Tactile Support")} 
        </Category>

        {/* Psychological */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Psychological
              <span className={sty["info-icon"]} onClick={(e) => {
                e.stopPropagation();
                setShowBarrierTooltip(!showBarrierTooltip);
              }}>i</span>
              <Tooltip show={showBarrierTooltip} type="barrier" />
            </span>
          }
          open={openCategory === "barrier"}
          onClick={() => toggleCategory("barrier")}
        >
          {renderCheckbox("crossing", "Crossing")}
          
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
