import React, { useEffect, useRef } from "react";
import styles from "./Legend.module.css";

const variableDisplayNames = {
  noise: "Noise",
  light: "Illuminating Lights",
  tree: "Tree Coverage",
  trafficLight: "Traffic Lights",
  tactile_pavement: "Tactile Support",
  temperatureSummer: "Temperature Summer",
  temperatureWinter: "Temperature Winter"
};

const Legend = ({ resultMetadata }) => {
  const legendRef = useRef(null);

  useEffect(() => {
    const container = legendRef.current;
    container.innerHTML = "";

    // 阻止滚轮事件传递给地图（避免地图缩放）
    const blockWheel = (e) => {
      e.stopPropagation();
    };
    container.addEventListener("wheel", blockWheel, { passive: false });

    //title
    const mainTitle = document.createElement("div");
    mainTitle.className = styles["legend-main-title"];
    mainTitle.innerText = "Catchment Area Results";
    container.appendChild(mainTitle);

    // 渲染图例内容
    resultMetadata.forEach((entry, index) => {
      const section = document.createElement("div");
      section.className = styles["legend-section"];

      const title = document.createElement("div");
      title.className = styles["legend-title"];
      title.innerText = `Area ${index + 1}`;
      title.style.cursor = "pointer";
      title.onclick = () => {
        console.log("Legend clicked:", index);
        if (typeof window !== "undefined" && window.focusAreaFromLegend) {
          window.focusAreaFromLegend(index);
        }
      };
      section.appendChild(title);

      const timeLine = document.createElement("div");
      timeLine.innerText = `Time: ${entry.time} min`;
      section.appendChild(timeLine);

      const speedLine = document.createElement("div");
      speedLine.innerText = `Speed: ${entry.speed} km/h`;
      section.appendChild(speedLine);

      const areaLine = document.createElement("div");
      areaLine.innerText = `Area: ${entry.area} ha`;
      section.appendChild(areaLine);

      // 展开按钮与细节内容
      let showDetails = false;

      const toggleButton = document.createElement("button");
      toggleButton.className = styles["toggle-button"];
      toggleButton.innerText = "► Comfort Features Weights";

      const detailsContainer = document.createElement("div");
      detailsContainer.style.marginLeft = "8px";
      detailsContainer.style.display = "none";

      toggleButton.onclick = () => {
        showDetails = !showDetails;
        detailsContainer.style.display = showDetails ? "block" : "none";
        toggleButton.innerText = showDetails
          ? "▼ Comfort Features Weights"
          : "► Comfort Features Weights";
      };

      section.appendChild(toggleButton);
      section.appendChild(detailsContainer);

      // render features
      let hasFeatures = false;
      for (const layer of entry.layers) {
        const displayName = variableDisplayNames[layer] || layer;
        const value = entry.values[layer] ?? "N/A";

        const paramLine = document.createElement("div");
        paramLine.innerText = `• ${displayName}: ${value}`;
        paramLine.style.marginLeft = "8px";
        detailsContainer.appendChild(paramLine);

        hasFeatures = true;
      }
      // if no features, show "None"
      if (!hasFeatures) {
        const noneLine = document.createElement("div");
        noneLine.innerText = "None";
        noneLine.style.marginLeft = "8px";
        noneLine.style.fontStyle = "italic";
        detailsContainer.appendChild(noneLine);
      }

      // add color box for each entry
      const colorBox = document.createElement("span");
      colorBox.className = styles["legend-color-box"];
      colorBox.style.backgroundColor = entry.color;
      title.prepend(colorBox);

      container.appendChild(section);
    });

    return () => {
      container.removeEventListener("wheel", blockWheel);
    };
  }, [resultMetadata]);

  return <div className={styles["legend-container"]} ref={legendRef} />;
};

export default Legend;
