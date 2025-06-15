import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import styles from "./Legend.module.css"; // 

const Legend = ({ resultMetadata = [] }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: "bottomright", marginBottom: 30 });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div");
      div.className = styles["legend-container"];
 
      const title = document.createElement("div");
      title.className = styles["legend-title"];
      title.innerText = "Accessibility Results";
      div.appendChild(title);

      if (resultMetadata.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.innerText = "No result calculated.";
        div.appendChild(emptyMessage);
      } else {
        resultMetadata.forEach((entry, index) => {
          const section = document.createElement("div");
          section.style.marginBottom = "10px";

          // title
          const resultTitle = document.createElement("div");
          resultTitle.innerHTML = `<strong style="color: ${entry.color};">Catchment Area ${index + 1}</strong>`;
          section.appendChild(resultTitle);

          // time and speed
          const timeLine = document.createElement("div");
          timeLine.innerText = `Time: ${entry.time} min`;
          section.appendChild(timeLine);

          const speedLine = document.createElement("div");
          speedLine.innerText = `Speed: ${entry.speed} km/h`;
          section.appendChild(speedLine);

          // Comfort Features title
          const comfortTitle = document.createElement("div");
          comfortTitle.innerText = "Comfort Features Weights:";
          comfortTitle.style.marginTop = "5px";
          //comfortTitle.style.fontWeight = "bold";
          section.appendChild(comfortTitle);

          // Variable name mapping
          const variableDisplayNames = {
            noise: "Noise",
            light: "Illuminating Lights",
            tree: "Tree Coverage",
            trafficLight: "Traffic Lights",
            tactile_pavement: "Tactile Support"
          };

          // Individual comfort variables
          for (const layer of entry.layers) {
            const displayName = variableDisplayNames[layer] || layer;
            const paramLine = document.createElement("div");
            paramLine.innerText = `  • ${displayName}: ${entry.values[layer] ?? "N/A"}`;
            paramLine.style.marginLeft = "8px";
            section.appendChild(paramLine);
          }

          div.appendChild(section);
        }); 
      }
 
      return div;
    };
 
    legend.addTo(map); 
    return () => {
      legend.remove();
    };
  }, [map, resultMetadata]);

  return null;
};

export default Legend;
