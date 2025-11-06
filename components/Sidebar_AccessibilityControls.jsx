import React, { useState, useMemo, useRef } from "react";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';
import Tooltip from "./Sidebar_Tooltip";

export default function AccessibilityControls({
  city,
  cityBoundaries,
  walkingTime,
  setWalkingTime,
  walkingSpeed,
  setWalkingSpeed,
  setSelectingStart,
  handleResetResults,
  setStartPoints,
  setIsSearchZoom
}) {
  const { t } = useTranslation('common');

  const [liveMessage, setLiveMessage] = useState("");
  const [address, setAddress] = useState("");
  const [startMethod, setStartMethod] = useState("map"); // "map" or "address"
  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchAddressSuggestions = async (q, { limit = 8 } = {}) => {
    const params = new URLSearchParams({
      format: "json",
      addressdetails: "0",
      q,
      limit: String(limit)
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    const data = await res.json();
    return (data || []).map(d => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon)
    }));
  };

  const handleAddressSubmit = async () => {
    const q = (address ?? '').trim();
    if (!q) return;
    setStartMethod('address');
    setAddrQuery(q);
    setActiveIndex(-1);
    setLiveMessage(t('sr_search_in_progress', { defaultValue: 'Searching address...' }));
    try {
      const results = await searchAddressSuggestions(q);
      setAddrResults(results);
      setLiveMessage(results.length
        ? t('sr_search_success', { defaultValue: 'Address suggestions updated' })
        : t('sr_no_results', { defaultValue: 'No address found' }));
    } catch {
      setAddrResults([]);
      setLiveMessage(t('sr_search_failed', { defaultValue: 'Address search failed' }));
    }
  };

  const [showWalkingSpeedTooltip, setShowWalkingSpeedTooltip] = useState(false);
  const walkingSpeedTooltipRef = useRef();

  return (
    <div className={sty["sidebar-section"]}>
      <div role="status" aria-live="polite" className={sty["sr-only"]}>{liveMessage}</div>

      <h3 className={sty["sidebar-title"]}>{t('accessibility_title')}</h3>

      <div className={sty["sidebar-text-bold"]}>
        {t('walking_time')} <span className={sty["sidebar-text"]}>({walkingTime} min)</span>
      </div>
      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={walkingTime}
          onChange={(e) => setWalkingTime(Number(e.target.value))}
          aria-label={t('walking_time')}
          aria-valuemin={1}
          aria-valuemax={30}
          aria-valuenow={walkingTime}
          aria-valuetext={`${walkingTime} ${t('minutes')}`}
        />
      </div>

      <div className={sty["sidebar-text-bold"]} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {t('walking_speed')} <span className={sty["sidebar-text"]}>({walkingSpeed} km/h)</span>
        <button
          className={sty["info-icon"]}
          ref={walkingSpeedTooltipRef}
          onClick={(e) => { e.stopPropagation(); setShowWalkingSpeedTooltip(prev => !prev); }}
          aria-label={t('tooltip_walking_speed_title')}
          aria-haspopup="dialog"
          aria-expanded={showWalkingSpeedTooltip}
          aria-controls="tip-walking-speed"
        >
          i
        </button>
        <Tooltip
          show={showWalkingSpeedTooltip}
          type="walkingSpeed"
          anchorRef={walkingSpeedTooltipRef}
          onClose={() => setShowWalkingSpeedTooltip(false)}
          id="tip-walking-speed"
        />
      </div>

      <div className={sty["sidebar-slider"]}>
        <input
          type="range"
          min={3}
          max={6}
          step={0.1}
          value={walkingSpeed}
          onChange={(e) => setWalkingSpeed(Number(e.target.value))}
          aria-label={t('walking_speed')}
          aria-valuemin={3}
          aria-valuemax={6}
          aria-valuenow={walkingSpeed}
          aria-valuetext={`${walkingSpeed} km/h`}
        />
        <div className={sty["slider-labels"]}>
          <span>{t('speed_slow')}</span>
          <span>{t('speed_medium')}</span>
          <span>{t('speed_fast')}</span>
        </div>
      </div>

      {/* address input section */}
      <hr className={sty["divider"]} />
      <div className={sty["sidebar-text-bold"]}>
        {t('select_start')} <br />
        <span className={sty["sidebar-text"]}>{t('select_start_notice')}</span>
      </div>

      <div className={sty["address-section"]}> 
        <div className={sty["search-row"]}>
          {/* address text + buttons always visible */}
          <div className={sty["search-bar"]}>
            <input
              placeholder={t('search_address')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={sty["search-input"]}
              aria-label={t('search_address')}
            />
            <button
              type="button"
              onClick={handleAddressSubmit}
              className={sty["search-button"]}
              aria-label={t('search_address')}
              title={t('search_address')}
            >
              🔍
            </button>

            {/* Dropdown list when address search is active */}
            {addrResults.length > 0 && (
              <ul role="listbox" className={sty["addr-listbox"]}>
                {addrResults.map((r, i) => (
                  <li
                    key={r.label}
                    id={`addr-option-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={i === activeIndex ? sty["option-active"] : sty["option"]}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAddrQuery(r.label);
                      setAddrResults([]);
                      setStartPoints((prev) =>
                        Array.isArray(prev) ? [...prev, [r.lon, r.lat]] : [[r.lon, r.lat]]
                      );
                      setIsSearchZoom?.(true);
                      setLiveMessage(t('sr_start_set_to', { defaultValue: 'Start set to' }) + ` ${r.label}`);
                    }}
                  >
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button 
            onClick={() => {
              setSelectingStart(true);
              setLiveMessage(t('sr_select_start_enabled', { defaultValue: 'Select start mode enabled' }));
            }}
            className={sty["icon-button"]}
            aria-label={t('select_start')}
            title={t('select_start')}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
              alt=""
              role="presentation"
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
