import React from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';

export default function AccessibilityControls({
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  // startPoints,
  // setComputeAccessibility,
  handleResetResults
}) {
  const { t } = useTranslation('common');
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

      <div className={sty["sidebar-text-bold"]}>
        {t('walking_speed')} <span className={sty["sidebar-text"]}>({walkingSpeed} km/h)</span>
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

      <div className={sty["button-container"]}>
        <button onClick={() => setSelectingStart(true)} className={sty["setup-button"]}>
          <img src="https://cdn-icons-png.flaticon.com/512/684/684908.png" alt="Location Icon" className={sty["img"]} />
          <span className={sty["sidebar-text-bold"]}>{t('select_start')}</span>
        </button>

        <button onClick={handleResetResults} className={sty["setup-button"]}>
          <span className={sty["sidebar-text-bold"]}>{t('reset')}</span>
        </button>
      </div> 
    </div>
  );
}
