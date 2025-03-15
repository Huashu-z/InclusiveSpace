import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
//import dijkstra from "dijkstrajs";
//import graphlib from "graphlib";
import { Graph, alg } from "graphlib";
import * as turf from "@turf/turf";
import proj4 from "proj4";

//icon for start point, mark the position the user clicked
const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

const [reachableRoadsData, setReachableRoadsData] = useState(null); 
const [reachableHullData, setReachableHullData] = useState(null);

// 定义 EPSG:4326 (WGS84) 和 EPSG:25832 (UTM Zone 32N) 的投影参数
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");

// 控制日志打印次数
let projectLogCount = 0;
let wgs84LogCount = 0;

// 经纬度 (4326) → 米制坐标 (25832)
// 使用解构赋值，从 coord 中提取 lat 和 lon，然后传入 [lon, lat]
const toProjected = (coord) => {
  const [lon, lat] = coord;
  const projected = proj4("EPSG:4326", "EPSG:25832", [lon, lat]);
  if (projectLogCount < 10) {
    console.log(`🌍 4326 -> 25832: [${lon}, ${lat}] -> [${projected[0]}, ${projected[1]}]`);
    projectLogCount++;
  }
  return projected;
};

// 米制坐标 (25832) → 经纬度 (4326)
const toWGS84 = (coord) => {
  const [x, y] = coord;
  const wgs84 = proj4("EPSG:25832", "EPSG:4326", [x, y]);
  if (wgs84LogCount < 10) {
    console.log(`📍 25832 -> 4326: [${x}, ${y}] -> [${wgs84[0]}, ${wgs84[1]}]`);
    wgs84LogCount++;
  }
  return wgs84;
};

const findNearestGraphNode = (startPoint, graph) => {
  const projectedStart = toProjected(startPoint); // ✅ 计算时转换 `EPSG:25832`

  let nearestNode = null;
  let minDistance = Infinity;

  graph.nodes().forEach((nodeKey) => {
    const [x, y] = nodeKey.split(",").map(Number);
    const distance = Math.sqrt((x - projectedStart[0]) ** 2 + (y - projectedStart[1]) ** 2);

    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = [x, y];
    }
  });

  console.log("📍 选中的起点 (25832):", projectedStart);
  console.log("📌 Graph 里最近的匹配点:", nearestNode);
  return nearestNode || projectedStart;
};


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
    const graph = new Graph({ directed: false });
  
    console.log("📌 开始解析道路数据...");
    let totalEdges = 0;
  
    roadData.features.forEach((feature) => {
      const geom = feature.geometry;
      if (!geom) return;
  
      let coordSets = geom.type === "MultiLineString" ? geom.coordinates : [geom.coordinates];
  
      coordSets.forEach((coords) => {
        for (let i = 0; i < coords.length - 1; i++) {
          const startProj = toProjected(coords[i]); // coords[i] is [lon, lat]
          const endProj = toProjected(coords[i + 1]);
  
          const startKey = `${startProj[0].toFixed(2)},${startProj[1].toFixed(2)}`;
          const endKey = `${endProj[0].toFixed(2)},${endProj[1].toFixed(2)}`;
  
          const dist = Math.sqrt((startProj[0] - endProj[0]) ** 2 + (startProj[1] - endProj[1]) ** 2);
  
          graph.setEdge(startKey, endKey, dist);
          graph.setEdge(endKey, startKey, dist);
          totalEdges++;
        }
      });
    });
  
    console.log(`✅ 解析完成！总边数: ${totalEdges}`);
    console.log(`📌 Graph 总节点数: ${graph.nodeCount()}`);
    console.log("📌 Graph 节点示例:", graph.nodes().slice(0, 5));
  
    return graph;
  };    

  const [isCalculating, setIsCalculating] = useState(false); // 是否正在计算可达性区域

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

  const computeReachableArea = (graph, startPointUTM, maxTime) => {
    //const projectedStart = toProjected(startPoint); // ✅ `EPSG:4326` → `EPSG:25832`
    const startKey = `${startPointUTM[0].toFixed(2)},${startPointUTM[1].toFixed(2)}`;
  
    console.log("🔍 检查 startKey 是否在 graph 里:", startKey);
    if (!graph.hasNode(startKey)) {
      console.error("❌ 计算失败：起点未连接到路网");
      return null;
    }

    // 1) 定义一个权重函数：从 graph.edge(e) 中拿到权重
    const weightFn = (edge) => {
      // graph.edge(e) 就是你在 buildGraph 时传进去的 distEdge
      return graph.edge(edge);
    };

    console.log("✅ Dijkstra 计算进行中...");
    console.time("Dijkstra");
    const resultObj = alg.dijkstra(graph, startKey, weightFn);
    console.timeEnd("Dijkstra");

    // resultObj 结构：{ nodeKey: { distance, predecessor }, ... }

    //console.log("✅ alg.dijkstra 计算进行中...");
    //const results = dijkstra.single_source_shortest_paths(graph, startKey);
  
    const walkingSpeed = 1.4; // 5 km/h -> 米/秒
    const maxDistance = maxTime * 60 * walkingSpeed;
  
    // const reachableRoads = Object.entries(results)
    //   .filter(([_, cost]) => cost <= maxDistance)
    //   .map(([key]) => key.split(",").map(Number));
  
    // return {
    //   "type": "FeatureCollection",
    //   "features": reachableRoads.map((projCoords) => ({
    //     "type": "Feature",
    //     "geometry": { "type": "Point", "coordinates": toWGS84(projCoords) }, // ✅ `EPSG:25832` → `EPSG:4326`
    //     "properties": {}
    //   }))
    // };

    // 用 Object.entries 遍历结果，然后只保留 distance <= maxDistance 的节点
    const reachableRoads = Object.entries(resultObj)
    .filter(([nodeKey, info]) => info.distance <= maxDistance)
    .map(([nodeKey]) => {
      // nodeKey 比如 "564100.12,5931302.77"
      return nodeKey.split(",").map(Number);
    });

    // 返回一个 GeoJSON FeatureCollection，跟你原本的逻辑一样
    return {
      type: "FeatureCollection",
      features: reachableRoads.map((projCoords) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: toWGS84(projCoords), // 记得用你现有的投影反转函数
        },
        properties: {}
      }))
    };
  };         

  useEffect(() => {
    if (computeAccessibility && startPoint && roadNetwork) {
      console.log("开始计算可达性区域...");
      setIsCalculating(true); // 设置计算状态为 true
  
      // 让起点对齐到最近的路网
      const roadGraph = buildGraph(roadNetwork);
      const adjustedStartPoint = findNearestGraphNode(startPoint, roadGraph);
      console.log("调整后的起点(UTM 25832):", adjustedStartPoint);
  
      // 计算可达区域
      const isochrone = computeReachableArea(roadGraph, adjustedStartPoint, walkingTime);
  
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
          const startPt = [e.latlng.lng, e.latlng.lat];
          console.log("用户选择起点 (EPSG:4326)[lon, lat]:", startPt);
          setStartPoint(startPt);
          setSelectingStart(false);
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

        {isCalculating && (
          <div style={{ color: "red", fontWeight: "bold", marginTop: "10px" }}>
            ⏳ 计算中，请稍候...
          </div>
        )}
        
        {/* Display the isochrone data */}
        {isochroneData && (
          <GeoJSON data={isochroneData} style={{ color: "purple", weight: 2, fillOpacity: 0.2 }} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
