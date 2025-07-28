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
          {renderCheckbox("hh_temp_summer", t('display_summer_heat'))}
          {renderCheckbox("hh_temp_winter", t('display_winter_cold'))}
        </Category>

        <Category name="phy" label={t('phy_category')}>
          {renderCheckbox("hh_streetlight", t('display_light'))}
          {renderCheckbox("hh_trafic_light_wms", t('display_traffic'))}
          {renderCheckbox("hh_tactile_guidance", t('display_tactile'))}
          {renderCheckbox("hh_tree_wms", t('display_tree'))}
          {renderCheckbox("hh_green_infrastructure", t('display_green_inf'))}
          {renderCheckbox("hh_blue_infrastructure", t('display_blue_inf'))}
          {renderCheckbox("hh_transport_station_wms", t('display_station'))}
          {renderCheckbox("hh_sidewalk_narrow", t('display_narrow'))}
          {renderCheckbox("hh_wc_disabled", t('display_wc'))} 
          {renderCheckbox("hh_accessible_ramp", t('display_ramp'))}
          {renderCheckbox("hh_stair", t('display_stair'))}
          {renderCheckbox("hh_obstacle", t('display_obstacle'))}
          {renderCheckbox("hh_slope", t('display_slope'))}
          {renderCheckbox("hh_uneven_surfaces", t('display_uneven'))}
          {renderCheckbox("hh_poor_pavement", t('display_pavement'))}
          {renderCheckbox("hh_kerbs_high", t('display_kerb_high'))}
        </Category>

        <Category name="psy" label={t('psy_category')}>
          {renderCheckbox("hh_facility_wms", t('display_facility'))}
          {renderCheckbox("hh_pedestrian_flow_wms", t('display_pedestrian_flow'))}
        </Category>
      </div>
    </div>
  );
}
 