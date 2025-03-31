import React from "react";
import sty from "./Sidebar.module.css";

export default function MapLayers({ selectedLayers, toggleLayer }) {
  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>Map Layers</h3>
      <label>
        <input
          type="checkbox"
          checked={selectedLayers.includes("roads")}
          onChange={() => toggleLayer("roads")}
        />
        Roads
      </label>
    </div>
  );
}
