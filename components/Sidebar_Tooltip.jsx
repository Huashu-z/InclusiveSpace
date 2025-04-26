// Sidebar_Tooltip.jsx
import React from "react";
import sty from "./Sidebar.module.css";

export default function Tooltip({ show, type }) {
  let content;

  if (type === "contributor") {
    content = (
      <>
        <p><strong>Positive features</strong> that improve walking comfort.</p>
        <p><strong>Lower values = You are more sensitive to them </strong></p>
        <p>(smaller reachable area)</p>
        <ul className={sty["tooltip-list"]}>
          <li><strong>0</strong>: I feel uncomfortable without it</li>
          <li><strong>1</strong>: I don’t mind</li>
        </ul>
      </>
    );
  } else if (type === "barrier") {
    content = (
      <>
        <p><strong>The barriers</strong> that reduce walking comfort.</p>
        <p><strong>Lower values = You are more sensitive to them</strong></p>
        <p>(smaller reachable area)</p>
        <ul className={sty["tooltip-list"]}>
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
