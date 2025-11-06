import * as React from "react";
import PlasmicHeader from "./plasmic/saa_s_website/PlasmicHeader";
import sty from "./plasmic/saa_s_website/PlasmicHeader.module.css";
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

  // language selection setting
  const router = useRouter();
  const currentLocale = router.locale || "en";

  // === left ===
  let left = null;
  // map page show all logos in header，landing only show CAT logo
  if (variant === "map") {
    left = (
      <>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/images/logo_co-founded-eu.png" alt={t('logo_EU')} />
          </div>
        </Link>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/images/logoIS.png" alt={t('logo_IS')} />
          </div>
        </Link>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/images/tum_logo.png" alt={t('logo_TUM')} />
          </div>
        </Link>
      </>
    );
  } else if (variant === "landing") {
    // only blue CAT logo on left
    left = (
      <Link href={`/`}>
        <img
          src="/images/CAT_logo_white.svg"
          alt={t('logo_CAT')}
          className={sty["CAT-logo"]}
          style={{ marginLeft: 0 }}
        />
      </Link>
    );
  }

  // === middle ===
  let center = null;
  if (variant === "map") {
    // center: CAT logo
    center = (
      <Link href={`/`}>
        <img
          src="/images/CAT_logo_blue.svg"
          alt={t('logo_CAT')}
          className={sty["CAT-logo"]}
        />
      </Link>
    );
  }

  // === right: button ===
  const right = (
    <>
      {/* language selection */}
      <span className={sty["lang-switch-wrap"]}>
        {["de", "en", "el"].map((lng, idx, arr) => (
          <React.Fragment key={lng}>
            <Link href={router.asPath} locale={lng} className={currentLocale === lng ? sty["lang-active"] : ""}>{lng}</Link>
            {idx < arr.length - 1 && " | "}
          </React.Fragment>
        ))}
      </span>
      {/* map page show "help" button */}
      {variant === "map" && (
        <button
          className={sty["help-button"]}
          title={t('header_tool_instruction')}
          aria-label={t('header_tool_instruction')}
          aria-haspopup="dialog"
          onClick={() => setShowHelp(true)}
        >i</button>
      )}
      {/* map page show "city selection" */}
      {variant === "map" && (
        <div className={sty["city-button-wrapper"]}>
          <button
            onClick={() => setShowCityMenu(prev => !prev)}
            className={sty["city-button"]}
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
            <div className={sty["city-dropdown"]}>
              {[
                { id: "hamburg", name: "Hamburg", center: [53.5503, 9.9920] },
                { id: "penteli", name: "Penteli", center: [38.0491, 23.8653] },
              ].map(city => (
                <div
                  key={city.id}
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
                </div>
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

  return (
    <>
      <PlasmicHeader
        left={left}
        center={center}
        right={right}
        ref={ref}
        className={headerClass}
      />
      {/* "help" pop up in map page */}
      {variant === "map" && showHelp && (
        <div className={sty["modal-overlay"]} onClick={() => setShowHelp(false)}>
          <div className={sty["modal-content"]} onClick={e => e.stopPropagation()}>
            <h2>{t('modal_help_title')}</h2>
            <p className={sty["section-intro"]}>{t('modal_help_intro')}</p>
            <hr className={sty["modal-divider"]} />
            <div className={sty["section"]}>
              <h3>How to use it:</h3>
              <ul>
                <li>{t('modal_howto_step_select_start')}</li>
                <li>{t('modal_howto_step_adjust')}</li>
                <li>{t('modal_howto_step_enable_features')}</li>
                <li>{t('modal_howto_step_get_area')}</li>
                <li>{t('modal_howto_step_view_results')}</li>
              </ul>
            </div>
            <hr className={sty["modal-divider"]} />
            <div className={sty["section"]}>
              <h3>{t('modal_tips_title')}</h3>
              <ul>
                <li>{t('modal_tips_step_toggle_layers')}</li>
                <li>{t('modal_tips_step_adjust_weights')}</li>
                <li>{t('modal_tips_step_reset')}</li>
              </ul>
            </div>
            <hr className={sty["modal-divider"]} />
            <p className={sty["section-outro"]}>{t('modal_outro')}</p>
            <button onClick={() => setShowHelp(false)} className={sty["modal-close"]}>
              {t('modal_close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default React.forwardRef(Header);
