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
                <button
                  className={sty.contactBtn}
                  onClick={() => {
                    const block = document.getElementById('contact-info');
                    if (block) {
                      block.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  aria-label="Contact us about deploying CAT in your city"
                >
                  {t('landing_banner_contact_btn')}
                </button>
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
                    src="/plasmic/saa_s_website/images/hamburg_map_logo.png"
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
                    src="/plasmic/saa_s_website/images/penteli_map_logo.png"
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

              {/* === Share your thoughts === */}
              <div className={sty.feedbackWrap}>
                <button
                  className={sty.feedbackBtn}
                  onClick={() =>
                    alert("Feature under construction.")
                  }
                  aria-label="Share your thoughts"
                >
                  {t('landing_banner_share_btn')}
                </button>
              </div>

            </div>
          </div>
        </div>
      </section> 

      {/* === Details about CAT === */}
      <section className={sty.toolDetailsSection}>
        <div className={sty.toolDetailsInner}>
          <h2 className={sty.toolDetailsTitle}>{t('landing_details_title')}</h2>
          <div className={sty.toolDetailsText}>
            {t("landing_details_blocks", { returnObjects: true }).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* === General information === */}
      <section className={sty.generalInfoSection}>
        <div className={sty.generalInfoInner}>
          <h2 className={sty.generalInfoTitle}>{t('landing_general_title')}</h2>
          <div className={sty.generalInfoText}>
            {t("landing_general_blocks", { returnObjects: true }).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
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
