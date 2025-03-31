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
  showInfo,
  setShowInfo
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
      />
    </div>
  );

  return (
    <div className={sty["sidebar-section"]}>
      <div className={sty["title-container"]}>
        <h3 className={sty["sidebar-title"]}>Variable</h3>
        <span className={sty["info-icon"]} onClick={() => setShowInfo(!showInfo)}>i</span>
        <Tooltip show={showInfo} />
      </div>

      <div className={sty["faq-container"]}>
        {/* Default */}
        <div className={sty["faq-answer"]}>
          <div className={sty["checkbox-container"]}>
            <label className={sty["checkbox-label"]}>
              <input type="checkbox" onChange={() => toggleLayer("default")} checked={selectedLayers.includes("default")} />
              <span className={sty["sidebar-text"]}>Default</span>
            </label>
          </div>
        </div>

        {/* Infrastructure */}
        <Category
          name="Infrastructure"
          open={openCategory === "infra"}
          onClick={() => toggleCategory("infra")}
        >
          {renderCheckbox("light", "Light")}
          {renderCheckbox("tactile_pavement", "Tactile Pavement")}
        </Category>

        {/* Environmental Factors */}
        <Category
          name="Environmental Factors"
          open={openCategory === "env"}
          onClick={() => toggleCategory("env")}
        >
          {renderCheckbox("crossing", "Street Crossing")}
          {renderCheckbox("noise", "Noise")}
        </Category>

        {/* Psychological Factors */}
        <Category
          name="Psychological Factors"
          open={openCategory === "veg"}
          onClick={() => toggleCategory("veg")}
        >
          {renderCheckbox("tree", "Trees")}
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
