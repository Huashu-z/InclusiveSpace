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
  const [reachableRoadsData, setReachableRoadsData] = useState(null); 
  const [reachableHullData, setReachableHullData] = useState(null);
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

    const startKey = `${startPointUTM[0].toFixed(2)},${startPointUTM[1].toFixed(2)}`;
  
    // 同原逻辑
    if (!graph.hasNode(startKey)) {
      console.error("❌ 计算失败：起点未连接到路网");
      return null;
    }
  
    const weightFn = (edge) => graph.edge(edge);
  
    console.log("✅ Dijkstra 计算进行中...");
    console.time("Dijkstra");
    const resultObj = alg.dijkstra(graph, startKey, weightFn);
    console.timeEnd("Dijkstra");
  
    const walkingSpeed = 1.4; // 米/秒
    const maxDistance = maxTime * 60 * walkingSpeed;
  
    //-----------------------------------------------
    // 1) 可达节点散点 (Point)
    //-----------------------------------------------
    const pointFeatures = [];
    for (const [nodeKey, info] of Object.entries(resultObj)) {
      if (info.distance <= maxDistance) {
        const [x, y] = nodeKey.split(",").map(Number);
        const [lon, lat] = toWGS84([x, y]);
        pointFeatures.push(turf.point([lon, lat]));
      }
    }
  
    const pointsFC = turf.featureCollection(pointFeatures);
  
    //-----------------------------------------------
    // 2) 从图里把可达道路(边)筛选出来，生成 LineString
    //-----------------------------------------------
    const lineFeatures = [];
    graph.edges().forEach((edge) => {
      const distU = resultObj[edge.v]?.distance;
      const distV = resultObj[edge.w]?.distance;
      if (distU != null && distV != null && distU <= maxDistance && distV <= maxDistance) {
        const [x1, y1] = edge.v.split(",").map(Number);
        const [x2, y2] = edge.w.split(",").map(Number);
        const coord1 = toWGS84([x1, y1]); // [lon, lat]
        const coord2 = toWGS84([x2, y2]); // [lon, lat]
        lineFeatures.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [coord1, coord2],
          },
          properties: {},
        });
      }
    });
    const roadsFC = {
      type: "FeatureCollection",
      features: lineFeatures,
    };
  
    //-----------------------------------------------
    // 3) 凹壳 (Concave Hull) 多边形
    //    (若 concave() 返回 null，则可 fallback 到 convex())
    //-----------------------------------------------
    let hull = turf.concave(pointsFC, { maxEdge: 2000, units: "meters" });
    if (!hull) {
      hull = turf.convex(pointsFC);
    }
  
    //-----------------------------------------------
    // 4) 组织结果
    //-----------------------------------------------
    const pointsGeoJSON = pointsFC;    // 零散点
    const roadsGeoJSON  = roadsFC;     // LineString
    const hullGeoJSON   = hull;        // Polygon / MultiPolygon
  
    return { pointsGeoJSON, roadsGeoJSON, hullGeoJSON };
  };         

  useEffect(() => {
    if (computeAccessibility && startPoint && roadNetwork) {
      console.log("开始计算可达性区域...");
      setIsCalculating(true);

      const roadGraph = buildGraph(roadNetwork);
      const adjustedStartPoint = findNearestGraphNode(startPoint, roadGraph);
      console.log("调整后的起点(UTM 25832):", adjustedStartPoint);

      // 计算可达区域 (3种结果)
      const result = computeReachableArea(roadGraph, adjustedStartPoint, walkingTime);
      if (result) {
        // 原先 isochroneData 存的只是“散点”，
        // 现在改成看你想存啥；也可以把 points 仍然称作 isochroneData
        setIsochroneData(result.pointsGeoJSON);

        // 新增：可达道路 & 凹壳多边形
        setReachableRoadsData(result.roadsGeoJSON);
        setReachableHullData(result.hullGeoJSON);
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

        {reachableRoadsData && (
          <GeoJSON
            data={reachableRoadsData}
            style={{ color: "red", weight: 2 }}
          />
        )}

        {reachableHullData && (
          <GeoJSON
            data={reachableHullData}
            style={{ color: "black", weight: 2, fillOpacity: 0.15 }}
          />
        )}
        
        {/* Display the isochrone data */}
        {isochroneData && (
          <GeoJSON data={isochroneData} /* 这些是散点 */
            pointToLayer={(feature, latlng) => {
              // 若想让散点更明显，可用 circleMarker
              return L.circleMarker(latlng, {
                radius: 4,
                fillColor: "purple",
                color: "purple",
                weight: 1,
                fillOpacity: 0.7,
              });
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
