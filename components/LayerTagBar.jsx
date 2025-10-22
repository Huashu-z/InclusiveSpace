import React from "react";
import styles from "./Sidebar.module.css"; 
import { isWmsLayer, getStyle, layerGroupMap } from "./LayerStyleManager";
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
    blue_infrastructure_wms: t('display_blue_inf'),
    green_infrastructure_wms: t('display_green_inf'),
    transport_station_wms: t('display_station'),
    wc_disabled: t('display_wc'),
    temp_summer: t('display_summer_heat'),
    temp_winter: t('display_winter_cold'),
    sidewalk_narrow: t('display_narrow'),
    stair: t('display_stair'), 
    obstacle: t('display_obstacle'),
    slope: t('display_slope'),
    uneven_surfaces: t('display_uneven'),
    poor_pavement: t('display_pavement'),
    kerbs_high: t('display_kerb_high'),
    facility_wms: t('display_facility'),
    pedestrian_flow_wms: t('display_pedestrian_flow'),
    trafic_light: t('display_traffic'),
    green_infrastructure: t('display_green_inf'),
    transport_station: t('display_station'),
    facilities: t('display_facility'),
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
    temp_summer: ["#ffaaaa", "#ff5555", "#ff0000"], // comfort → hot
    temp_winter: ["#afd1e7", "#3e8ec4", "#08306b"]  // comfort → cold
  };

  const tempLabels = {
    temp_summer: [t('layertag_temp_summer_0'), t('layertag_temp_summer_1'), t('layertag_temp_summer_2')],
    temp_winter: [t('layertag_temp_winter_0'), t('layertag_temp_winter_1'), t('layertag_temp_winter_2')]
  };

  // specific color palettes for penteli slope layers
  const slopePalette = {
    slope_penteli: ["#fee08b", "#fc8d59", "#d73027"], // comfort → steep
  };

  const slopeLabels = {
    slope_penteli: [t('layertag_slope_penteli_0'), t('layertag_slope_penteli_1'), t('layertag_slope_penteli_2')],
  };

  // specific color palettes for pedestrian flow layers
  const flowPalette = {
    pedestrian_flow_wms: ["#4b5fd1", "#eccf46", "#b31e0c"] // low → high pedestrian flow
  };

  const flowLabels = {
    pedestrian_flow_wms: [t('layertag_flow_low'), t('layertag_flow_medium'), t('layertag_flow_high')]
  };

  // icon for wms layers
  const iconUrls = {
    tree_wms: [
      "/plasmic/saa_s_website/images/tree_completed.png",
      "/plasmic/saa_s_website/images/tree_plan.png",
      "/plasmic/saa_s_website/images/tree_unassigned.png"
    ],
    trafic_light_wms: ["/plasmic/saa_s_website/images/traffic-light.png"],
    blue_infrastructure_wms: [
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
      "/plasmic/saa_s_website/images/facility_weiterbildung.png",
      "/plasmic/saa_s_website/images/facility_spezialbibliotheken.png",], 
  };

  const wmsColorPalette = {
    green_infrastructure_wms: ["#70A800", "#89CD66", "#898944", "#FFAA00", "#A83800", "#CA7AF5", "#00E6A9", "#828282"],
  }

  const wmsLabels = {
    trafic_light_wms: [t('layertag_trafic_light')],
    tree_wms: [
      t('layertag_tree_0'),
      t('layertag_tree_1'),
      t('layertag_tree_2')
    ],
    blue_infrastructure_wms: [
      t('layertag_blue_0'),
      t('layertag_blue_1'),
      t('layertag_blue_2'),
      t('layertag_blue_3'),
      t('layertag_blue_4')
    ],
    temp_summer: [t('layertag_temp_summer_note')],
    temp_winter: [t('layertag_temp_winter_note')],
    transport_station_wms: [t('layertag_transport_station')],
    green_infrastructure_wms: [
      t('layertag_green_0'),
      t('layertag_green_1'),
      t('layertag_green_2'),
      t('layertag_green_3'),
      t('layertag_green_4'),
      t('layertag_green_5'),
      t('layertag_green_6'),
      t('layertag_green_7')
    ],
    facility_wms: [
      t('layertag_facility_0'),
      t('layertag_facility_1'),
      t('layertag_facility_2'),
      t('layertag_facility_3'),
      t('layertag_facility_4'),
      t('layertag_facility_5'),
      t('layertag_facility_6')
    ]
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
            {flowPalette[layer] ? (
              flowPalette[layer].map((color, i) => (
                <div key={`${layer}-flow-${i}`} className={styles.layerTagLegendItem}>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      border: "1px solid #999"
                    }}
                  />
                  <span>{flowLabels[layer][i]}</span>
                </div>
              ))
            ) :tempPalette[layer] ? (
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
            ) :slopePalette[layer] ? (
              slopePalette[layer].map((color, i) => (    // legend for slope layers
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
                  <span>{slopeLabels[layer][i]}</span>
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