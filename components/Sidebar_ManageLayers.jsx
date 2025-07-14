import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';

export default function MapLayers({ selectedLayers, toggleLayer }) {
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
          {renderCheckbox("temp_summer", t('display_summer_heat'))}
          {renderCheckbox("temp_winter", t('display_winter_cold'))}
        </Category>

        <Category name="phy" label={t('phy_category')}>
          {renderCheckbox("streetlight", t('display_light'))}
          {renderCheckbox("trafic_light_wms", t('display_traffic'))}
          {renderCheckbox("tactile_guidance", t('display_tactile'))}
          {renderCheckbox("tree_wms", t('display_tree'))}
          {renderCheckbox("green_infrastructure", t('display_green_inf'))}
          {renderCheckbox("blue_infrastructure", t('display_blue_inf'))}
          {renderCheckbox("transport_station_wms", t('display_station'))}
          {renderCheckbox("sidewalk_narrow", t('display_narrow'))}
          {renderCheckbox("wc_disabled", t('display_wc'))} 
          {renderCheckbox("accessible_ramp", t('display_ramp'))}
          {renderCheckbox("stair", t('display_stair'))}
          {renderCheckbox("elevator", t('display_elevator'))}
          {renderCheckbox("obstacle", t('display_obstacle'))}
          {renderCheckbox("slope", t('display_slope'))}
          {renderCheckbox("uneven_surfaces", t('display_uneven'))}
          {renderCheckbox("poor_pavement", t('display_pavement'))}
          {renderCheckbox("kerbs_high", t('display_kerb_high'))}
        </Category>

        <Category name="psy" label={t('psy_category')}>
          {renderCheckbox("facility_wms", t('display_facility'))}
          {renderCheckbox("pedestrian_flow_wms", t('display_pedestrian_flow'))}
        </Category>
      </div>
    </div>
  );
}
 