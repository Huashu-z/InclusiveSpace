import React from "react";
import sty from "./PlasmicLanding.module.css";
import { useTranslation } from "next-i18next";

export default function Methodology() {
  const { t } = useTranslation("common");

  return (
    <div className={sty.methodologyLayout}>
      {/* Left navigation */}
      <aside className={sty.methodologyNav} aria-label={t("methodology.nav_aria")}>
        <div className={sty.methodologyNavInner}>
          <div className={sty.methodologyNavTitle}>{t("methodology.nav_title")}</div>
          <a href="#method-sec-1" className={sty.methodologyNavItem}>
            {t("methodology.nav_interface")}
          </a>
          <a href="#method-sec-2" className={sty.methodologyNavItem}>
            {t("methodology.nav_guidelines")}
          </a>
          <a href="#method-sec-3" className={sty.methodologyNavItem}>
            {t("methodology.nav_features")}
          </a>
          <a href="#method-sec-4" className={sty.methodologyNavItem}>
            {t("methodology.nav_setup")}
          </a>
        </div>
      </aside>

      {/* main content */}
      <main className={sty.methodologyContent}>
        {/* Page title */}
        <section className={sty.toolDetailsSection}>
          <h1 className={sty.methodologyPageTitle}>
            <img
              src="/images/CAT_dark_Purple.png"
              alt="CAT"
              className={sty.methodologyLogo}
            />
            {t("methodology.page_title")}
          </h1>
        </section>

        {/* Section 1 */}
        <section
          id="method-sec-1"
          className={`${sty.toolDetailsSection} ${sty.methodologyAnchorSection}`}
        >
          <div className={sty.methodologySectionBlock}>
            <h2 className={sty.toolDetailsTitle}>
              {t("methodology.section1_title")}
            </h2>

            <div className={sty.methodologyThreeCol}>
              {/* Left column */}
              <div className={`${sty.methodologySideCol} ${sty.methodologyLeftCol}`}>
                <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox1}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box1_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box1_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox2}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box2_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box2_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox3}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box3_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box3_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox4}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box4_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box4_text")}
                  </div>
                </div>
              </div>

              {/* Center column */}
              <div className={sty.methodologyCenterCol}>
                <div className={sty.methodologyMainImageWrap}>
                  <img
                    src="/images/method_map.png"
                    alt={t("methodology.section1.main_image_alt")}
                    className={sty.methodologyMainImage}
                  />
                </div>
              </div>

              {/* Right column */}
              <div className={`${sty.methodologySideCol} ${sty.methodologyRightCol}`}>
                <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox1}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box5_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box5_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox2}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box6_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box6_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox3}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box7_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box7_text")}
                  </div>
                </div>

                <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox4}`}>
                  <div className={sty.methodologyDescTitle}>
                    {t("methodology.section1.box8_title")}
                  </div>
                  <div className={sty.methodologyDescText}>
                    {t("methodology.section1.box8_text")}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Section 2 + 3 */}
        <section
          id="method-sec-2"
          className={`${sty.toolDetailsSection} ${sty.methodologyAnchorSection}`}
        >
          <div className={sty.methodologyStepsSplit}>
            {/* Left column */}
            <div className={sty.methodologyStepsLeft}>
              <h1 className={`${sty.toolDetailsTitle} ${sty.stepBlock} ${sty.stepTitle3}`}>
                {t("methodology.section2_title")}
              </h1>

              <div className={`${sty.stepBlock} ${sty.step1}`}>
                <div className={sty.stickerCard}>
                  <h2 className={sty.toolDetailsTitle}>{t("methodology.step1_title")}</h2>
                  <div className={sty.toolDetailsText}>
                    <p>{t("methodology.step1_text")}</p>
                  </div>
                  <div className={sty.methodologyStepImageWrap}>
                    <img
                      src="/images/method_step1.png"
                      alt={t("methodology.step1_image_alt")}
                      className={sty.methodologyStepImage}
                    />
                  </div>
                </div>
              </div>

              <div className={`${sty.stepBlock} ${sty.step3}`}>
                <div className={sty.stickerCard}>
                  <h2 className={sty.toolDetailsTitle}>
                    {t("methodology.step3_title")}
                  </h2>
                  <div className={sty.toolDetailsText}>
                    <p>{t("methodology.step3_text")}</p>
                  </div>
                  <div className={sty.methodologyStepImageWrap}>
                    <img
                      src="/images/method_step3.png"
                      alt={t("methodology.step3_image_alt")}
                      className={sty.methodologyStepImage}
                    />
                  </div>
                </div>
              </div>

              <div className={`${sty.stepBlock} ${sty.step5}`}>
                <div className={sty.stickerCard}>
                  <h2 className={sty.toolDetailsTitle}>{t("methodology.step5_title")}</h2>
                  <div className={sty.toolDetailsText}>
                    <p>{t("methodology.step5_text")}</p>
                  </div>
                  <div className={sty.methodologyStepImageWrap}>
                    <img
                      src="/images/method_step5.png"
                      alt={t("methodology.step5_image_alt")}
                      className={sty.methodologyStepImage}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className={sty.methodologyStepsRight}>
              <div className={`${sty.methodologyOffsetCard} ${sty.stepBlock} ${sty.step2}`}>
                <div className={sty.stickerCard}>
                  <h2 className={sty.toolDetailsTitle}>{t("methodology.step2_title")}</h2>
                  <div className={sty.toolDetailsText}>
                    <p>{t("methodology.step2_text")}</p>
                  </div>
                  <div className={sty.methodologyStepImageWrap}>
                    <img
                      src="/images/method_step2.png"
                      alt={t("methodology.step2_image_alt")}
                      className={sty.methodologyStepImage}
                    />
                  </div>
                </div>
              </div>

              <section
                id="method-sec-3"
                className={`${sty.methodologySetupSection} ${sty.stepBlock} ${sty.step4Section}`}
              >
                <h1 className={sty.methodologySetupTitle}>
                  {t("methodology.section4_title")}
                </h1>

                <div className={`${sty.stickerCard} ${sty.stickerCardAlt}`}>
                  <h2 className={sty.toolDetailsTitle}> {t("methodology.step4_title")}</h2>
                  <div className={sty.toolDetailsText}>
                    <p>{t("methodology.step4_text")}</p>
                  </div>
                  <div className={sty.methodologyStepImageWrap}>
                    <img
                      src="/images/method_step4.png"
                      alt={t("methodology.step4_image_alt")}
                      className={sty.methodologyStepImage}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section
          id="method-sec-4"
          className={`${sty.toolDetailsSection} ${sty.methodologyAnchorSection}`}
        >
          <h1 className={sty.toolDetailsTitle}>4. What do you need to set up CAT?</h1>

          <div className={sty.toolDetailsText}>
            <p>xxxxxx</p>
          </div>

          <div className={sty.toolDetailsGrid}>
            <div className={sty.stickerCard}>
              <h2 className={sty.toolDetailsTitle}>Data</h2>
              <div className={sty.toolDetailsText}>
                <p>xxxxxx</p>
              </div>
            </div>

            <div className={sty.stickerCard}>
              <h2 className={sty.toolDetailsTitle}>Data Management</h2>
              <div className={sty.toolDetailsText}>
                <p>xxxxxx</p>
              </div>
            </div>
          </div>
        </section>

        

      </main>
      
      {/* === Contact info (footer) === */}
      <section className={sty.contactSection}>
        <div className={sty.contactGrid}>
          {/* col 1: CAT logo */}
          <div className={sty.contactColLogo}>
            <img
              src="/images/CAT_White.png"
              alt="CAT"
              className={sty.contactCatLogo}
            />
          </div>

          {/* middle area: disclaimer + contact */}
          <div className={sty.contactColMain}>
            <div className={sty.disclaimerText}>
              <p>
                {t("landing_disclaimer_1")}{" "}
                <a
                  href="https://inclusivespaces-heproject.eu/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  InclusiveSpaces
                </a>{" "}
                {t("landing_disclaimer_2")}
              </p>
              <p>{t("landing_disclaimer_3")}</p>
            </div>
  
            <div id="contact-info" className={sty.contactText}>
              <h3 className={sty.contactMiniTitle}>{t("landing_contact_title")}</h3>

              <div className={sty.contactList}>
                <div className={sty.contactLine}>
                  <span className={sty.contactName}>{t("landing_contact_duran")}</span>
                  <a className={sty.contactEmail} href="mailto:david.duran@tum.de">
                    david.duran@tum.de
                  </a>
                </div>

                <div className={sty.contactLine}>
                  <span className={sty.contactName}>{t("landing_contact_buettner")}</span>
                  <a className={sty.contactEmail} href="mailto:benjamin.buettner@tum.de">
                    benjamin.buettner@tum.de
                  </a>
                </div>

                <div className={sty.contactLine}>
                  <span className={sty.contactName}>{t("landing_contact_zuckriegl")}</span>
                  <a className={sty.contactEmail} href="mailto:lea.zuckriegl@tum.de">
                    lea.zuckriegl@tum.de
                  </a>
                </div>

                <div className={sty.contactLine}>
                  <span className={sty.contactName}>{t("landing_contact_zuniga")}</span>
                  <a className={sty.contactEmail} href="mailto:mariajose.zuniga@tum.de">
                    mariajose.zuniga@tum.de
                  </a>
                </div>

                <div className={sty.contactLine}>
                  <span className={sty.contactName}>{t("landing_contact_huashu")}</span>
                  <a className={sty.contactEmail} href="mailto:huashu.zhan@tum.de">
                    huashu.zhan@tum.de
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* col 4: partner logos */}
          <div className={sty.contactColPartners}>
            <div className={sty.partnerLogoColumn}>
              <img
                src="/images/logoIS_full.png"
                alt={t("logo_IS")}
                className={sty.partnerLogoImg}
              />
              <img
                src="/images/tum_logo_full.png"
                alt={t("logo_TUM")}
                className={sty.partnerLogoImg}
              />
              <img
                src="/images/logo_co-founded-eu_full.png"
                alt={t("logo_EU")}
                className={sty.partnerLogoImg}
              />
            </div>
          </div>
        </div>
      </section> 
    </div>
  );
}