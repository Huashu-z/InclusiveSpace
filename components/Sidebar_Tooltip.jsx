import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "next-i18next";

export default function Sidebar_Tooltip({ show, type, anchorRef, onClose }) {
  const { t } = useTranslation("common");
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Calculated positioning of tooptip pop up: stick to anchorRef, offset 8px downward, automatic overflow prevention
  const place = React.useCallback(() => {
    const el = anchorRef?.current;
    const tip = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    let top = rect.bottom + gap;
    let left = rect.left;

    const maxWidth = 320;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (left + maxWidth > viewportW - 12) left = Math.max(12, viewportW - maxWidth - 12);
    
    const tipH = tip ? tip.getBoundingClientRect().height : 200; 
    const overflowBottom = top + tipH > viewportH - 12;
    const canFlipUp = rect.top - gap - tipH >= 12;
    if (overflowBottom && canFlipUp) {
      top = rect.top - gap - tipH; 
    }

    setPos({ top, left });
  }, [anchorRef]);

  React.useEffect(() => {
    if (show) place();
  }, [show, place, type]);

  // Click outside to close & ESC to close
  React.useEffect(() => {
    if (show) containerRef.current?.focus();
    // if (!show) return;
    const onDocClick = (e) => {
      const c = containerRef.current;
      if (!c) return;
      if (!c.contains(e.target) && !anchorRef?.current?.contains(e.target)) {
        onClose?.();
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [show, onClose, anchorRef]);

  // —— Content generation: Support layer:xxx / dataInfo / features —— //
  const city =
    (typeof window !== "undefined" && (localStorage.getItem("selectedCity") || "hamburg")) ||
    "hamburg";
  const defaultSource =
    city === "hamburg"
      ? t("tooltip_data_source_hh")
      : t("tooltip_data_source_pt");

  function contentFor(tp) {
    if (!tp) return <div>{t("tooltip_default", { defaultValue: "No details." })}</div>;

    // 1) Data layer name：layer:<key>, to distinguish with features' key
    if (tp.startsWith("layer:")) {
      const key = tp.slice(6);
      const title = t(`tooltip_layer.${key}.title`, { defaultValue: key });
      const desc = t(`tooltip_layer.${key}.desc`, {
        defaultValue: t("tooltip_layer_generic_desc", {
          defaultValue:
            "This layer visualizes city features used for comfort-based accessibility insights.",
        }),
      });
      const source =
        t(`tooltip_layer.${key}.source`, { defaultValue: "" }) || defaultSource;

      return (
        <div style={{ maxWidth: 300, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
          <div>
            <b>{t("tooltip_data_source_label", { defaultValue: "Source:" })}</b> {source}
          </div>
          <div style={{ marginTop: 8 }}>{desc}</div>
        </div>
      );
    }

    // 2) title level：dataInfo
    if (tp === "dataInfo") {
      const cityLabel = city === "hamburg" ? "Hamburg" : "Penteli";
      return (
        <div style={{ maxWidth: 300, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {t("tooltip_data_title", { defaultValue: "Data information" })}
          </div>
          <div>
            <b>{t("tooltip_data_name_label", { defaultValue: "Data name:" })}</b>{" "}
            {t("tooltip_data_name_value", {
              city: cityLabel,
              defaultValue: `${cityLabel} city layers`,
            })}
          </div>
          <div>
            <b>{t("tooltip_data_source_label", { defaultValue: "Source:" })}</b>{" "}
            {defaultSource}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>{t("tooltip_data_desc_label", { defaultValue: "Description:" })}</b>
            <br />
            {t("tooltip_data_desc", {
              defaultValue:
                "These map layers include environmental, physical, and psychological features (e.g., noise, light, slope, trees, facilities, pedestrian flow) to visualize and analyze comfort-based accessibility.",
            })}
          </div>
        </div>
      );
    }

  // tooltip for features, show features tooltip according to type
  if (type === "variable") return <p>{t('tooltip_variable_title')}</p>;
  if (type === "noise") return <p>{t('tooltip_noise')}</p>;
  if (type === "light") return <p>{t('tooltip_light')}</p>;
  if (type === "tree") return <p>{t('tooltip_tree')}</p>;
  if (type === "trafficLight") return <p>{t('tooltip_traffic')}</p>;
  if (type === "tactile_guidance") return <p>{t('tooltip_tactile')}</p>;
  if (type === "temperatureSummer") return <p>{t('tooltip_summer')}</p>;
  if (type === "temperatureWinter") return <p>{t('tooltip_winter')}</p>;
  if (type === "stair") return <p>{t('tooltip_stair')}</p>;
  if (type === "obstacle") return <p>{t('tooltip_obstacle')}</p>;
  if (type === "unevenSurface") return <p>{t('tooltip_uneven')}</p>;
  if (type === "poorPavement") return <p>{t('tooltip_poor')}</p>;
  if (type === "kerbsHigh") return <p>{t('tooltip_kerb')}</p>;
  if (type === "facility") return <p>{t('tooltip_facility')}</p>;
  if (type === "pedestrianFlow") return <p>{t('tooltip_crowd')}</p>;
  if (type === "greeninf") return <p>{t('tooltip_green')}</p>;
  if (type === "blueinf") return <p>{t('tooltip_blue')}</p>;
  if (type === "station") return <p>{t('tooltip_station')}</p>;
  if (type === "narrowRoads") return <p>{t('tooltip_narrow')}</p>;
  if (type === "wcDisabled") return <p>{t('tooltip_wc')}</p>;
  if (type === "slope") return <p>{t('tooltip_slope')}</p>;
  if (type === "slope_penteli") return <p>{t('tooltip_slope')}</p>;
  if (type === "walkingSpeed") 
    return (
      <div>
        <p>{t('tooltip_walking_speed_intro')}</p>
        <ul style={{ margin: "4px 0", paddingLeft: "18px" }}>
          <li>{t('tooltip_walking_speed_stroll')}</li>
          <li>{t('tooltip_walking_speed_average')}</li>
          <li>{t('tooltip_walking_speed_brisk')}</li>
        </ul>
      </div>
    );


  return <div>{t("tooltip_default", { defaultValue: "No details." })}</div>;
  }

  if (!show || !mounted) return null;

  const tooltipNode = (
    <div
      ref={containerRef}
      role="dialog"
      aria-live="polite"
      aria-modal="false"
      tabIndex={-1} 
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.15)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        padding: "10px 12px",
        maxWidth: 320,
        maxHeight: "calc(100vh - 24px)",
        overflow: "auto"
      }}
    >
      {contentFor(type)}
    </div>
  );

  return createPortal(tooltipNode, document.body);
} 