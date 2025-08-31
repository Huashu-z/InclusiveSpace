import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';
import { cityLayerConfig } from "./cityVariableConfig";

export default function MapLayers({ selectedLayers, toggleLayer, availableLayers }) {
  const city = (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) || "hamburg";
  // const availableMapLayers = cityLayerConfig[city]?.mapLayers || [];

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

  const groups = [
    { name: "env", label: t('env_category') },
    { name: "phy", label: t('phy_category') },
    { name: "psy", label: t('psy_category') }
  ];

  const renderCheckbox = (layer, label) => (
    <div key={layer.key} className={sty["checkbox-container"]}>
      <label className={sty["checkbox-label"]}>
        <input
          type="checkbox"
          checked={selectedLayers.includes(layer.key)}
          onChange={() => toggleLayer(layer.key)}
        />
        <span className={sty["sidebar-text"]}>
          {label}
        </span>
      </label>
    </div>
  );

  const findLayer = (key) =>
  availableLayers.find(l => l.key === key);

  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>{t('map_layers')}</h3>
      <div className={sty["faq-container"]}>
        <Category name="env" label={t('env_category')}>
          {findLayer("temp_summer") && renderCheckbox(findLayer("temp_summer"), t('display_summer_heat'))}
          {findLayer("temp_winter") && renderCheckbox(findLayer("temp_winter"), t('display_winter_cold'))}
        </Category> 
        <Category name="phy" label={t('phy_category')}>
          {findLayer("streetlight") && renderCheckbox(findLayer("streetlight"), t('display_light'))}
          {findLayer("trafic_light_wms") && renderCheckbox(findLayer("trafic_light_wms"), t('display_traffic'))}
          {findLayer("trafic_light") && renderCheckbox(findLayer("trafic_light"), t('display_traffic'))}
          {findLayer("tactile_guidance") && renderCheckbox(findLayer("tactile_guidance"), t('display_tactile'))}
          {findLayer("tree_wms") && renderCheckbox(findLayer("tree_wms"), t('display_tree'))}
          {findLayer("green_infrastructure_wms") && renderCheckbox(findLayer("green_infrastructure_wms"), t('display_green_inf'))}
          {findLayer("green_infrastructure") && renderCheckbox(findLayer("green_infrastructure"), t('display_green_inf'))}
          {findLayer("blue_infrastructure_wms") && renderCheckbox(findLayer("blue_infrastructure_wms"), t('display_blue_inf'))}
          {findLayer("transport_station_wms") && renderCheckbox(findLayer("transport_station_wms"), t('display_station'))}
          {findLayer("transport_station") && renderCheckbox(findLayer("transport_station"), t('display_station'))}
          {findLayer("sidewalk_narrow") && renderCheckbox(findLayer("sidewalk_narrow"), t('display_narrow'))}
          {findLayer("wc_disabled") && renderCheckbox(findLayer("wc_disabled"), t('display_wc'))}
          {findLayer("stair") && renderCheckbox(findLayer("stair"), t('display_stair'))}
          {findLayer("obstacle") && renderCheckbox(findLayer("obstacle"), t('display_obstacle'))}
          {findLayer("slope") && renderCheckbox(findLayer("slope"), t('display_slope'))}
          {findLayer("uneven_surfaces") && renderCheckbox(findLayer("uneven_surfaces"), t('display_uneven'))}
          {findLayer("poor_pavement") && renderCheckbox(findLayer("poor_pavement"), t('display_pavement'))}
          {findLayer("kerbs_high") && renderCheckbox(findLayer("kerbs_high"), t('display_kerb_high'))}
        </Category> 
        <Category name="psy" label={t('psy_category')}>
          {findLayer("facility_wms") && renderCheckbox(findLayer("facility_wms"), t('display_facility'))}
          {findLayer("facilities") && renderCheckbox(findLayer("facilities"), t('display_facility'))}
          {findLayer("pedestrian_flow_wms") && renderCheckbox(findLayer("pedestrian_flow_wms"), t('display_pedestrian_flow'))}
          {findLayer("pedestrian_flow") && renderCheckbox(findLayer("pedestrian_flow"), t('display_pedestrian_flow'))}
        </Category>
      </div>
    </div>
  );

}
 