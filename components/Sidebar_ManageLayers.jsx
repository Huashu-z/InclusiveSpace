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
        {/* {renderCheckbox("noise_wms", "Noise")} */}
        {renderCheckbox("temp_summer", "Temperature Summer")}
        {renderCheckbox("temp_winter", "Temperature Winter")}
      </Category>

      <Category name="phy" label="Physical">
        {renderCheckbox("streetlight", "Street Lights")}
        {renderCheckbox("trafic_light_wms", "Traffic Lights")}
        {renderCheckbox("tactile_guidance", "Tactile Guidance System")}
        {renderCheckbox("tree_wms", "Tree Shading")}
        {renderCheckbox("green_infrastructure", "Green Infrastructure")}
        {renderCheckbox("blue_infrastructure", "Blue Infrastructure")}
        {renderCheckbox("transport_station_wms", "Public Transport Stations")}
        {renderCheckbox("sidewalk_narrow", "Sidewalk Width (narrow)")}
        {renderCheckbox("wc_disabled", "Accessible Toilets")} 
        {renderCheckbox("accessible_ramp", "Accessible Ramps")}
        {renderCheckbox("stair", "Stairs")}
        {renderCheckbox("elevator", "Elevators")}
        {renderCheckbox("obstacle", "Obstacles")}
        {renderCheckbox("slope", "Slope")}
        {renderCheckbox("uneven_surfaces", "Uneven Surface")}
        {renderCheckbox("poor_pavement", "Poor Pavement")}
        {renderCheckbox("kerbs_high", "Kerbs (high)")}
      </Category>

      <Category name="psy" label="Psychological">
        {renderCheckbox("facility_wms", "Facilities")}
        {renderCheckbox("pedestrian_flow_wms", "Pedestrian Flow")}
        {/* {renderCheckbox("noise_wms", "Noise")} */}
      </Category>
    </div>
  );
}
 