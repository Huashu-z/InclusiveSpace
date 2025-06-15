import React, { useState } from "react";
import sty from "./Sidebar.module.css";

export default function MapLayers({ selectedLayers, toggleLayer }) {
  const [openCategory, setOpenCategory] = useState(null);

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const Category = ({ name, label, children }) => (
    <div className={sty["faq-item"]}>
      <button className={sty["faq-question"]} onClick={() => toggleCategory(name)}>
        <span className={sty["sidebar-subtitle"]}>{label}</span>
        <span className={sty["faq-icon"]}>{openCategory === name ? "−" : "+"}</span>
      </button>
      {openCategory === name && <div className={sty["faq-answer"]}>{children}</div>}
    </div>
  );

  const renderCheckbox = (layer, label) => (
    <div key={layer} className={sty["checkbox-container"]}>
      <label className={sty["checkbox-label"]}>
        <input
          type="checkbox"
          checked={selectedLayers.includes(layer)}
          onChange={() => toggleLayer(layer)}
        />
        <span className={sty["sidebar-text"]}>{label}</span>
      </label>
    </div>
  );

  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>Map Layers</h3>

      <Category name="env" label="Environmental">
        {renderCheckbox("noise_wms", "Noise")}
        {renderCheckbox("tree_wms", "Tree Coverage")}
      </Category>

      <Category name="phy" label="Physical">
        {renderCheckbox("streetlight", "Illuminating Lights")}
        {renderCheckbox("tactile_points", "Tactile guidance system")}
        {renderCheckbox("blue_infrastructure", "Blue Infrastructure")}
        {renderCheckbox("green_infrastructure", "Green Infrastructure")}
        {renderCheckbox("green_infrastructure", "Green Infrastructure")}
        {renderCheckbox("wc_wms", "Public Toilets")}
        {renderCheckbox("transport_station_wms", "Public Transport Stations")}
        
      </Category>

      <Category name="psy" label="Psychological">
        {/* {renderCheckbox("noise_wms", "Noise")} */}
      </Category>
    </div>
  );
}
 