import React from "react";
import styles from "./plasmic/saa_s_website/PlasmicUser.module.css";

export default function Tooltip({ show }) {
  return (
    <div className={`${styles["tooltip"]} ${show ? styles["show"] : ""}`}>
      <p>Select variables and set the speed penalty between 0 and 1:</p>
      <ul>
        <p><strong>0</strong>: Completely inaccessible</p>
        <p><strong>1</strong>: Fully comfortable</p>
        <p>Lower values = Greater barrier</p>
      </ul>
    </div>
  );
}