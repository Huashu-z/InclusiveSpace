import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import styles from "./Legend.module.css"; // ✅ 引入 CSS Modules

const layerColors = {
  original: "#000000",
  light: "#FF5733",
  tactile_pavement: "#FFC300",
  Crossing: "#36A2EB",
  noise: "#4BC0C0",
  tree: "#9966FF"
};

const Legend = ({ walkingTime, walkingSpeed, startPoint, selectedLayers, layerValues }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: "bottomright", marginBottom: 30 });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div");
      div.className = styles["legend-container"];

      // ✅ 创建标题
      const title = document.createElement("div");
      title.className = styles["legend-title"];
      title.innerText = "Map Information";
      div.appendChild(title);

      // ✅ 显示 Walking Time 和 Walking Speed
      const infoList = [
        `Walking Time: ${walkingTime} min`,
        `Walking Speed: ${walkingSpeed} km/h`
      ];
      infoList.forEach(text => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${text.split(":")[0]}:</strong> ${text.split(":")[1]}`;
        div.appendChild(p);
      });

      // ✅ 变量列表
      const variableTitle = document.createElement("p");
      variableTitle.innerHTML = "<strong>Catchment Area:</strong>";
      div.appendChild(variableTitle);

      const ul = document.createElement("ul");
      ul.className = styles["legend-list"];
      
      if (selectedLayers.length > 0) {
        selectedLayers.forEach(layer => {
          const li = document.createElement("li");

          // 圆形颜色标识
          const colorBox = document.createElement("span");
          colorBox.className = styles["legend-color"];
          colorBox.style.backgroundColor = layerColors[layer] || "#000000";
          li.appendChild(colorBox);

          // 变量文本
          const value = layerValues[layer] ?? "N/A"; // 允许0显示
          const textNode = document.createTextNode(`${layer}: ${value}`);
          li.appendChild(textNode);

          ul.appendChild(li);
        });
      } else {
        const emptyMessage = document.createElement("p");
        emptyMessage.innerText = "No variables selected";
        div.appendChild(emptyMessage);
      }

      div.appendChild(ul);
      return div;
    };

    console.log("Legend layerValues:", layerValues);
    console.log("Legend selectedLayers:", selectedLayers);

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map, walkingTime, walkingSpeed, startPoint, selectedLayers, layerValues]);

  return null;
};

export default Legend;
