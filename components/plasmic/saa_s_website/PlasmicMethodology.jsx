import React from "react";
import sty from "./PlasmicLanding.module.css";

export default function Methodology() {
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

      {/* First section */}
      <section className={sty.toolDetailsSection}>
          <h1 className={sty.toolDetailsTitle}>1. What do you need to set up CAT</h1>
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

      {/* Section 2: What the CAT interface look like? */}
      <section className={sty.toolDetailsSection}>
        <div className={sty.methodologySectionBlock}>
          <h2 className={sty.toolDetailsTitle}>
            2. What the CAT interface look like?
          </h2>

          <div className={sty.methodologyThreeCol}>
            {/* Left column */}
            <div className={sty.methodologySideCol}>
              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>1. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>2. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>3. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>4. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
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
            <div className={sty.methodologySideCol}>
              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>5. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>6. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>7. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>

              <div className={sty.methodologyDescBox}>
                <div className={sty.methodologyDescTitle}>8. xxx</div>
                <div className={sty.methodologyDescText}>
                  xxx
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}