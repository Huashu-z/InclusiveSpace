import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import dijkstra from "dijkstrajs";
import graphlib from "graphlib";
import * as turf from "@turf/turf";

const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

const MapComponent = ({ 
  selectedLayers, 
  selectingStart, 
  setSelectingStart, 
  walkingTime, 
  startPoint, 
  setStartPoint,
  computeAccessibility,
  setComputeAccessibility
}) => {
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]);
  const [roadNetwork, setRoadNetwork] = useState(null);

  const buildGraph = (roadData) => {
    const graph = new graphlib.Graph();
  
    roadData.features.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      const roadLength = turf.length(feature, { units: "meters" }); // 计算道路长度
      const travelTime = roadLength / 83.33; // 计算步行时间 (分钟)
  
      for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i].join(",");
        const end = coords[i + 1].join(",");
  
        graph.setEdge(start, end, travelTime);
        graph.setEdge(end, start, travelTime);
      }
    });
  
    return graph;
  };

  useEffect(() => {
    if (selectedLayers.includes("roads")) {
      const fetchRoadData = async () => {
        try {
          const response = await fetch("/data/stadtstrassen_EPSG_4326.json");
          if (!response.ok) throw new Error("Unable to load road data");
          const data = await response.json();
          setRoadNetwork(data);
        } catch (error) {
          console.error("Failed to load road data:", error);
        }
      };
      fetchRoadData();
    } else {
      setRoadNetwork(null); // 取消选中时清除道路数据
    }
  }, [selectedLayers]);
  
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

  const [isochroneData, setIsochroneData] = useState(null); // 存储可达区域

  const computeReachableArea = (graph, startPoint, maxTime) => {
    if (!graph.hasNode(`${startPoint[0]},${startPoint[1]}`)) {
      console.error("起点未连接到路网");
      return null;
    }

    const results = dijkstra.single_source_shortest_paths(graph, `${startPoint[0]},${startPoint[1]}`);

    const reachableRoads = Object.entries(results)
      .filter(([_, cost]) => cost <= maxTime) // 仅筛选在步行时间内的路径
      .map(([key]) => key.split(",").map(Number));

    return {
      "type": "FeatureCollection",
      "features": reachableRoads.map(([lon, lat]) => ({
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [lon, lat] },
        "properties": {}
      }))
    };
  };

  useEffect(() => {
    if (computeAccessibility && startPoint && roadNetwork) {
      console.log("计算可达区域...");

      const roadGraph = buildGraph(roadNetwork); // 创建加权图
      const isochrone = computeReachableArea(roadGraph, startPoint, walkingTime);

      if (isochrone) {
        setIsochroneData(isochrone);
      }

      setComputeAccessibility(false);
    }
  }, [computeAccessibility]);


  // 监听地图点击事件
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (selectingStart) {
          setStartPoint([e.latlng.lat, e.latlng.lng]); // 记录起点
          setSelectingStart(false); // 退出选点模式
        }
      },
    });
    return null;
  };

  return (
    <div className="mapBox">
      <MapContainer center={[53.557134, 10.012200]} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler />

        {/* Display road network */}
        {roadNetwork && selectedLayers.includes("roads") && (
          <GeoJSON data={roadNetwork} style={{ color: "gray", weight: 1 }} />
        )}

        {/* Display start point */}
        {startPoint && (
          <Marker position={startPoint} icon={customMarkerIcon}>
            <Popup>Analysis starting point</Popup>
          </Marker>
        )}

        {/* Display the loaded GeoJSON data */}
        {Object.entries(geoJsonData).map(([fileName, data]) => (
          <GeoJSON key={fileName} data={data} style={{ color: "blue", weight: 2, fillOpacity: 0.3 }} />
        ))}
        
        {/* Display the isochrone data */}
        {isochroneData && (
          <GeoJSON data={isochroneData} style={{ color: "purple", weight: 2, fillOpacity: 0.2 }} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
