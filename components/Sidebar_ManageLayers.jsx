import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';
import { cityLayerConfig } from "./cityVariableConfig";

export default function MapLayers({ selectedLayers, toggleLayer }) {
  const city = (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) || "hamburg";
  const availableMapLayers = cityLayerConfig[city]?.mapLayers || [];

  const { t } = useTranslation("common");
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
      <h3 className={sty["sidebar-title"]}>{t('map_layers')} </h3>

      <div className={sty["faq-container"]}> 
        <Category name="env" label={t('env_category')}>
          {/* {renderCheckbox("noise_wms", t('display_noise'))} */}
          {availableMapLayers.includes("temp_summer") && renderCheckbox("temp_summer", t('display_summer_heat'))}
          {availableMapLayers.includes("temp_winter") && renderCheckbox("temp_winter", t('display_winter_cold'))}
        </Category>

        <Category name="phy" label={t('phy_category')}>
          {availableMapLayers.includes("streetlight") && renderCheckbox("streetlight", t('display_light'))}
          {availableMapLayers.includes("trafic_light_wms") && renderCheckbox("trafic_light_wms", t('display_traffic'))}
          {availableMapLayers.includes("tactile_guidance") && renderCheckbox("tactile_guidance", t('display_tactile'))}
          {availableMapLayers.includes("tree_wms") && renderCheckbox("tree_wms", t('display_tree'))}
          {availableMapLayers.includes("green_infrastructure") && renderCheckbox("green_infrastructure", t('display_green_inf'))}
          {availableMapLayers.includes("blue_infrastructure") && renderCheckbox("blue_infrastructure", t('display_blue_inf'))}
          {availableMapLayers.includes("transport_station_wms") && renderCheckbox("transport_station_wms", t('display_station'))}
          {availableMapLayers.includes("sidewalk_narrow") && renderCheckbox("sidewalk_narrow", t('display_narrow'))}
          {availableMapLayers.includes("wc_disabled") && renderCheckbox("wc_disabled", t('display_wc'))} 
          {availableMapLayers.includes("stair") && renderCheckbox("stair", t('display_stair'))}
          {availableMapLayers.includes("obstacle") && renderCheckbox("obstacle", t('display_obstacle'))}
          {availableMapLayers.includes("slope") && renderCheckbox("slope", t('display_slope'))}
          {availableMapLayers.includes("uneven_surfaces") && renderCheckbox("uneven_surfaces", t('display_uneven'))}
          {availableMapLayers.includes("poor_pavement") && renderCheckbox("poor_pavement", t('display_pavement'))}
          {availableMapLayers.includes("kerbs_high") && renderCheckbox("kerbs_high", t('display_kerb_high'))}
        </Category>

        <Category name="psy" label={t('psy_category')}>
          {availableMapLayers.includes("facility_wms") && renderCheckbox("facility_wms", t('display_facility'))}
          {availableMapLayers.includes("pedestrian_flow_wms") && renderCheckbox("pedestrian_flow_wms", t('display_pedestrian_flow'))}
        </Category>
      </div>
    </div>
  );
}
 