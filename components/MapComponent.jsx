import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css"; 
import * as turf from "@turf/turf";
import proj4 from "proj4"; 
import Legend from "./Legend";

//icon for start point, mark the position the user clicked
const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});
 
// 定义 EPSG:4326 (WGS84) 和 EPSG:25832 (UTM Zone 32N) 的投影参数
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
 
const MapComponent = ({ 
  selectedLayers, 
  selectingStart, 
  setSelectingStart, 
  walkingTime, 
  walkingSpeed, 
  startPoint, 
  setStartPoint, 
  resetTrigger,
  onResetHandled,
  layerValues
}) => {
  const [reachableRoadsData, setReachableRoadsData] = useState(null); 
  const [reachableHullData, setReachableHullData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]); 
  //   const graph = new Graph({ directed: false });
  
  //   console.log("📌 开始解析道路数据...");
  //   let totalEdges = 0;
  //   let totalFeatures = 0;

  //   // 是否启用噪声权重
  //   const applyNoiseWeight = selectedLayers.includes("noise"); 
  
  //   roadData.features.forEach((feature, idx) => {
  //     const geom = feature.geometry;
  //     const properties = feature.properties;
  //     //if (!geom) return;
  //     if (!geom) {
  //       console.warn(`⚠️ Feature ${idx} 无几何数据`);
  //       return;
  //     }
  //     totalFeatures++;
  
  //     let coordSets = geom.type === "MultiLineString" ? geom.coordinates : [geom.coordinates];
  
  //     coordSets.forEach((coords) => {
  //       for (let i = 0; i < coords.length - 1; i++) {
  //         const startProj = toProjected(coords[i]); // coords[i] is [lon, lat]
  //         const endProj = toProjected(coords[i + 1]);

  //         //console.log("原始坐标:", coords[i], "→ 投影后:", startProj);
  //         //console.log("原始坐标:", coords[i+1], "→ 投影后:", endProj);
  
  //         const startKey = `${startProj[0]},${startProj[1]}`;
  //         const endKey = `${endProj[0]},${endProj[1]}`;
  
  //         const dist = Math.hypot(startProj[0] - endProj[0], startProj[1] - endProj[1]);
  //         // const weightFactor = properties.weight_noise ?? 1.0; // 如果 `weight_noise` 不存在，则默认为 1.0
  //         // const weightedDist = dist / weightFactor; // **调整距离**
  //         //console.log(`边距离: ${dist} 米，起点: ${startKey}，终点: ${endKey}`); // 添加调试日志

  //         let weightedDist = dist; 

  //         // ✅ 只有在 "Noise" 选中的情况下，才对距离应用 `weight_noise`
  //         if (applyNoiseWeight) {
  //           const weightFactor = properties.weight_noise !== undefined ? properties.weight_noise : 1.0;
  //           weightedDist = dist / weightFactor; // 🚀 确保速度降低时，距离增加
  //         }

  //         graph.setEdge(startKey, endKey, weightedDist);
  //         graph.setEdge(endKey, startKey, weightedDist);
  //         // graph.setEdge(startKey, endKey, dist);
  //         // graph.setEdge(endKey, startKey, dist);
  //         //console.log(`添加双向边: ${startKey} ↔ ${endKey} (距离: ${dist.toFixed(2)} 米)`); // 格式化输出
  //         totalEdges++;
  //       }
  //     });
  //   });
  
  //   console.log(`✅ 解析完成！总边数: ${totalEdges}`);
  //   console.log(`📌 Graph 总节点数: ${graph.nodeCount()}`);
  //   console.log("📌 Graph 节点示例:", graph.nodes().slice(0, 5));
  //   console.log(`✅ 总处理要素数量: ${totalFeatures}`);
  
  //   return graph;
  // };    

  const [isCalculating, setIsCalculating] = useState(false); // function attachment calculation works?

  useEffect(() => {
    if (resetTrigger) {
      console.log("Subcomponent: Start clearing the map of reachable results...");
      // 清除各种本地结果
      // setIsochroneData(null);
      setReachableRoadsData(null);
      setReachableHullData(null);

      // 这里也可以清除你任何想要重置的 child state

      // 通知父组件“我清理完了”，父组件会把 resetTrigger 设回 false
      onResetHandled && onResetHandled();
    }
  }, [resetTrigger, onResetHandled]);

  // useEffect(() => {
  //   if (selectedLayers.includes("roads")) {
  //     const fetchRoadData = async () => {
  //       try {
  //         //const response = await fetch("/data/stadtstrassen_EPSG_4326.json");
  //         const response = await fetch("/data/street_noise_4326.geojson");
  //         if (!response.ok) throw new Error("Unable to load road data");
  //         const data = await response.json();
  //         setRoadNetwork(data);
  //       } catch (error) {
  //         console.error("Failed to load road data:", error);
  //       }
  //     };
  //     fetchRoadData();
  //   } else {
  //     setRoadNetwork(null); // 取消选中时清除道路数据
  //   }
  // }, [selectedLayers]);
  
  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const response = await fetch("/data/file-list.json");
        const files = await response.json();
        setAvailableFiles(files);
      } catch (error) {
        console.error("Unable to load file list:", error);
      }
    };
    fetchFileList();
  }, []);

  useEffect(() => {
    console.log("Current walking time:", walkingTime);
  }, [walkingTime]);  
  useEffect(() => {
    console.log("Current walking speed:", walkingSpeed);
  }, [walkingSpeed]); 

  useEffect(() => {
    console.log("🚀 MapComponent 接收到 selectedLayers:", selectedLayers);
  }, [selectedLayers]);

  useEffect(() => {
    const loadGeoJsonData = async () => {
      const newGeoJsonData = {};
      
      for (const keyword of selectedLayers) {
        
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
 
  const fetchAccessibilityFromBackend = async (lat, lon, time, speed) => {
    try {
      const res = await fetch(`/api/accessibility?lat=${lat}&lon=${lon}&time=${time}&speed=${speed}`);
      if (!res.ok) throw new Error("API call failed");
      const geojson = await res.json();
      return geojson;
    } catch (err) {
      console.error("Failed to obtain reachability area:", err);
      return null;
    }
  };  

  // Listen for map click events
  const MapClickHandler = () => {
    useMapEvents({

      click: async (e) => {
        if (selectingStart) {
          const [lon, lat] = [e.latlng.lng, e.latlng.lat];
          console.log("User click coordinates: ", [lon, lat]);
          setStartPoint([lon, lat]);
          setSelectingStart(false);
      
          setIsCalculating(true);
          const result = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed);
          const roadFeatures = result.roads?.features || [];
          setIsCalculating(false);

          const featureCollection = turf.featureCollection(roadFeatures);

          // Merge into a MultiLineString geometry
          const combined = turf.combine(featureCollection); 

          // generate buffer area
          const outerHull = turf.buffer(combined, 0.1, { units: "kilometers" }); 

          // for rendering
          setReachableHullData(outerHull);
          setReachableRoadsData(result.roads);
      
        }
      }      
    });
    return null;
  };
 
  // selected variable rendering setting colors
  const layerColors = {
    default: "#000000",   
    light: "#ED553B",     
    tactile_pavement: "#F6D55C",  
    Crossing: "#20639B",   
    noise: "#3CAEA3",      
    tree: "#173F5F"        
  };

  // geojson bounding boxes style
  const geoJsonStyle = (fileName) => {
    // 找到对应的 variable 颜色
    const layerName = Object.keys(layerColors).find(layer => fileName.includes(layer));
    const color = layerName ? layerColors[layerName] : "#000000"; // 默认为黑色
    return {
      color: color,
      weight: 2,  // 线条粗细
      fillOpacity: 0  // 透明填充
    };
  };

  return (
    <div className="mapBox">
      <MapContainer center={[53.48929, 10.20823]} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <TileLayer
          //different base map

          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

          // attribution='&copy; <a href="https://www.esri.com/">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          // url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"

          // attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; OpenStreetMap contributors'
          // url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"

          // attribution='&copy; <a href="https://www.jawg.io/">Jawg Maps</a>, &copy; OpenStreetMap contributors'
          // url="https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token=N8tyqxwOfghCwYKUCRWMrtYjDEs1VLvvtwYHg5MhjaJyatpgD5OGoH7O94u901Ko"
        />
        <MapClickHandler />

        {/* Display road network */}
        {/*
        {roadNetwork && selectedLayers.includes("roads") && (
          <GeoJSON data={roadNetwork} style={{ color: "gray", weight: 1 }} />
        )}*/}

        {/* Display start point */}
        {startPoint && (
          <Marker position={[startPoint[1], startPoint[0]]} icon={customMarkerIcon}>
            <Popup>Analysis starting point</Popup>
          </Marker>
        )}

        {/* Display the loaded GeoJSON data */}
        {Object.entries(geoJsonData).map(([fileName, data]) => (
          <GeoJSON key={fileName} data={data} style={() => geoJsonStyle(fileName)} />
        ))}

        {/* ✅ 引用 Legend 组件 */}
        <Legend
          walkingTime={walkingTime}
          walkingSpeed={walkingSpeed}
          selectedLayers={selectedLayers}
          layerValues={layerValues}
        />

        {isCalculating && (
          <div style={{ color: "red", fontWeight: "bold", marginTop: "10px" }}>
            ⏳ 计算中，请稍候...
          </div>
        )}

        {reachableRoadsData && (
          <GeoJSON
            data={reachableRoadsData}
            style={{ color: '#0072bd', weight: 1 }}
          />
        )}

        {reachableHullData && (
          <GeoJSON
            data={reachableHullData}
            style={{ color: "black", weight: 2, fillOpacity: 0.15 }}
          />
        )} 
         
      </MapContainer>
    </div>
  );
};

export default MapComponent;
