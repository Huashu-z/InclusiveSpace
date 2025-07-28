import React from "react";
import styles from "./Sidebar.module.css"; 
import { isWmsLayer, getStyle, layerGroupMap } from "./LayerManager";
import { useTranslation } from 'next-i18next';
 

export default function LayerTagBar({ selectedLayers, toggleLayer }) {
  const { t } = useTranslation("common");
  // Label display name mapping
  const displayNames = {
    hh_noise_wms: t('display_noise'),
    hh_tree_wms: t('display_tree'),
    hh_trafic_light_wms: t('display_traffic'),
    hh_streetlight: t('display_light'),
    hh_tactile_guidance: t('display_tactile'),
    hh_blue_infrastructure: t('display_blue_inf'),
    hh_green_infrastructure: t('display_green_inf'),
    hh_transport_station_wms: t('display_station'),
    hh_wc_disabled: t('display_wc'),
    hh_temp_summer: t('display_summer_heat'),
    hh_temp_winter: t('display_winter_cold'),
    hh_sidewalk_narrow: t('display_narrow'),
    hh_accessible_ramp: t('display_ramp'),
    hh_stair: t('display_stair'), 
    hh_obstacle: t('display_obstacle'),
    hh_slope: t('display_slope'),
    hh_uneven_surfaces: t('display_uneven'),
    hh_poor_pavement: t('display_pavement'),
    hh_kerbs_high: t('display_kerb_high'),
    hh_facility_wms: t('display_facility'),
    hh_pedestrian_flow_wms: t('display_pedestrian_flow'),
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
    hh_temp_summer: ["#ffaaaa", "#ff5555", "#ff0000"], // comfort → hot
    hh_temp_winter: ["#afd1e7", "#3e8ec4", "#08306b"]  // comfort → cold
  };

  const tempLabels = {
    hh_temp_summer: [t('layertag_temp_summer_0'), t('layertag_temp_summer_1'), t('layertag_temp_summer_2')],
    hh_temp_winter: [t('layertag_temp_winter_0'), t('layertag_temp_winter_1'), t('layertag_temp_winter_2')]
  };

  const flowPalette = {
    hh_pedestrian_flow_wms: ["#4b5fd1", "#eccf46", "#b31e0c"] // low → high pedestrian flow
  };

  const flowLabels = {
    hh_pedestrian_flow_wms: [t('layertag_flow_low'), t('layertag_flow_medium'), t('layertag_flow_high')]
  };

  // icon for wms layers
  const iconUrls = {
    hh_tree_wms: [
      "/plasmic/saa_s_website/images/tree_completed.png",
      "/plasmic/saa_s_website/images/tree_plan.png",
      "/plasmic/saa_s_website/images/tree_unassigned.png"
    ],
    hh_trafic_light_wms: ["/plasmic/saa_s_website/images/traffic-light.png"],
    hh_blue_infrastructure: [
      "/plasmic/saa_s_website/images/blue_brackish.png",
      "/plasmic/saa_s_website/images/blue_lake.png",
      "/plasmic/saa_s_website/images/blue_waterbody.png",
      "/plasmic/saa_s_website/images/blue_spring.png",
      "/plasmic/saa_s_website/images/blue_hydraulic.png"
    ],
    hh_transport_station_wms: ["/plasmic/saa_s_website/images/transport-station.png"],
    hh_wc_disabled: ["/plasmic/saa_s_website/images/wc.png"],
    hh_facility_wms: [
      "/plasmic/saa_s_website/images/facility_culturcenter_burgerhaus.png",
      "/plasmic/saa_s_website/images/facility_film_theater.png",
      "/plasmic/saa_s_website/images/facility_museen.png",
      "/plasmic/saa_s_website/images/facility_musik_ausstellung.png", 
      "/plasmic/saa_s_website/images/facility_religioss.png",
      "/plasmic/saa_s_website/images/facility_weiterbildung.png",
      "/plasmic/saa_s_website/images/facility_spezialbibliotheken.png",], 
  };

  const wmsColorPalette = {
    hh_green_infrastructure: ["#70A800", "#89CD66", "#898944", "#FFAA00", "#A83800", "#CA7AF5", "#00E6A9", "#828282"],
  }

  const wmsLabels = {
    hh_trafic_light_wms: [t('layertag_trafic_light')],
    hh_tree_wms: [
      t('layertag_tree_0'),
      t('layertag_tree_1'),
      t('layertag_tree_2')
    ],
    hh_blue_infrastructure: [
      t('layertag_blue_0'),
      t('layertag_blue_1'),
      t('layertag_blue_2'),
      t('layertag_blue_3'),
      t('layertag_blue_4')
    ],
    hh_temp_summer: [t('layertag_temp_summer_note')],
    hh_temp_winter: [t('layertag_temp_winter_note')],
    hh_transport_station_wms: [t('layertag_transport_station')],
    hh_green_infrastructure: [
      t('layertag_green_0'),
      t('layertag_green_1'),
      t('layertag_green_2'),
      t('layertag_green_3'),
      t('layertag_green_4'),
      t('layertag_green_5'),
      t('layertag_green_6'),
      t('layertag_green_7')
    ],
    hh_facility_wms: [
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