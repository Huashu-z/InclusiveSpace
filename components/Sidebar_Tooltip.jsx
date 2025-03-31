import React from "react";
import sty from "./Sidebar.module.css";

export default function Tooltip({ show }) {
  return (
    <div className={`${sty["tooltip"]} ${show ? sty["show"] : ""}`}>
      <p>Select variables and set the speed penalty between 0 and 1:</p>
      <ul>
        <p><strong>0</strong>: Completely inaccessible</p>
        <p><strong>1</strong>: Fully comfortable</p>
        <p>Lower values = Greater barrier</p>
      </ul>
    </div>
  );
}