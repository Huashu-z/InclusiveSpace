import React from "react";
import sty from "./Sidebar.module.css";

export default function MapLayers({ selectedLayers, toggleLayer, availableLayers }) {
  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>Map Layers</h3>
      {availableLayers.map((layer) => (
        <div key={layer} className={sty["checkbox-container"]}>
          <label className={sty["checkbox-label"]}>
            <input
              type="checkbox"
              checked={selectedLayers.includes(layer)}
              onChange={() => toggleLayer(layer)}
            />
            <span className={sty["sidebar-text"]}>{layer.replaceAll("_", " ")}</span>
          </label>
        </div>
      ))}
    </div>
  );
}

