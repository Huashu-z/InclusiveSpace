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

const iconUrls = {
  tree_wms: [
    "/plasmic/saa_s_website/images/tree_completed.png",
    "/plasmic/saa_s_website/images/tree_plan.png",
    "/plasmic/saa_s_website/images/tree_unassigned.png"
  ],
  trafic_light_wms: ["/plasmic/saa_s_website/images/traffic-light.png"],
  blue_infrastructure: [
    "/plasmic/saa_s_website/images/blue_brackish.png",
    "/plasmic/saa_s_website/images/blue_lake.png",
    "/plasmic/saa_s_website/images/blue_waterbody.png",
    "/plasmic/saa_s_website/images/blue_spring.png",
    "/plasmic/saa_s_website/images/blue_hydraulic.png"
  ],

  // noise_wms: "/icons/noise.svg",
  // streetlight: "/icons/light.svg",
  // tactile_guidance: "/icons/tactile.svg",
  // green_infrastructure: "/icons/green.svg",
  // transport_station_wms: "/icons/station.svg",
  // wc_wms: "/icons/wc.svg"
};

const iconLabels = {
  tree_wms: ["Planted Tree", "Planned Tree", "Unassigned Spot"],
  trafic_light_wms: ["Traffic Light"],
  blue_infrastructure: ["Brackish water", "Lake", "Waterbody", "Spring", "Hydraulic Structure"],
  // wc_wms: ["Public Toilet"],
  // noise_wms: ["Noise Levels"]
};


export default function LayerTagBar({ selectedLayers, toggleLayer }) {
  if (!selectedLayers || selectedLayers.length === 0) return null;

  return (
    <div className={styles.layerTagBar}>
      {selectedLayers.map((layer) => (
        <div key={layer} className={styles.layerTag}>
          <span className={styles.layerTagText}>
            {displayNames[layer] || layer}
          </span>
          {(iconUrls[layer] || []).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${layer}-${i}`}
              className={styles.layerTagIcon}
              title={iconLabels[layer]?.[i] || ""}
            />
          ))}
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
