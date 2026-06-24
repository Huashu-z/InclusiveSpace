import React from "react";
import sty from "./Sidebar.module.css";
import Tooltip from "./Sidebar_Tooltip";
import { useTranslation } from "next-i18next";
import { cityLayerConfig } from "./cityVariableConfig";

const DEFAULT_COMFORT_WEIGHT = 0.5;
const MIN_COMFORT_WEIGHT = 0.1;
const MAX_COMFORT_WEIGHT = 0.9;

function clampWeight(rawValue) {
  const number = Number(rawValue);
  if (!Number.isFinite(number)) return DEFAULT_COMFORT_WEIGHT;
  return Math.min(MAX_COMFORT_WEIGHT, Math.max(MIN_COMFORT_WEIGHT, Math.round(number * 10) / 10));
}

function formatWeight(rawValue) {
  return clampWeight(rawValue).toFixed(1);
}

export default function VariableControls({
  enabledVariables,
  toggleVariable,
  layerValues,
  handleInputChange,
  openCategory,
  toggleCategory,
  startPoints,
  setComputeAccessibility,
  handleClearResult,
  handleClearVariables,
  guideActive = false,
  runGuideActive = false,
  guideTargetVariables = [],
}) {
  const [liveMessage, setLiveMessage] = React.useState("");

  const city = (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) || "hamburg";
  const availableFeatures = cityLayerConfig[city]?.discomfortFeatures || [];
  const { t } = useTranslation("common");

  const updateLayerWeight = React.useCallback((layer, value) => {
    handleInputChange({ target: { value: clampWeight(value) } }, layer);
  }, [handleInputChange]);

  const RenderCheckbox = ({ layer, label }) => {
    const enabled = enabledVariables.includes(layer);
    const value = clampWeight(layerValues[layer]);
    const isTargeted = guideTargetVariables.includes(layer);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const tooltipRef = React.useRef();
    const sliderId = `var-${layer}-slider`;

    return (
      <div
        className={[
          sty["checkbox-container"],
          isTargeted ? sty.agentGuideItem : "",
        ].filter(Boolean).join(" ")}
        data-agent-variable={layer}
      >
        <div className={sty["checkbox-top-row"]}>
          <label className={sty["checkbox-label"]}>
            <input
              type="checkbox"
              className={sty.kbdFocus}
              onChange={() => {
                toggleVariable(layer);
                setLiveMessage(
                  !enabled
                    ? `${label} ${t("aria_enabled")}`
                    : `${label} ${t("aria_disabled")}`
                );
                if (!enabled) {
                  updateLayerWeight(layer, DEFAULT_COMFORT_WEIGHT);
                }
              }}
              checked={enabled}
            />
            <span className={sty["sidebar-text"]}>{label}</span>
          </label>
          <button
            type="button"
            className={`${sty["info-icon"]} ${sty.kbdFocus}`}
            ref={tooltipRef}
            onClick={(event) => {
              event.stopPropagation();
              setShowTooltip((prev) => !prev);
            }}
            aria-label={t("aria_feature_info_button", { feature: label })}
            title={t("aria_feature_info_button", { feature: label })}
            aria-haspopup="dialog"
            aria-expanded={showTooltip}
            aria-controls={showTooltip ? `tip-${layer}` : undefined}
          >
            <img src="/images/icon_info.png" alt="" aria-hidden="true" className={sty.infoIconImg} />
          </button>
        </div>

        <Tooltip
          show={showTooltip}
          type={layer}
          anchorRef={tooltipRef}
          onClose={() => setShowTooltip(false)}
          id={`tip-${layer}`}
        />

        <div className={sty["slider-container"]}>
          <label htmlFor={sliderId} className={sty["srOnly"]}>{t("variable_weight_for", { label })}</label>
          <input
            id={sliderId}
            type="range"
            min={MIN_COMFORT_WEIGHT}
            max={MAX_COMFORT_WEIGHT}
            step="0.1"
            disabled={!enabled}
            value={value}
            className={`${sty.kbdFocus} ${!enabled ? sty.disabled : ""}`}
            aria-label={t("variable_weight_for", { label })}
            aria-valuemin={MIN_COMFORT_WEIGHT}
            aria-valuemax={MAX_COMFORT_WEIGHT}
            aria-valuenow={value}
            aria-valuetext={`${formatWeight(value)} comfort weight`}
            style={{
              direction: "rtl",
              background: enabled
                ? "linear-gradient(to right, #e6ea08ff 0%, #f59e0b 48%, #dc2626 100%)"
                : undefined,
            }}
            onChange={(event) => updateLayerWeight(layer, event.target.value)}
          />
          <span className={sty["slider-value"]} aria-hidden="true">
            {enabled ? formatWeight(value) : "-"}
          </span>
          <span className={sty["srOnly"]}>
            {enabled ? `${formatWeight(value)} comfort weight` : t("emoji_level_unknown")}
          </span>
        </div>
      </div>
    );
  };

  const [showInfo, setShowInfo] = React.useState(false);
  const infoIconRef = React.useRef();

  return (
    <div
      id="comfort-factors-panel"
      data-agent-target="comfort_factors"
      className={[
        sty["sidebar-section"],
        guideActive ? sty.agentGuideHighlight : "",
        guideActive ? sty.agentGuideComfort : "",
      ].filter(Boolean).join(" ")}
      role="region"
      aria-labelledby="comfort-features-heading"
    >
      <div aria-live="polite" className={sty["srOnly"]} role="status">
        {liveMessage}
      </div>
      <div className={sty["title-container"]}>
        <div className={sty["sidebar-section-title"]} id="comfort-features-heading">
          <img src="/images/icon_features.png" alt={t("icon_discomfort_feature")} />
          <span>{t("leg_comfort_features")}</span>
        </div>
        <button
          type="button"
          className={`${sty["info-icon"]} ${sty.kbdFocus}`}
          ref={infoIconRef}
          onClick={(event) => {
            event.stopPropagation();
            setShowInfo((prev) => !prev);
          }}
          title={t("tooltip_comfort_features_title")}
          aria-label={t("tooltip_comfort_features_title")}
          aria-haspopup="dialog"
          aria-expanded={showInfo}
          aria-controls={showInfo ? "tip-featureinfo" : undefined}
        >
          <img src="/images/icon_info.png" alt="" aria-hidden="true" className={sty.infoIconImg} />
        </button>
        <Tooltip
          show={showInfo}
          type="variable"
          anchorRef={infoIconRef}
          onClose={() => setShowInfo(false)}
          id="tip-featureinfo"
        />
      </div>

      <div className={sty["legend-container"]}>
        <h4 className={sty["legend-title"]}>Comfort weight scale</h4>
        <div className={sty["legend-scale"]} aria-hidden="true" />
        <div className={sty["legend-scale-labels"]}>
          <span><strong>0.9</strong> Almost no impact</span>
          <span><strong>0.1</strong> Intolerable</span>
        </div>
      </div>

      <div className={sty["faq-container"]}>
        <Category
          id="env"
          name={<span className={sty["title-with-tooltip"]}>{t("env_category")}</span>}
          open={openCategory === "venv"}
          onClick={() => toggleCategory("venv")}
        >
          {availableFeatures.includes("noise") && <RenderCheckbox layer="noise" label={t("checkbox_noise")} />}
          {availableFeatures.includes("temperatureSummer") && <RenderCheckbox layer="temperatureSummer" label={t("checkbox_temp_summer")} />}
          {availableFeatures.includes("temperatureWinter") && <RenderCheckbox layer="temperatureWinter" label={t("checkbox_temp_winter")} />}
        </Category>

        <Category
          id="phy"
          name={<span className={sty["title-with-tooltip"]}>{t("phy_category")}</span>}
          open={openCategory === "vphy"}
          onClick={() => toggleCategory("vphy")}
        >
          {availableFeatures.includes("light") && <RenderCheckbox layer="light" label={t("checkbox_light")} />}
          {availableFeatures.includes("trafficLight") && <RenderCheckbox layer="trafficLight" label={t("checkbox_traffic")} />}
          {availableFeatures.includes("tactile_pavement") && <RenderCheckbox layer="tactile_pavement" label={t("checkbox_tactile")} />}
          {availableFeatures.includes("tree") && <RenderCheckbox layer="tree" label={t("checkbox_tree")} />}
          {availableFeatures.includes("greeninf") && <RenderCheckbox layer="greeninf" label={t("checkbox_green")} />}
          {availableFeatures.includes("blueinf") && <RenderCheckbox layer="blueinf" label={t("checkbox_blue")} />}
          {availableFeatures.includes("station") && <RenderCheckbox layer="station" label={t("checkbox_station")} />}
          {availableFeatures.includes("narrowRoads") && <RenderCheckbox layer="narrowRoads" label={t("checkbox_narrow")} />}
          {availableFeatures.includes("wcDisabled") && <RenderCheckbox layer="wcDisabled" label={t("checkbox_wc")} />}
          {availableFeatures.includes("stair") && <RenderCheckbox layer="stair" label={t("checkbox_stair")} />}
          {availableFeatures.includes("obstacle") && <RenderCheckbox layer="obstacle" label={t("checkbox_obstacle")} />}
          {availableFeatures.includes("slope") && <RenderCheckbox layer="slope" label={t("checkbox_slope")} />}
          {availableFeatures.includes("unevenSurface") && <RenderCheckbox layer="unevenSurface" label={t("checkbox_uneven")} />}
          {availableFeatures.includes("poorPavement") && <RenderCheckbox layer="poorPavement" label={t("checkbox_poor")} />}
          {availableFeatures.includes("kerbsHigh") && <RenderCheckbox layer="kerbsHigh" label={t("checkbox_kerb")} />}
        </Category>

        <Category
          id="psy"
          name={<span className={sty["title-with-tooltip"]}>{t("psy_category")}</span>}
          open={openCategory === "vpsy"}
          onClick={() => toggleCategory("vpsy")}
        >
          {availableFeatures.includes("facility") && <RenderCheckbox layer="facility" label={t("checkbox_facility")} />}
          {availableFeatures.includes("pedestrianFlow") && <RenderCheckbox layer="pedestrianFlow" label={t("checkbox_crowd")} />}
        </Category>
      </div>

      <div
        className={[
          sty["button-container"],
          runGuideActive ? sty.agentGuideHighlight : "",
          runGuideActive ? sty.agentGuideRun : "",
        ].filter(Boolean).join(" ")}
        id="run-analysis-panel"
        data-agent-target="run_analysis"
      >
        <button
          type="button"
          onClick={() => {
            if (startPoints.length === 0) {
              alert(t("alert_select_start_first"));
              return;
            }
            setComputeAccessibility(true);
          }}
          className={`${sty["get-catchment-button"]} ${sty.kbdFocus}`}
        >
          <span>{t("get_area")}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={handleClearResult}
        className={`${sty["setup-button"]} ${sty.kbdFocus}`}
      >
        <span>{t("clear_result")}</span>
      </button>
      <button
        type="button"
        onClick={handleClearVariables}
        className={`${sty["setup-button"]} ${sty.kbdFocus}`}
        style={{ marginTop: 6 }}
      >
        <span>{t("clear_variables")}</span>
      </button>
    </div>
  );
}

function Category({ id, name, open, onClick, children }) {
  const headingId = `var-category-heading-${id}`;
  const contentId = `var-category-content-${id}`;
  return (
    <div className={sty["faq-item"]}>
      <h3 className={sty["sidebar-subtitle"]} id={headingId}>
        <button
          type="button"
          className={`${sty["faq-question"]} ${sty.kbdFocus}`}
          onClick={onClick}
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
        >
          <span>{name}</span>
          <span className={sty["faq-icon"]}>{open ? "-" : "+"}</span>
        </button>
      </h3>

      {open && (
        <div
          className={sty["faq-answer"]}
          role="group"
          id={contentId}
          aria-labelledby={headingId}
        >
          {children}
        </div>
      )}
    </div>
  );
}
