import React from "react";
import styles from "./Sidebar.module.css"; 
import { isWmsLayer, getStyle, layerGroupMap } from "./LayerManager";
import { useTranslation } from 'next-i18next';
 

export default function LayerTagBar({ selectedLayers, toggleLayer }) {
  const { t } = useTranslation("common");
  // Label display name mapping
  const displayNames = {
    noise_wms: t('display_noise'),
    tree_wms: t('display_tree'),
    trafic_light_wms: t('display_traffic'),
    streetlight: t('display_light'),
    tactile_guidance: t('display_tactile'),
    blue_infrastructure: t('display_blue_inf'),
    green_infrastructure: t('display_green_inf'),
    transport_station_wms: t('display_station'),
    wc_disabled: t('display_wc'),
    temp_summer: t('display_summer_heat'),
    temp_winter: t('display_winter_cold'),
    sidewalk_narrow: t('display_narrow'),
    accessible_ramp: t('display_ramp'),
    stair: t('display_stair'),
    elevator: t('display_elevator'),
    obstacle: t('display_obstacle'),
    slope: t('display_slope'),
    uneven_surfaces: t('display_uneven'),
    poor_pavement: t('display_pavement'),
    kerbs_high: t('display_kerb_high'),
    facility_wms: t('display_facility'),
    pedestrian_flow: t('display_pedestrian_flow'),
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

  // specific color palettes for temperature layers
  const tempPalette = {
    temp_summer: ["#ffffff", "#ffaaaa", "#ff5555", "#ff0000"], // comfort → hot
    temp_winter: ["#f7fbff", "#afd1e7", "#3e8ec4", "#08306b"]  // comfort → cold
  };

  const tempLabels = {
    temp_summer: ["Pleasant", "Warm", "Hot", "very Hot"],
    temp_winter: ["Pleasant","Cool", "Cold", "Very cold"]
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

  const wmsColorPalette = {
    green_infrastructure: ["#70A800", "#89CD66", "#898944", "#FFAA00", "#A83800", "#CA7AF5", "#00E6A9", "#828282"],
  }

  const wmsLabels = {
    trafic_light_wms: ["Traffic Lights"],
    tree_wms: ["Planted Tree", "Planned Tree", "Unassigned Spot"],
    blue_infrastructure: ["Brackish water", "Lake", "Waterbody", "Spring", "Hydraulic Structure"], 
    temp_summer: ["Light = comfortable, Dark = hot"],
    temp_winter: ["Light = comfortable, Dark = cold"],
    transport_station_wms: ["Transport Station"],
    green_infrastructure: ["Urban Park", "General green space", "Hiking trails", "Playgrounds", "Protective greenery", "Sports fields", "Garden green", "Other"],
    // noise_wms: ["Noise Levels"]
  };

  if (!selectedLayers || selectedLayers.length === 0) return null;

  return (
    <div className={styles.layerTagBar}>
      {selectedLayers.map((layer) => (
        <div key={layer} className={styles.layerTag}>
          {/* map layer name */}
          <div className={styles.layerTagText}>
            {displayNames[layer] || layer}
            <span className={styles.layerTagClose} onClick={() => toggleLayer(layer)}>✕</span>
          </div>

          {/* legend for each layer */}
          <div>
            {tempPalette[layer] ? (
              tempPalette[layer].map((color, i) => (    // legend for temperature layers
                <div key={`${layer}-${i}`} className={styles.layerTagLegendItem}>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      border: "1px solid #999"
                    }}
                  />
                  <span>{tempLabels[layer][i]}</span>
                </div>
              ))
            ) : isWmsLayer(layer) ? (
              iconUrls[layer]                           // legend with icons
                ? iconUrls[layer].map((url, i) => (
                    <div key={`${layer}-icon-${i}`} className={styles.layerTagLegendItem}>
                      <img src={url} alt={`${layer}-${i}`} className={styles.layerTagIcon} />
                      <span>{wmsLabels[layer]?.[i] || `Item ${i + 1}`}</span>
                    </div>
                  ))
                : (wmsColorPalette[layer] || ["#ccc"])  // legend with only colors
                    .map((color, i) => (
                      <div key={`${layer}-dot-${i}`} className={styles.layerTagLegendItem}>
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            backgroundColor: color,
                            border: "1px solid #999"
                          }}
                        />
                        <span>{wmsLabels[layer]?.[i] || `Item ${i + 1}`}</span>
                      </div>
                    ))
            ) : (
              /* legend for GeoJSON layer */
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