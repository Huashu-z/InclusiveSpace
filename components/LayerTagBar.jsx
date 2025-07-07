import React from "react";
import styles from "./Sidebar.module.css"; 
import { isWmsLayer, getStyle, layerGroupMap } from "./LayerManager";

// Label display name mapping
const displayNames = {
  noise_wms: "Noise",
  tree_wms: "Tree Shading",
  trafic_light_wms: "Traffic Lights",
  streetlight: "Street Lights",
  tactile_guidance: "Tactile System",
  blue_infrastructure: "Water Features",
  green_infrastructure: "Green Space",
  transport_station_wms: "Transport Station",
  wc_disabled: "Accessible Toilets",
  temp_summer: "Summer Heat",
  temp_winter: "Winter Cold",
  sidewalk_narrow: "Narrow Sidewalk",
  accessible_ramp: "Accessible Ramps",
  stair: "Stairs",
  elevator: "Elevators",
  obstacle: "Obstacles",
  slope: "Slope",
  uneven_surfaces: "Uneven Surface",
  poor_pavement: "Poor Pavement",
  kerbs_high: "High Kerbs",
  facility_wms: "Facilities",
  pedestrian_flow: "Pedestrian Flow",
};

//color mapping for geojson layers
const getChipColor = (layer) => {
  if (isWmsLayer(layer)) return null;

  // for group layer (e.g.tactile_guidance) 
  const members = layerGroupMap[layer] || [layer];

  for (const subLayer of members) {
    const style = getStyle(subLayer);
    if (style?.fillColor) return style.fillColor;
    if (style?.color) return style.color;
  }

  return "#999"; 
};

// icon for wms layers
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
  transport_station_wms: ["/plasmic/saa_s_website/images/transport-station.png"],
  wc_disabled: ["/plasmic/saa_s_website/images/wc.png"],
  facility_wms: [
    "/plasmic/saa_s_website/images/facility_culturcenter_burgerhaus.png",
    "/plasmic/saa_s_website/images/facility_film_theater.png",
    "/plasmic/saa_s_website/images/facility_museen.png",
    "/plasmic/saa_s_website/images/facility_musik_ausstellung.png", 
    "/plasmic/saa_s_website/images/facility_religioss.png",
    "/plasmic/saa_s_website/images/facility_museum.png",
    "/plasmic/saa_s_website/images/facility_spezialbibliotheken.png",], 
};

const wmsLabels = {
  tree_wms: ["Planted Tree", "Planned Tree", "Unassigned Spot"],
  blue_infrastructure: ["Brackish water", "Lake", "Waterbody", "Spring", "Hydraulic Structure"], 
  temp_summer: ["Light = comfortable, Dark = hot"],
  temp_winter: ["Light = comfortable, Dark = cold"]
  // noise_wms: ["Noise Levels"]
};


export default function LayerTagBar({ selectedLayers, toggleLayer }) {
  if (!selectedLayers || selectedLayers.length === 0) return null;

  return (
    <div className={styles.layerTagBar}>
      {selectedLayers.map((layer) => (
        <div className={styles.layerTag}>
          {/* map layer name */}
          <div className={styles.layerTagText}>
            {displayNames[layer] || layer}
            <span className={styles.layerTagClose} onClick={() => toggleLayer(layer)}>✕</span>
          </div>

          {/* legend for each layer */}
          <div>
            {isWmsLayer(layer) ? (
              (iconUrls[layer] || []).map((url, i) => (
                <div key={i} className={styles.layerTagLegendItem}>
                  <img src={url} alt={`${layer}-${i}`} className={styles.layerTagIcon} />
                  <span>{wmsLabels[layer]?.[i] || "WMS Item"}</span>
                </div>
              ))
            ) : (
              <div className={styles.layerTagLegendItem}>
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    backgroundColor: getChipColor(layer),
                    border: "1px solid #ccc"
                  }}
                />
                <span>{displayNames[layer] || "GeoJSON Layer"}</span>
              </div>
            )}
          </div>
        </div>

      ))}
    </div>
  );
} 