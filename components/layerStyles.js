// layerStyles.js

import L from "leaflet";

// 分类颜色映射 - for noise
const noiseStyleMap = {
  "> 55 - 60 dB(A)": "#1a9850",  // green
  "> 60 - 65 dB(A)": "#91cf60",  // light green
  "> 65 - 70 dB(A)": "#d9ef8b",  // yellow-green
  "> 70 - 75 dB(A)": "#a6bddb",  // blue-violet
  "> 75 dB(A)": "#810f7c"   // dark purple
};

// 主样式函数：根据 layer 和 feature 返回样式
export function getStyle(layer, feature) {
  switch (layer) {
    case "noise": {
      const klasse = feature?.properties?.klasse?.toString() ?? "> 55 - 60 dB(A)";
      return {
        color: "#000",
        weight: 0.1,
        fillColor: noiseStyleMap[klasse] || "#ccc",
        fillOpacity: 0.3
      };
    }

    case "tree":
      return {
        radius: 5,
        fillColor: "green",
        color: "#000",
        weight: 0.1,
        opacity: 1,
        fillOpacity: 0.3
      };

    case "streetlight":
      return {
        radius: 5,
        fillColor: "blue",
        color: "#000",
        weight: 0.1,
        opacity: 1,
        fillOpacity: 0.3
      };

    case "tactile_points":
      return {
        radius: 5,
        fillColor: "orange",
        color: "#000",
        weight: 0.1,
        opacity: 1,
        fillOpacity: 0.3
      };

    default:
      return {
        color: "green",
        weight: 0.1,
        fillOpacity: 0.3
      };
  }
}

// 判断是否需要用 circleMarker 渲染点
export function useCircleMarker(layer) {
  return ["tree", "streetlight", "tactile_points"].includes(layer);
}
