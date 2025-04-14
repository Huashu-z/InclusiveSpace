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
  computeAccessibility,
  setComputeAccessibility,
  resetTrigger,
  onResetHandled,
  layerValues
}) => {
  const [reachableRoadsData, setReachableRoadsData] = useState(null); 
  const [reachableHullData, setReachableHullData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]);  

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

      // click: async (e) => {
      //   if (selectingStart) {
      //     const [lon, lat] = [e.latlng.lng, e.latlng.lat];
      //     console.log("User click coordinates: ", [lon, lat]);
      //     setStartPoint([lon, lat]);
      //     setSelectingStart(false);
      
      //     setIsCalculating(true);
      //     const result = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed);
      //     const roadFeatures = result.roads?.features || [];
      //     setIsCalculating(false);

      //     const featureCollection = turf.featureCollection(roadFeatures);

      //     // Merge into a MultiLineString geometry
      //     const combined = turf.combine(featureCollection); 

      //     // generate buffer area
      //     const outerHull = turf.buffer(combined, 0.1, { units: "kilometers" }); 

      //     // for rendering
      //     setReachableHullData(outerHull);
      //     setReachableRoadsData(result.roads);
      
      //   }
      // }      
      
      click: (e) => {
        if (selectingStart) {
          const [lon, lat] = [e.latlng.lng, e.latlng.lat];
          console.log("🖱️ 已选起点：", [lon, lat]);
          setStartPoint([lon, lat]);
          setSelectingStart(false);
        }
      }
      
    });
    return null;
  };

  useEffect(() => {
    const performAnalysis = async () => {
      if (!startPoint) {
        alert("请先选择起点");
        return;
      }
      setIsCalculating(true);
      const [lon, lat] = startPoint;
      const result = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed);
      const roadFeatures = result.roads?.features || [];
      const featureCollection = turf.featureCollection(roadFeatures);
      const combined = turf.combine(featureCollection); 
      const outerHull = turf.buffer(combined, 0.1, { units: "kilometers" }); 
      setReachableHullData(outerHull);
      setReachableRoadsData(result.roads);
      setIsCalculating(false);
      setComputeAccessibility(false); // 避免重复触发
    };
  
    if (computeAccessibility) {
      performAnalysis();
    }
  }, [computeAccessibility]);
  
 
  // selected variable rendering setting colors
  const layerColors = {
    default: "#000000",   
    light: "#ED553B",     
    tactile_pavement: "#F6D55C",  
    Crossing: "#20639B",   
    noise: "#3CAEA3",      
    tree: "#173F5F"        
  };

  // static geojson buffer bounding style
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
