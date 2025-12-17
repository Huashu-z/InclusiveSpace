import React, { useState, useMemo, useRef, useEffect } from "react";
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
  selectingStart,
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
    setLiveMessage(t('sr_search_in_progress'));
    try {
      const results = await searchAddressSuggestions(q);
      setAddrResults(results);
      requestAnimationFrame(() => inputRef.current?.focus());
      setActiveIndex(results.length > 0 ? 0 : -1);
      setLiveMessage(results.length
        ? t('sr_search_success')
        : t('sr_no_results'));
    } catch {
      setAddrResults([]);
      setLiveMessage(t('sr_search_failed'));
    }
  };

  const [showWalkingSpeedTooltip, setShowWalkingSpeedTooltip] = useState(false);
  const walkingSpeedTooltipRef = useRef();

  // control walking time and walking speed slider
  const toPct = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return Math.min(100, Math.max(0, pct));
  };
  const walkingTimePct = useMemo(() => toPct(walkingTime, 1, 30), [walkingTime]);
  const walkingSpeedPct = useMemo(() => toPct(walkingSpeed, 3, 6), [walkingSpeed]);

  const inputRef = useRef(null);
  const listboxRef = useRef(null);
  const optionElsRef = useRef([]);

  React.useEffect(() => {
    if (!selectingStart) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectingStart(false);
        setLiveMessage("");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [selectingStart, setSelectingStart]);

  React.useEffect(() => {
    if (addrResults.length > 0 && activeIndex < 0) {
      setActiveIndex(0);
    }
  }, [addrResults, activeIndex]);

  const selectAddressResult = (r) => {
    setAddrQuery(r.label);
    setAddress(r.label);
    setAddrResults([]);
    setActiveIndex(-1);

    setStartPoints((prev) =>
      Array.isArray(prev) ? [...prev, [r.lon, r.lat]] : [[r.lon, r.lat]]
    );
    setIsSearchZoom?.(true);

    setLiveMessage(t("sr_start_set_to") + ` ${r.label}`);
  };

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = optionElsRef.current[activeIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className={sty["sidebar-section"]} aria-labelledby="accessibility-heading">
      <div role="status" aria-live="polite" className={sty["sr-only"]}>{liveMessage}</div>

      {/* <h3 className={sty["sidebar-title"]}>{t('accessibility_title')}</h3> */}
      <div className={sty["sidebar-section-title"]} id="accessibility-heading">
        <img src="/images/icon_accessibility.png" alt={t("icon_accessibility_control")} />
        <span>{t("accessibility_title")}</span>
      </div>

      {/* Walking time */}
      <div className={sty["sidebar-text-bold"]}>
        {t('walking_time')} <span className={sty["sidebar-text"]}>({walkingTime} min)</span>
      </div>
      <label htmlFor="walking-time-slider" className={sty["sr-only"]}>
        {t('walking_time')}
      </label>
      <div className={sty["sidebar-slider"]}>
        <input
          id="walking-time-slider"
          className={`${sty["range-filled"]} ${sty.kbdFocus}`}
          style={{ "--pct": `${walkingTimePct}%` }}
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

      {/* Walking speed */}
      <div className={sty["sidebar-text-bold"]} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {t('walking_speed')}{" "}
        <span className={sty["sidebar-text"]}>({walkingSpeed} km/h)</span>
        <button
          className={`${sty["info-icon"]} ${sty.kbdFocus}`}
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
          id="walking-speed-slider"
          className={`${sty["range-filled"]} ${sty.kbdFocus}`}
          style={{ "--pct": `${walkingSpeedPct}%` }}
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

      {/* Select start / address input section */}
      <hr className={sty["divider"]} />

      {/* address input section */}
      <section
        className={sty["address-section"]}
        aria-labelledby="select-start-heading"
      >
        <div 
          id="select-start-heading" 
          className={`${sty["sidebar-text-bold"]} ${sty["select-start-heading"]}`}
        >
          {t('select_start')} <br />
          <span className={sty["sidebar-text"]}>{t('select_start_notice')}</span>
        </div> 
        {/* for screen reader */}
        <p id="sr-select-start-desc" className={sty["sr-only"]}>
          {t('sr_select_start_description')}
        </p>
 
        <div className={sty["search-row"]}>
          {/* address text + buttons always visible */}
          <div className={sty["search-bar"]}>
            <label
              htmlFor="address-input"
              className={sty["sr-only"]}
            > 
              {t('search_address')}
            </label>
            <input
              id="address-input"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={addrResults.length > 0}
              aria-controls="address-listbox"
              aria-activedescendant={activeIndex >= 0 ? `addr-option-${activeIndex}` : undefined}
              placeholder={t('search_address')}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setActiveIndex(-1);
              }}
              ref={inputRef}
              onKeyDown={(e) => {
                const hasList = addrResults.length > 0;

                if (e.key === "ArrowDown" && hasList) {
                  e.preventDefault();
                  setActiveIndex((prev) => Math.min(prev + 1, addrResults.length - 1));
                  return;
                } else if (e.key === "ArrowUp" && hasList) {
                  e.preventDefault();
                  setActiveIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter") {
                  const hasList = addrResults.length > 0;
                  if (hasList && activeIndex >= 0) {
                    e.preventDefault();
                    selectAddressResult(addrResults[activeIndex]);
                  } else {
                    e.preventDefault();
                    handleAddressSubmit();
                  }
                } else if (e.key === "Escape" && hasList) {
                  e.preventDefault();
                  setAddrResults([]);
                  setActiveIndex(-1);
                }
              }}
              className={`${sty["search-input"]} ${sty.kbdFocus}`}
              aria-label={t('search_address')}
              aria-describedby="sr-select-start-desc" 
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddressSubmit}
              className={`${sty["search-button"]} ${sty.kbdFocus}`}
              aria-label={t('search_address')}
              title={t('search_address')}
            >
              🔍
            </button>

            {/* Dropdown list when address search is active */}
            {addrResults.length > 0 && (
              <ul
                id="address-listbox"
                role="listbox"
                className={sty["addr-listbox"]}
                ref={listboxRef}
              >
                {addrResults.map((r, i) => (
                  <li
                    key={r.label}
                    id={`addr-option-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    ref={(el) => (optionElsRef.current[i] = el)}
                    className={i === activeIndex ? sty["option-active"] : sty["option"]}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectAddressResult(r);
                    }}
                  >
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectingStart((prev) => {
                const next = !prev;
                setLiveMessage(next ? t('sr_select_start_enabled') : "");
                return next;
              });
            }}
            className={`${sty["icon-button"]} ${sty.kbdFocus}`}
            aria-label={t('select_start')}
            aria-pressed={!!selectingStart}
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
      </section>

      <hr className={sty["divider"]} /> 

      <button onClick={handleResetResults} className={`${sty["setup-button"]} ${sty.kbdFocus}`}>
        <span className={sty["sidebar-text-bold"]}>{t('reset')}</span>
      </button> 
    </div>
  );
}
