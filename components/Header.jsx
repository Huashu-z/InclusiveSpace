import * as React from "react";
import PlasmicHeader from "./plasmic/saa_s_website/PlasmicHeader";
import sty from "./Header.module.css";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";

function Header(
  {
    showHelp,
    setShowHelp = () => {},
    variant = "map", // "map" or "landing"
  },
  ref
) {
  const [showCityMenu, setShowCityMenu] = React.useState(false);
  const { t } = useTranslation("common");

  // navigation bar for keyboard user
  const [skipOpen, setSkipOpen] = React.useState(false);
  const skipNavRef = React.useRef(null);
  const firstSkipRef = React.useRef(null);

  const isTypingTarget = (target) => {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      target.isContentEditable
    );
  };

  // language selection setting
  const router = useRouter();
  const currentLocale = router.locale || "en";

  const helpBtnRef = React.useRef(null);
  const closeBtnRef = React.useRef(null);
  const modalContentRef = React.useRef(null);
  const lastFocusRef = React.useRef(null);

  const closeHelp = React.useCallback(() => {
    setShowHelp(false);
  }, [setShowHelp]);

  // naviagation bar for keyboard user
  React.useEffect(() => {
    const onKeyDown = (e) => { 
      if (isTypingTarget(e.target)) return;

      // Alt+N：navigation links
      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        setSkipOpen(true); 
        requestAnimationFrame(() => {
          firstSkipRef.current?.focus();
        });
        return;
      }
      // Esc
      if (e.key === "Escape") {
        if (skipOpen) {
          e.preventDefault();
          setSkipOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [skipOpen]);

  // show help
  React.useEffect(() => {
    if (!showHelp) return;
    lastFocusRef.current = document.activeElement;
    requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHelp();
        return;
      }

      if (e.key === "Tab") {
        const root = modalContentRef.current;
        if (!root) return;

        const focusables = root.querySelectorAll(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [showHelp, closeHelp]);

  React.useEffect(() => {
    if (showHelp) return;
    requestAnimationFrame(() => {
      const el = lastFocusRef.current;
      if (el && typeof el.focus === "function") el.focus();
      else helpBtnRef.current?.focus();
    });
  }, [showHelp]);

  // === left ===
  let left = null;
  // map page show all logos in header，landing only show CAT logo
  if (variant === "map") {
    left = (
      <div
        className={sty["logo-group"]}
        role="group"
        aria-label={t("header_partner_logos")}
      >
        {/* EU logo */}
        <a
          href="https://inclusivespaces-heproject.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className={`${sty["logo-wrapper"]} ${sty.focusRing}`}
          aria-label={t("logo_EU")}
        >
          <img src="/images/logo_co-founded-eu.png" alt="" aria-hidden="true" />
        </a>

        {/* InclusiveSpaces logo */}
        <a
          href="https://inclusivespaces-heproject.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className={`${sty["logo-wrapper"]} ${sty.focusRing}`}
          aria-label={t("logo_IS")}
        >
          <img src="/images/logoIS.png" alt="" aria-hidden="true" />
        </a>

        {/* TUM logo */}
        <a
          href="https://www.mos.ed.tum.de/sv/forschung-und-beratung/projekte/eu-projects/inclusivespaces/"
          target="_blank"
          rel="noopener noreferrer"
          className={`${sty["logo-wrapper"]} ${sty.focusRing}`}
          aria-label={t("logo_TUM")}
        >
          <img src="/images/tum_logo.png" alt="" aria-hidden="true" />
        </a>
      </div>
    );

  } else if (variant === "landing") {
    // only white CAT logo on left
    left = (
      <Link href={`/`} className={sty.focusRing}>
        {/* <img
          src="/images/CAT_logo_white.svg"
          alt={t('logo_CAT')}
          className={sty["CAT-logo"]}
          style={{ marginLeft: 0 }}
        /> */}
      </Link>
    );
  }

  // === middle ===
  let center = null;
  if (variant === "map") { 
    center = (
      <div
        className={sty["center-title-wrapper"]}
        role="heading"
        aria-level={1}
      >
        <Link href={`/`}>
          {/* The title text (for screen readers) */}
          <span className={sty["sr-only"]}>
            {t("logo_CAT_header")}
          </span>
          <img
            src="/images/CAT_logo_blue.svg"
            alt=""
            aria-hidden="true"
            className={sty["CAT-logo"]}
          />
        </Link>
      </div>
    );
  }

  // === right: button ===
  const languages = ["de", "en", "el"];
  const right = (
    <>
      {/* language selection */}
      <nav
        className={sty["lang-switch-wrap"]}
        aria-label={t("aria_language_switcher")}
      >
        <ul className={sty["lang-list"]}>
          {languages.map((lng) => (
            <li key={lng} className={sty["lang-list-item"]}>
              <Link
                href={router.asPath}
                locale={lng}
                className={[
                  sty.langLink,
                  sty.focusRing,
                  currentLocale === lng ? sty["lang-active"] : ""
                ].filter(Boolean).join(" ")}
                aria-current={currentLocale === lng ? "page" : undefined}
              >
                {lng.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* map page show "help" button */}
      {variant === "map" && (
        <button
          ref={helpBtnRef}
          type="button"
          className={`${sty["help-button"]} ${sty.focusRing}`}
          title={t('header_tool_instruction')}
          aria-label={t('header_tool_instruction')}
          aria-haspopup="dialog"
          aria-expanded={showHelp}
          aria-controls="help-dialog"
          onClick={() => setShowHelp(true)}
        >
          i
        </button>
      )}
      {/* map page show "city selection" */}
      {variant === "map" && (
        <div className={sty["city-button-wrapper"]}>
          <button
            onClick={() => setShowCityMenu(prev => !prev)}
            className={`${sty["city-button"]} ${sty.focusRing}`}
            title={t('header_select_city')}
            aria-label={t('header_select_city')}
            aria-haspopup="menu"
            aria-expanded={showCityMenu}
            aria-controls="city-menu"
          >
            <img
              src="/images/select_city.png"
              alt={t('header_select_city')}
              className={sty["city-icon"]}
            />
          </button>
          {showCityMenu && (
            <div
              className={sty["city-dropdown"]}
              id="city-menu"
              role="menu"
              aria-label={t("header_select_city")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowCityMenu(false);
              }}
            >
              {[
                { id: "hamburg", name: "Hamburg", center: [53.5503, 9.9920] },
                { id: "penteli", name: "Penteli", center: [38.0491, 23.8653] },
              ].map(city => (
                <button
                  key={city.id}
                  type="button"
                  className={sty["city-item"]}
                  role="menuitem"
                  onClick={() => {
                    setShowCityMenu(false);
                    localStorage.setItem("selectedCity", city.id);
                    localStorage.setItem("selectedCityCenter", JSON.stringify(city.center));
                    window.location.href = `/user?city=${city.id}`;
                  }}
                  aria-label={`Switch to ${city.name}`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  // header color variation (landing, map pages)
  const headerClass =
    variant === "landing"
      ? [sty["header-container"], sty["landing-header-bg"], sty["landing-header-text"]].join(" ")
      : sty["header-container"];

  const focusTarget = (e, id) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.setAttribute("tabindex", "-1");
    el.focus();
    window.location.hash = id;
  };

  return (
    <>
      <nav
        ref={skipNavRef}
        className={`${sty.skipLinks} ${skipOpen ? sty.skipLinksOpen : ""}`}
        aria-label={t("nav_links")}
        onBlur={(e) => { 
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setSkipOpen(false);
          }
        }}
      >
        {variant === "map" && (
          <>
            <a
              ref={firstSkipRef}
              href="#profile"
              className={sty.skipLink}
              onClick={(e) => focusTarget(e, "profile")}
            >
              {t("nav_to_profile")}
            </a>

            <a
              href="#sidebar"
              className={sty.skipLink}
              onClick={(e) => focusTarget(e, "sidebar")}
            >
              {t("nav_to_sidebar")}
            </a>

            <a
              href="#legend"
              className={sty.skipLink}
              onClick={(e) => focusTarget(e, "legend")}
            >
              {t("nav_to_results")}
            </a>

            <a
              href="#map-region"
              className={sty.skipLink}
              onClick={(e) => focusTarget(e, "map-region")}
            >
              {t("nav_to_map")}
            </a>
          </>
        )}
      </nav>

      <PlasmicHeader
        left={left}
        center={center}
        right={right}
        ref={ref}
        className={headerClass}
        navAriaLabel={t("header_tools_nav")}
      />
      {/* "help" pop up in map page */}
      {variant === "map" && showHelp && (
        <div
          className={sty["modal-overlay"]}
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-help-title"
          id="help-dialog"
        >
          <div
            className={sty["modal-content"]}
            ref={modalContentRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ---------- 1.Row welcome title ---------- */}
            <div className={sty["modal-header-block"]}>
              <h2 id="cat-help-title" className={sty["modal-main-title"]}>
                {t("modal_help_title")}
              </h2>
              <p className={sty["section-intro"]}>
                {t("modal_help_intro")}
              </p>
            </div>

            {/* ---------- 2. Row（AccessibilityControls + VariableControls） ---------- */}
            <h3 className={sty["modal-subtitle"]}>
              {t("modal_subtitle_steps")}
            </h3>
            <div className={sty["modal-row"]}>
              {/* Step 1: AccessibilityControls */}
              <div className={`${sty["modal-card"]} ${sty["modal-card-step"]}`}>
                <div className={sty["step-badge"]}>
                  <img src="/images/icon_accessibility.png" alt={t("icon_accessibility_control")} />
                </div>
                <h3 className={sty["modal-card-title"]}>
                  {t("accessibility_title")}
                </h3>
                <p className={sty["modal-card-text"]}>
                  {t("modal_howto_step_select_start")}
                </p>
                <p className={sty["modal-card-text"]}>
                  {t("modal_howto_step_adjust")}
                </p>
                
              </div>

              {/* Step 2: VariableControls */}
              <div className={`${sty["modal-card"]} ${sty["modal-card-step"]}`}>
                <div className={sty["step-badge"]}>
                  <img src="/images/icon_features.png" alt={t("icon_discomfort_feature")} />
                </div>
                <h3 className={sty["modal-card-title"]}>
                  {t("leg_comfort_features")}
                </h3>
                <p className={sty["modal-card-text"]}>
                  {t("modal_howto_step_enable_features")}
                </p>
                <p className={sty["modal-card-text"]}>
                  {t("modal_tips_step_adjust_weights")}
                </p>
                <p className={sty["modal-card-text"]}>
                  {t("modal_howto_step_get_area")}
                </p>
              </div>
            </div>

            {/* ---------- 3. Row：3 cards（Profile / Legend / MapLayers） ---------- */}
            <h3 className={sty["modal-subtitle"]}>
              {t("modal_subtitle_more")}
            </h3>
            <div className={sty["modal-row"]}>
              {/* MapLayers card/ data information */}
              <div className={`${sty["modal-card"]} ${sty["modal-card-icon"]} ${sty["icon-card"]}`}>
                <div className={sty["icon-circle"]}>
                  <img src="/images/help_data.png" alt={t("icon_data_info")} />
                </div>
                <h3 className={sty["icon-card-title"]}>
                  {t("map_layers")}
                </h3>
                <p className={sty["icon-card-text"]}>
                  {t("modal_layers_desc")}
                </p>
              </div>

              {/* Profile card */}
              <div className={`${sty["modal-card"]} ${sty["modal-card-icon"]} ${sty["icon-card"]}`}>
                <div className={sty["icon-circle"]}>
                  <img src="/images/profile.png" alt={t("icon_profile")} />
                </div>
                <h3 className={sty["icon-card-title"]}>
                  {t("profile_title")}
                </h3>
                <p className={sty["icon-card-text"]}>
                  {t("modal_profile_desc")}
                </p>
              </div>

              {/* Legend card/ catchemtn area results */}
              <div className={`${sty["modal-card"]} ${sty["modal-card-icon"]} ${sty["icon-card"]}`}>
                <div className={sty["icon-circle"]}>
                  <img src="/images/help_result.png" alt={t("icon_catchment_area")} />
                </div>
                <h3 className={sty["icon-card-title"]}>
                  {t("leg_catchment_result")}
                </h3>
                <p className={sty["icon-card-text"]}>
                  {t("modal_legend_desc")}
                </p>
              </div>
              
            </div>

            {/* Keyboard shortcut hint */}
            <p className={sty["modal-shortcut-hint"]}>
              {/* Screen reader only (no SVG) */}
              <span className={sty.srOnly}>
                {t("modal_shortcut_skipnav_sr")}
              </span>
              {/* Visual line (SVGs), hidden from screen readers */}
              <span className={sty.shortcutVisual} aria-hidden="true">
                <img
                  src="/images/keyboard.svg"
                  alt=""
                  aria-hidden="true"
                  className={sty.shortcutIcon}
                />
                <span className={sty.shortcutText}>
                  {t("modal_shortcut_skipnav_prefix")}
                </span>
                <span className={sty.kbdCombo}>
                  <img src="/images/key_alt.svg" alt="" aria-hidden="true" className={sty.keyIcon} />
                  <span className={sty.kbdPlus}>+</span>
                  <img src="/images/key_N.svg" alt="" aria-hidden="true" className={sty.keyIcon} />
                </span>
                <span className={sty.shortcutText}>
                  {t("modal_shortcut_skipnav_suffix")}
                </span>
              </span>
            </p>

            {/* ---------- close button ---------- */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setShowHelp(false)}
              className={sty["modal-close"]}
            >
              {t("modal_close")}
            </button>
          </div>

        </div>
      )}
    </>
  );
}

export default React.forwardRef(Header);
