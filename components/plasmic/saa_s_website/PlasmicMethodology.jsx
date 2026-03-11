import React from "react";
import sty from "./PlasmicLanding.module.css";
import { useTranslation } from "next-i18next";

export default function Methodology() {

    const { t } = useTranslation("common");

  return (
    <div>
      {/* Page title */}
      <section className={sty.toolDetailsSection}>
        <h1 className={sty.methodologyPageTitle}>
          <img
            src="/images/CAT_dark_Purple.png"
            alt="CAT"
            className={sty.methodologyLogo}
          />
          Methodology
        </h1>
      </section> 

      {/* Section 1: What the CAT interface look like? */}
      <section className={sty.toolDetailsSection}>
        <div className={sty.methodologySectionBlock}>
          <h2 className={sty.toolDetailsTitle}>
            1. What the CAT interface look like?
          </h2>

          <div className={sty.methodologyThreeCol}>
            {/* Left column */}
            <div className={`${sty.methodologySideCol} ${sty.methodologyLeftCol}`}>
              <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox1}`}>
                <div className={sty.methodologyDescTitle}>1. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox2}`}>
                <div className={sty.methodologyDescTitle}>2. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox3}`}>
                <div className={sty.methodologyDescTitle}>3. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyLeftBox4}`}>
                <div className={sty.methodologyDescTitle}>4. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>
            </div>

            {/* Center column */}
            <div className={sty.methodologyCenterCol}>
              <div className={sty.methodologyMainImageWrap}>
                <img
                  src="/images/method_map.png"
                  alt="Main page of the CAT interface"
                  className={sty.methodologyMainImage}
                />
              </div>
            </div>

            {/* Right column */}
            <div className={`${sty.methodologySideCol} ${sty.methodologyRightCol}`}>
              <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox1}`}>
                <div className={sty.methodologyDescTitle}>5. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox2}`}>
                <div className={sty.methodologyDescTitle}>6. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox3}`}>
                <div className={sty.methodologyDescTitle}>7. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>

              <div className={`${sty.methodologyDescBox} ${sty.methodologyRightBox4}`}>
                <div className={sty.methodologyDescTitle}>8. xxx</div>
                <div className={sty.methodologyDescText}>xxx</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* === Section 3 === */}
      <section className={sty.toolDetailsSection}>
        <h1 className={sty.toolDetailsTitle}>3. How to use CAT?</h1>

        <div className={sty.toolDetailsGrid}>
          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 1: Start using CAT</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>

          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 2: Create the standard map</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>
        </div>
        <div className={sty.toolDetailsGrid}>
          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 1: Start using CAT</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>

          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 3: Create comfort-based accessibility map</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === Section 4 === */}
      <section className={sty.toolDetailsSection}>
        <h1 className={sty.toolDetailsTitle}>4. Additional features</h1>

        <div className={sty.toolDetailsGrid}>
          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 4: Pre-set profiles</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>

          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Step 5: Layers to discover</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: data */}
      <section className={sty.toolDetailsSection}>
          <h1 className={sty.toolDetailsTitle}>5. What do you need to set up CAT</h1>
          <div className={sty.toolDetailsText}>
            <p>
              xxxxxx
            </p>
          </div>

        <div className={sty.toolDetailsGrid}>
          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Data</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>

          <div className={sty.stickerCard}>
            <h2 className={sty.toolDetailsTitle}>Data Management</h2>
            <div className={sty.toolDetailsText}>
              <p>
                xxxxxx
              </p>
            </div>
          </div>
        </div>
      </section>

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

          {/* col 2: disclaimer text */}
          <div className={sty.contactColDisclaimer}>
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
          </div>

          {/* col 3: contact info */}
          <div className={sty.contactColInfo}>
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