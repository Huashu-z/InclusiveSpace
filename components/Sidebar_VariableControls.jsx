import React from "react";
import sty from "./Sidebar.module.css";
import Tooltip from "./Sidebar_Tooltip";

export default function VariableControls({
  selectedLayers,
  toggleLayer,
  layerValues,
  handleInputChange,
  openCategory,
  toggleCategory, 
}) {
  const renderCheckbox = (layer, label) => (
    <div className={sty["checkbox-container"]}>
      <label className={sty["checkbox-label"]}>
        <input type="checkbox" onChange={() => toggleLayer(layer)} checked={selectedLayers.includes(layer)} />
        <span className={sty["sidebar-text"]}>{label}</span>
      </label>
      <input
        type="number"
        className={sty["checkbox-input"]}
        placeholder="0 - 1"
        min="0"
        max="1"
        step="0.1"
        value={layerValues[layer] ?? ""}
        onChange={(event) => handleInputChange(event, layer)}
        disabled={!selectedLayers.includes(layer)} // Disable input if the layer is not selected
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

        {/* Comfort Contributors */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Comfort Contributors
              <span className={sty["info-icon"]} onClick={(e) => {
                e.stopPropagation(); // Avoid triggering the expand event
                setShowContributorTooltip(!showContributorTooltip);
              }}>i</span>
              <Tooltip show={showContributorTooltip} type="contributor" />
            </span>
          }
          open={openCategory === "comf"}
          onClick={() => toggleCategory("comf")}
        >
          {renderCheckbox("light", "Lighting Availability")}
          {renderCheckbox("tactile_pavement", "Tactile Support")}
          {renderCheckbox("tree", "Tree Coverage")}
        </Category>

        {/* Comfort Barriers */}
        <Category
          name={
            <span className={sty["title-with-tooltip"]}>
              Comfort Barriers
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
          {renderCheckbox("noise", "Noise")}
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
