import React from "react";
import { useState } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';
import Tooltip from "./Sidebar_Tooltip";

export default function AccessibilityControls({
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart, 
  handleResetResults,
  setStartPoints,
  setIsSearchZoom, 
}) {
  const { t } = useTranslation('common');

  const [address, setAddress] = useState("");

  // address geocoding function
  const geocodeAddress = async (addr) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (data.length > 0) {
        return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      }
    } catch (e) {
      console.error("Geocoding failed:", e);
    }
    return null;
  };

  const handleAddressSubmit = async () => {
    if (!address.trim()) return;
    const coords = await geocodeAddress(address);
    if (coords) {
      setStartPoints([coords]);  // update start points with geocoded coordinates
      setIsSearchZoom?.(true);
    } else {
      alert("Address not found, please try another.");
    }
  };

  const [showWalkingSpeedTooltip, setShowWalkingSpeedTooltip] = React.useState(false);
  const walkingSpeedTooltipRef = React.useRef();

  return (
    <div className={sty["sidebar-section"]}>
      <h3 className={sty["sidebar-title"]}>{t('accessibility_title')}</h3>

      <div className={sty["sidebar-text-bold"]}>
        {t('walking_time')} <span className={sty["sidebar-text"]}>({walkingTime} min)</span>
      </div>
      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min="1"
          max="60"
          step="1"
          value={walkingTime}
          onChange={(e) => setWalkingTime(Number(e.target.value))}
        />
      </div>

      <div className={sty["sidebar-text-bold"]}style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {t('walking_speed')} <span className={sty["sidebar-text"]} >({walkingSpeed} km/h)</span>
        <span
          className={sty["info-icon"]}
          ref={walkingSpeedTooltipRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowWalkingSpeedTooltip(prev => !prev);
          }}
        >
          i
        </span>
        <Tooltip
          show={showWalkingSpeedTooltip}
          type="walkingSpeed"
          anchorRef={walkingSpeedTooltipRef}
          onClose={() => setShowWalkingSpeedTooltip(false)}
        />
      </div>
      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min="2"
          max="8"
          step="0.1"
          value={walkingSpeed}
          onChange={(e) => setWalkingSpeed(Number(e.target.value))}
        />
        <div className={sty["slider-labels"]}>
          <span>{t('speed_slow')}</span>
          <span>{t('speed_medium')}</span>
          <span>{t('speed_fast')}</span>
        </div>
      </div> 

      {/* address ------------------------------------------------*/}
      <hr className={sty["divider"]} />
      <div className={sty["sidebar-text-bold"]}>
        {t('select_start')} <br/>
        <span className={sty["sidebar-text"]}>{t('select_start_notice')}</span>
      </div>
      <div className={sty["address-section"]}>
        
        <div className={sty["search-row"]}>
          {/* search address */}
          <div className={sty["search-bar"]}>
            <input
              type="text"
              placeholder="Search address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={sty["search-input"]}
            />
            <button onClick={handleAddressSubmit} className={sty["search-button"]}>
              🔍
            </button>
          </div>

          {/* select address by clicking the map */}
          <button
            onClick={() => setSelectingStart(true)}
            className={sty["icon-button"]}
            title={t('select_start')}  // mouseover tooltip
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
              alt="Select Start"
              className={sty["icon-img"]}
            />
          </button>
        </div>
      </div>
      <hr className={sty["divider"]} />


      <button onClick={handleResetResults} className={sty["setup-button"]}>
        <span className={sty["sidebar-text-bold"]}>{t('reset')}</span>
      </button>


      
    </div>
  );
}
