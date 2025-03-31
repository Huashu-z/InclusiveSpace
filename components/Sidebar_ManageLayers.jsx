import React from "react";
import styles from "./plasmic/saa_s_website/PlasmicUser.module.css";

export default function MapLayers({ selectedLayers, toggleLayer }) {
  return (
    <div className={styles["sidebar-section"]}>
      <h3 className={styles["sidebar-title"]}>Map Layers</h3>
      <label>
        <input
          type="checkbox"
          checked={selectedLayers.includes("roads")}
          onChange={() => toggleLayer("roads")}
        />
        Roads
      </label>
    </div>
  );
}
