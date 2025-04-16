// Sidebar_Tooltip.jsx
import React from "react";
import sty from "./Sidebar.module.css";

export default function Tooltip({ show, type }) {
  let content;

  if (type === "contributor") {
    content = (
      <>
        <p>Positive features that improve walking comfort.</p><br />
        <p><strong>Lower values = Greater discomfort </strong>and smaller reachable area</p>
        <ul className={sty["tooltip-list"]}>
          <li><strong>0</strong>: I feel bad without them</li>
          <li><strong>1</strong>: I don’t mind</li>
        </ul>
      </>
    );
  } else if (type === "barrier") {
    content = (
      <>
        <p>These are barriers that reduce walking comfort.</p>
        <p>Lower values = Greater discomfort and smaller reachable area</p>
        <ul>
          <li><strong>0</strong>: I hate it</li>
          <li><strong>1</strong>: I don’t mind</li>
        </ul>
      </>
    );
  }

  return (
    <div className={`${sty["tooltip"]} ${show ? sty["show"] : ""}`}>
      {content}
    </div>
  );
}
