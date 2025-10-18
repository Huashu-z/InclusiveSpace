import * as React from "react";
import PlasmicHeader from "./plasmic/saa_s_website/PlasmicHeader";
import sty from "./plasmic/saa_s_website/PlasmicHeader.module.css";
import { useTranslation } from "next-i18next";
import Link from "next/link";

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

  // === 左侧部分 ===
  let left = null;
  // map 页显示 logo，landing 只显示 CAT logo
  if (variant === "map") {
    left = (
      <>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/plasmic/saa_s_website/images/logo_co-founded-eu.png" alt="EU Logo" />
          </div>
        </Link>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/plasmic/saa_s_website/images/logoIS.png" alt="IS Logo" />
          </div>
        </Link>
        <Link href={`/`}>
          <div className={sty["logo-wrapper"]}>
            <img src="/plasmic/saa_s_website/images/tum_logo.png" alt="TUM Logo" />
          </div>
        </Link>
      </>
    );
  } else if (variant === "landing") {
    // 只显示 CAT logo 蓝色（放左侧，不居中）
    left = (
      <Link href={`/`}>
        <img
          src="/plasmic/saa_s_website/images/CAT_logo_white.svg"
          alt="Tool Logo"
          className={sty["CAT-logo"]}
          style={{ marginLeft: 0 }}
        />
      </Link>
    );
  }

  // === 中间部分 ===
  let center = null;
  if (variant === "map") {
    // 居中显示 CAT logo
    center = (
      <Link href={`/`}>
        <img
          src="/plasmic/saa_s_website/images/CAT_logo_blue.svg"
          alt="Tool Logo"
          className={sty["CAT-logo"]}
        />
      </Link>
    );
  }

  // === 右侧按钮 ===
  const right = (
    <>
      {/* map 和 landing 都显示语言切换 */}
      <span className={sty["lang-switch-wrap"]}>
        {["de", "en", "el"].map((lng, idx, arr) => (
          <React.Fragment key={lng}>
            <Link href="#" locale={lng} className={lng === "en" ? sty["lang-active"] : ""}>{lng}</Link>
            {idx < arr.length - 1 && " | "}
          </React.Fragment>
        ))}
      </span>
      {/* map 显示 help 按钮 */}
      {variant === "map" && (
        <button
          className={sty["help-button"]}
          title={t('header_tool_instruction')}
          onClick={() => setShowHelp(true)}
        >i</button>
      )}
      {/* map 显示城市选择 */}
      {variant === "map" && (
        <div className={sty["city-button-wrapper"]}>
          <button
            onClick={() => setShowCityMenu(prev => !prev)}
            className={sty["city-button"]}
            title="Select City"
          >
            <img
              src="/plasmic/saa_s_website/images/select_city.png"
              alt="Select Map"
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
                  onClick={() => {
                    setShowCityMenu(false);
                    localStorage.setItem("selectedCity", city.id);
                    localStorage.setItem("selectedCityCenter", JSON.stringify(city.center));
                    window.location.href = `/user?city=${city.id}`;
                  }}
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

  // 变体切换背景
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
      {/* help 弹窗仅地图页显示 */}
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
