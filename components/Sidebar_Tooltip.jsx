import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import sty from "./Sidebar.module.css";
import { useTranslation } from 'next-i18next';

export default function Tooltip({ show, type, anchorRef, onClose }) {
  const { t } = useTranslation("common");
  const [position, setPosition] = useState({ top: 100, left: 400 });

  useEffect(() => {
    if (anchorRef?.current && show) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 10
      });
    }
  }, [anchorRef, show]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!anchorRef?.current?.contains(e.target)) {
        onClose?.();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, anchorRef, onClose]);

  if (!show) return null;

  let content;

  if (type === "variable") {
    content = (
      <>
        <p><strong>{t('tooltip_variable_title')}</strong></p>
        <ul className={sty["tooltip-list"]}>
          <li><strong>😩</strong>{t('tooltip_level_0')}</li>
          <li><strong>☹️</strong>{t('tooltip_level_1')}</li>
          <li><strong>😐</strong>{t('tooltip_level_2')}</li>
          <li><strong>🙂</strong>{t('tooltip_level_3')}</li>
        </ul>
      </>
    );
  }
  else if (type === "noise") {
    content = <p>{t('tooltip_noise')}</p>;
  } else if (type === "light") {
    content = <p>{t('tooltip_light')}</p>;
  } else if (type === "trafficLight") {
    content = <p>{t('tooltip_traffic')}</p>;
  } else if (type === "tactile_pavement") {
    content = <p>{t('tooltip_tactile')}</p>;
  } else if (type === "tree") {
    content = <p>{t('tooltip_tree')}</p>;
  } else if (type === "temperatureSummer") {
    content = <p>{t('tooltip_summer')}</p>;
  } else if (type === "temperatureWinter") {
    content = <p>{t('tooltip_winter')}</p>;
  } else if (type === "greeninf") {
    content = <p>{t('tooltip_green')}</p>;
  } else if (type === "blueinf") {
    content = <p>{t('tooltip_blue')}</p>;
  } else if (type === "station") {
    content = <p>{t('tooltip_station')}</p>;
  } else if (type === "narrowRoads") {
    content = <p>{t('tooltip_narrow')}</p>;
  } else if (type === "wcDisabled") {
    content = <p>{t('tooltip_wc')}</p>;
  } else if (type === "ramp") {
    content = <p>{t('tooltip_ramp')}</p>;
  } else if (type === "stair") {
    content = <p>{t('tooltip_stair')}</p>;
  } else if (type === "elevator") {
    content = <p>{t('tooltip_elevator')}</p>;
  } else if (type === "obstacle") {
    content = <p>{t('tooltip_obstacle')}</p>;
  } else if (type === "slope") {
    content = <p>{t('tooltip_slope')}</p>;
  } else if (type === "unevenSurface") {
    content = <p>{t('tooltip_uneven')}</p>;
  } else if (type === "poorPavement") {
    content = <p>{t('tooltip_poor')}</p>;
  } else if (type === "kerbsHigh") {
    content = <p>{t('tooltip_kerb')}</p>;
  } else if (type === "facility") {
    content = <p>{t('tooltip_facility')}</p>;
  } else if (type === "pedestrianFlow") {
    content = <p>{t('tooltip_crowd')}</p>;
  }

  return ReactDOM.createPortal(
    <div
      className={sty["tooltip-portal"]}
      style={{ top: position.top, left: position.left }}
    >
      {content}
    </div>,
    document.body
  );
}
