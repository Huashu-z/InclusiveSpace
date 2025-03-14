import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);
  return null;
};

const MapComponent = ({ selectedLayers }) => {
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]);

  // 预加载 /data/ 目录下所有 GeoJSON 文件
  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const response = await fetch("/data/file-list.json");
        const files = await response.json();
        setAvailableFiles(files);
      } catch (error) {
        console.error("无法加载文件列表:", error);
      }
    };
    fetchFileList();
  }, []);

  // 当 selectedLayers 变化时，动态加载匹配的 GeoJSON 文件
  useEffect(() => {
    const loadGeoJsonData = async () => {
      const newGeoJsonData = {};

      for (const keyword of selectedLayers) {
        // 筛选所有匹配的文件
        const matchedFiles = availableFiles.filter(file => file.includes(keyword));

        for (const file of matchedFiles) {
          try {
            const response = await fetch(`/data/${file}`);
            if (!response.ok) throw new Error(`加载失败: ${file}`);
            const data = await response.json();
            newGeoJsonData[file] = data;
          } catch (error) {
            console.error("加载 GeoJSON 失败:", error);
          }
        }
      }

      setGeoJsonData(newGeoJsonData);
    };

    if (availableFiles.length > 0) {
      loadGeoJsonData();
    }
  }, [selectedLayers, availableFiles]);

  // ✅ 定义不同文件的颜色映射
  const layerColors = {
    "intersection_density": "#FF0000", // 红色
    "noise": "#008000", // 绿色
    "street_lights": "#0000FF", // 蓝色
    "pois": "#FFA500", // 橙色
    "default": "#555555" // 默认灰色
  };

  // ✅ 根据文件名选择颜色
  const getLayerColor = (fileName) => {
    for (const key in layerColors) {
      if (fileName.includes(key)) {
        return layerColors[key];
      }
    }
    return layerColors.default;
  };

  return (
    <div className="mapBox">
      <MapContainer center={[53.557134, 10.012200]} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <MapUpdater />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ 根据文件名动态设置不同颜色 */}
        {Object.entries(geoJsonData).map(([fileName, data]) => (
          <GeoJSON 
            key={fileName} 
            data={data} 
            style={() => ({
              color: getLayerColor(fileName),
              weight: 2,
              fillOpacity: 0.3
            })} 
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
