import React from "react";
import styles from "./Sidebar.module.css"; 

// Label display name mapping
const displayNames = {
  noise_wms: "Noise",
  tree_wms: "Tree Coverage",
  trafic_light_wms: "Traffic Lights",
  streetlight: "Illuminating Lights",
  tactile_guidance: "Tactile System",
  blue_infrastructure: "Blue Infra",
  green_infrastructure: "Green Infra",
  transport_station_wms: "Transport Station",
  wc_wms: "Public Toilets"
};

export default function LayerTagBar({ selectedLayers, toggleLayer }) {
  if (!selectedLayers || selectedLayers.length === 0) return null;

  return (
    <div className={styles.layerTagBar}>
      {selectedLayers.map((layer) => (
        <div key={layer} className={styles.layerTag}>
          {displayNames[layer] || layer}
          <span
            className={styles.layerTagClose}
            onClick={() => toggleLayer(layer)}
          >
            ✕
          </span>
        </div>
      ))}
    </div>
  );
}
