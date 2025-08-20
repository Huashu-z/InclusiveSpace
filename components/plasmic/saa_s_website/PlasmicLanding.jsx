import React, { useState } from "react";
import { useRouter } from "next/router";
import PlasmicHeader from "./PlasmicHeader";
import sty from "./PlasmicLanding.module.css";
import { useTranslation } from "next-i18next";

export default function PlasmicLanding() {
  const router = useRouter();
  const { t } = useTranslation("common");

  const cities = [
    { id: "hamburg", name: "Hamburg", logo: "/plasmic/saa_s_website/images/hamburg_logo.png", center: [53.5503, 9.9920] }, 
    { id: "penteli", name: "Penteli", logo: "/plasmic/saa_s_website/images/penteli_logo.png", center: [38.0491, 23.8653] },
  ];

  const [selectedCity, setSelectedCity] = useState("hamburg");

  const handleEnterMap = () => {
    const selected = cities.find(c => c.id === selectedCity);
    if (!selected) return;

    // temporary, other cities not yet finished
    // if (selected.id !== "hamburg") {
    //     alert(`Sorry, ${selected.name} map is still under construction.`);
    //     return;
    // }

    localStorage.setItem("selectedCity", selectedCity);
    localStorage.setItem("selectedCityCenter", JSON.stringify(selected.center));

    router.push({
        pathname: "/user",
        query: { city: selectedCity }
    });
    };

  return (
    <div className={sty.container}>
      <PlasmicHeader />

      {/* === CAT === */}
      <section className={sty.banner}>
        <div className={sty.bannerInner}>
          {/* 左侧：Logo -> 介绍卡片 -> 联系我们 */}
          <div className={sty.bannerLeft}>
            {/* Logo 与后续卡片同宽 */}
            <div className={sty.brandWrap}>
              <img
                src="/plasmic/saa_s_website/images/CAT_title_white.svg"
                alt="CAT — Comfort-based Accessibility Tool"
                className={sty.catTitleImg}
              />
            </div>

            {/* 介绍卡片（与 logo 等宽） */}
            <div className={sty.brandWrap}>
              <div className={sty.introCard}>
                <div className={sty.introHeading}>{t('landing_banner_title')}</div>
                <p className={sty.introText}>
                  {t('landing_banner_intro')}
                </p>
              </div>
            </div>

            {/* Contact us（与 logo 等宽） */}
            <div className={sty.brandWrap}>
              <div className = {sty.contactWrap}>
                <div className={sty.contactCaption}>
                  {t('landing_banner_contact_caption')}
                </div> 
              </div>
            </div>
          </div>

          {/* 右侧：两张城市卡 + “Share your thoughts” */}
          <div className={sty.bannerRight}>
            <div className={sty.cityCol}>

              {/* === City: Hamburg === */}
              <div
                className={sty.cityCardRow}
                onClick={() => {
                  // 进入 Hamburg
                  localStorage.setItem("selectedCity", "hamburg");
                  localStorage.setItem("selectedCityCenter", JSON.stringify([53.5503, 9.9920]));
                  // 跳转地图页
                  window.location.href = "/user?city=hamburg";
                }}
                role="button"
                aria-label="Enter Hamburg map"
              >
                <div className={sty.cityCircle}>
                  <span className={sty.cityCircleLabel}>{t('landing_city_hamburg')}</span>
                  <img
                    src="/plasmic/saa_s_website/images/hamburg_map.png"
                    alt="Hamburg preview"
                    className={sty.cityThumb}
                  />
                </div>
                <div className={sty.cityRect}>
                  <div>
                    {t('landing_city_hamburg_desc')}
                  </div>
                </div>
              </div>

              {/* === City: Penteli（未完成 -> 弹窗提示） === */}
              <div
                className={sty.cityCardRow}
                // onClick={() => {
                //   alert("Penteli map is still under construction.");
                // }}
                onClick={() => {
                  // 进入 Penteli
                  localStorage.setItem("selectedCity", "penteli");
                  localStorage.setItem("selectedCityCenter", JSON.stringify([38.0491, 23.8653]));
                  window.location.href = "/user?city=penteli";
                }}
                role="button"
                // aria-label="Penteli map (under construction)"
                aria-label="Enter Penteli map"
              >
                <div className={sty.cityCircle}>
                  <span className={sty.cityCircleLabel}>{t('landing_city_penteli')}</span>
                  <img
                    src="/plasmic/saa_s_website/images/penteli_map.png"
                    alt="Penteli preview"
                    className={sty.cityThumb}
                  />
                </div>
                <div className={sty.cityRect}>
                  <div>
                    {t('landing_city_penteli_desc')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
        <div className={sty.bannerBtnRow}>
          {/* Contact us */}
          <div className={sty.bannerBtnCol}>
            {/* <div className={sty.contactCaption}>{t('landing_banner_contact_caption')}</div> */}
            <button
              className={sty.contactBtn}
              onClick={() => {
                const block = document.getElementById('contact-info');
                if (block) block.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('landing_banner_contact_btn')}
            </button>
          </div>

          {/* Share your thoughts */}
          <div className={sty.bannerBtnCol}>
            <button
              className={sty.feedbackBtn}
              onClick={() => alert(t('feature_under_construction'))}
            >
              {t('landing_banner_share_btn')}
            </button>
          </div>
        </div>
      </section> 

      {/* === Details about CAT === */}
      <section className={sty.toolDetailsSection}>
        <h2 className={sty.toolDetailsTitle}>{t('landing_general_title')}</h2>
        <div className={sty.toolDetailsInner}>
          {/* 左侧 logo */}
          <div className={sty.toolDetailsLogoWrap}>
            <img
              src="/plasmic/saa_s_website/images/logoIS2.png"
              alt="InclusiveSpaces Logo"
              className={sty.toolDetailsLogo}
            />
          </div>
          {/* 右侧文字与按钮 */}
          <div className={sty.toolDetailsRight}>
            <div className={sty.toolDetailsText}>
              {t("landing_details_blocks", { returnObjects: true }).map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <button
              className={sty.toolDetailsBtn}
              onClick={() => {
                window.open("https://inclusivespaces-heproject.eu/", "_blank");
              }}
            >
              {t('landing_visit_inclusive')}
            </button>
          </div>
        </div>
        {/* general information section 2 */}
        <div className={sty.toolDetailsInner}>
          {/* 左侧文字与按钮 */}
          <div className={sty.toolDetailsRight}>
            <div className={sty.toolDetailsText}>
              {t("landing_general_blocks", { returnObjects: true }).map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>
          {/* 右侧 logo *2 */}
          <div className={sty.toolDetailsLogoWrap}>
            <img
              src="/plasmic/saa_s_website/images/logo_co-founded-eu_full.png"
              alt="InclusiveSpaces Logo"
              className={sty.toolDetailsLogo}
            />
          </div>
          <div className={sty.toolDetailsLogoWrap}>
            <img
              src="/plasmic/saa_s_website/images/build4people_logo.png"
              alt="InclusiveSpaces Logo"
              className={sty.toolDetailsLogo}
            />
          </div>
          
        </div>
      </section>

      {/* === General information === */}
      <section className={sty.generalInfoSection}>
        <div className={sty.generalInfoInner}> 
          <div className={sty.generalInfoText}> 
            <div id="contact-info" className={sty.contactInfoBlock}>
              <b>{t('landing_contact_title')}</b><br />
              {t('landing_contact_duran')} (<a href="mailto:david.duran@tum.de">david.duran@tum.de</a>)<br />
              {t('landing_contact_buettner')} (<a href="mailto:benjamin.buettner@tum.de">benjamin.buettner@tum.de</a>)<br />
              {t('landing_contact_zuckriegl')} (<a href="mailto:lea.zuckriegl@tum.de">lea.zuckriegl@tum.de</a>)<br />
              {t('landing_contact_zuniga')} (<a href="mailto:mariajose.zuniga@tum.de">mariajose.zuniga@tum.de</a>)<br />
              {t('landing_contact_huashu')} (<a href="mailto:huashuzhan@tum.de">huashu.zhan@tum.de</a>)<br />
            </div>
          </div>
          
          <div className={sty.partnerLogos}>
            {/* Place your logos here, e.g.: */}
            <img src="/plasmic/saa_s_website/images/logo_co-founded-eu_full.png" alt="EU Logo f" />
            <img src="/plasmic/saa_s_website/images/logoIS_full.png" alt="InclusiveSpaces Logo f" />
            <img src="/plasmic/saa_s_website/images/tum_logo_full.png" alt="TUM Logo f" />
            {/* Add other partner logos as needed */}
          </div>
        </div>
      </section>
    </div>
  );
}
