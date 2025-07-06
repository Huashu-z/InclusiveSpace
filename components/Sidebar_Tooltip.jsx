import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import sty from "./Sidebar.module.css";

export default function Tooltip({ show, type, anchorRef, onClose }) {
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
        <p><strong>Discomfort Sensitivity Levels:</strong></p>
        <ul className={sty["tooltip-list"]}>
          <li><strong>😩</strong>: Can't stand it — I avoid walking here</li>
          <li><strong>☹️</strong>: Uncomfortable — I feel uneasy</li>
          <li><strong>😐</strong>: Mildly annoying — I don't like it, but can manage</li>
          <li><strong>🙂</strong>: Doesn’t bother me — I’m fine with it</li>
        </ul>
      </>
    );
  }
  else if (type === "noise") {
    content = <p>High noise levels from traffic or environment can cause stress and discourage walking, especially for sensitive groups.</p>;
  } else if (type === "light") {
    content = <p>Insufficient or missing street lighting can make streets feel unsafe or hard to navigate after dark.</p>;
  } else if (type === "trafficLight") {
    content = <p>Crossings without traffic lights pose danger, especially at busy roads or for individuals with mobility limitations.</p>;
  } else if (type === "tactile_pavement") {
    content = <p>Lack of tactile paving makes it difficult for visually impaired pedestrians to navigate independently.</p>;
  } else if (type === "tree") {
    content = <p>Absence of trees leads to exposed walking paths with little shade, increasing heat exposure and discomfort.</p>;
  } else if (type === "temperatureSummer") {
    content = <p>In summer, areas with high surface temperatures or heat accumulation discourage walking and raise health risks.</p>;
  } else if (type === "temperatureWinter") {
    content = <p>In winter, cold or icy conditions on pathways can make walking dangerous or physically difficult.</p>;
  } else if (type === "greeninf") {
    content = <p>Urban areas lacking green spaces feel sterile and uninviting, often lacking places to rest or retreat.</p>;
  } else if (type === "blueinf") {
    content = <p>Absence of water features (e.g., streams, ponds) may indicate poor microclimate quality and limited scenic value.</p>;
  } else if (type === "station") {
    content = <p>Limited access to public transport increases walking distances and limits connectivity, especially for long trips.</p>;
  } else if (type === "narrowRoads") {
    content = <p>Narrow or obstructed sidewalks can be hazardous, particularly for wheelchair users or families with strollers.</p>;
  } else if (type === "wcDisabled") {
    content = <p>Scarcity of accessible toilets restricts mobility for people who need regular facilities during travel.</p>;
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
