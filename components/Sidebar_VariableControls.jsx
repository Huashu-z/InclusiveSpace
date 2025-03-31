import React from "react";
import styles from "../PlasmicUser.module.css";
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
    <div className={styles["checkbox-container"]}>
      <label className={styles["checkbox-label"]}>
        <input type="checkbox" onChange={() => toggleLayer(layer)} checked={selectedLayers.includes(layer)} />
        <span className={styles["sidebar-text"]}>{label}</span>
      </label>
      <input
        type="number"
        className={styles["checkbox-input"]}
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
    <div className={styles["sidebar-section"]}>
      <div className={styles["title-container"]}>
        <h3 className={styles["sidebar-title"]}>Variable</h3>
        <span className={styles["info-icon"]} onClick={() => setShowInfo(!showInfo)}>i</span>
        <Tooltip show={showInfo} />
      </div>

      <div className={styles["faq-container"]}>
        {/* Default */}
        <div className={styles["faq-answer"]}>
          <div className={styles["checkbox-container"]}>
            <label className={styles["checkbox-label"]}>
              <input type="checkbox" onChange={() => toggleLayer("default")} checked={selectedLayers.includes("default")} />
              <span className={styles["sidebar-text"]}>Default</span>
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
  const styles = require("../PlasmicUser.module.css");
  return (
    <div className={styles["faq-item"]}>
      <button className={styles["faq-question"]} onClick={onClick}>
        <span className={styles["sidebar-subtitle"]}>{name}</span>
        <span className={styles["faq-icon"]}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className={styles["faq-answer"]}>{children}</div>}
    </div>
  );
}
