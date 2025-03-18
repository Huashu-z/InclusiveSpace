import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
//import dijkstra from "dijkstrajs";
//import graphlib from "graphlib";
import { Graph, alg } from "graphlib";
import * as turf from "@turf/turf";
import proj4 from "proj4";
import rbush from "rbush";

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
  // 验证UTM Zone 32N范围（东经6°-12°，北纬应>0）
  if (projected[0] < 500000 || projected[0] > 999999) {
    console.error("❌ 异常UTM东经值:", projected[0]);
  }
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

// const findNearestGraphNode = (startPoint, graph) => {
//   const projectedStart = toProjected(startPoint); // ✅ 计算时转换 `EPSG:25832`

//   let nearestNode = null;
//   let minDistance = Infinity;

//   graph.nodes().forEach((nodeKey) => {
//     const [x, y] = nodeKey.split(",").map(Number);
//     const distance = Math.sqrt((x - projectedStart[0]) ** 2 + (y - projectedStart[1]) ** 2);

//     if (distance < minDistance) {
//       minDistance = distance;
//       nearestNode = [x, y];
//     }
//   });

//   console.log("📍 选中的起点 (25832):", projectedStart);
//   console.log("📌 Graph 里最近的匹配点:", nearestNode);
//   return nearestNode || projectedStart;
// };

const findNearestGraphNode = (startPoint, graph) => {
  const projectedStart = toProjected(startPoint); // 获取起点的UTM坐标

  //-----------------------------------------------
  // 1. 构建R-tree空间索引
  //-----------------------------------------------
  const tree = new rbush();
  const nodes = graph.nodes().map((nodeKey) => {
    const [x, y] = nodeKey.split(",").map(Number);
    return {
      minX: x,   // 节点的X坐标（UTM）
      minY: y,   // 节点的Y坐标（UTM）
      maxX: x,   // 因为是点数据，minX=maxX
      maxY: y,   // 同理，minY=maxY
      nodeKey,   // 原始节点键（如 "567190.23,5935018.05"）
      x, y       // 保存坐标用于后续计算
    };
  });
  tree.load(nodes); // 加载节点到R-tree

  //-----------------------------------------------
  // 2. 在R-tree中搜索附近候选节点（范围查询）
  //-----------------------------------------------
  const searchRadius = 1000; // 搜索半径（单位：米），根据实际路网密度调整
  const candidateNodes = tree.search({
    minX: projectedStart[0] - searchRadius,
    minY: projectedStart[1] - searchRadius,
    maxX: projectedStart[0] + searchRadius,
    maxY: projectedStart[1] + searchRadius
  });

  //-----------------------------------------------
  // 3. 在候选节点中找到最近的一个
  //-----------------------------------------------
  let nearestNode = null;
  let minDistance = Infinity;
  candidateNodes.forEach((node) => {
    const distance = Math.hypot(
      node.x - projectedStart[0],
      node.y - projectedStart[1]
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = [node.x, node.y];
    }
  });

  //-----------------------------------------------
  // 4. 返回结果（若未找到则返回原始点）
  //-----------------------------------------------
  console.log("📍 选中的起点 (25832):", projectedStart);
  console.log("📌 Graph 里最近的匹配点:", nearestNode || "未找到");
  return nearestNode || projectedStart;
};


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
  onResetHandled
}) => {
  const [reachableRoadsData, setReachableRoadsData] = useState(null); 
  const [reachableHullData, setReachableHullData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]);
  const [roadNetwork, setRoadNetwork] = useState(null);

  const buildGraph = (roadData, selectedLayers) => {
    const graph = new Graph({ directed: false });
  
    console.log("📌 开始解析道路数据...");
    let totalEdges = 0;
    let totalFeatures = 0;

    // 是否启用噪声权重
    const applyNoiseWeight = selectedLayers.includes("noise"); 
  
    roadData.features.forEach((feature, idx) => {
      const geom = feature.geometry;
      const properties = feature.properties;
      //if (!geom) return;
      if (!geom) {
        console.warn(`⚠️ Feature ${idx} 无几何数据`);
        return;
      }
      totalFeatures++;
  
      let coordSets = geom.type === "MultiLineString" ? geom.coordinates : [geom.coordinates];
  
      coordSets.forEach((coords) => {
        for (let i = 0; i < coords.length - 1; i++) {
          const startProj = toProjected(coords[i]); // coords[i] is [lon, lat]
          const endProj = toProjected(coords[i + 1]);

          //console.log("原始坐标:", coords[i], "→ 投影后:", startProj);
          //console.log("原始坐标:", coords[i+1], "→ 投影后:", endProj);
  
          const startKey = `${startProj[0]},${startProj[1]}`;
          const endKey = `${endProj[0]},${endProj[1]}`;
  
          const dist = Math.hypot(startProj[0] - endProj[0], startProj[1] - endProj[1]);
          // const weightFactor = properties.weight_noise ?? 1.0; // 如果 `weight_noise` 不存在，则默认为 1.0
          // const weightedDist = dist / weightFactor; // **调整距离**
          //console.log(`边距离: ${dist} 米，起点: ${startKey}，终点: ${endKey}`); // 添加调试日志

          let weightedDist = dist; 

          // ✅ 只有在 "Noise" 选中的情况下，才对距离应用 `weight_noise`
          if (applyNoiseWeight) {
            const weightFactor = properties.weight_noise !== undefined ? properties.weight_noise : 1.0;
            weightedDist = dist / weightFactor; // 🚀 确保速度降低时，距离增加
          }

          graph.setEdge(startKey, endKey, weightedDist);
          graph.setEdge(endKey, startKey, weightedDist);
          // graph.setEdge(startKey, endKey, dist);
          // graph.setEdge(endKey, startKey, dist);
          //console.log(`添加双向边: ${startKey} ↔ ${endKey} (距离: ${dist.toFixed(2)} 米)`); // 格式化输出
          totalEdges++;
        }
      });
    });
  
    console.log(`✅ 解析完成！总边数: ${totalEdges}`);
    console.log(`📌 Graph 总节点数: ${graph.nodeCount()}`);
    console.log("📌 Graph 节点示例:", graph.nodes().slice(0, 5));
    console.log(`✅ 总处理要素数量: ${totalFeatures}`);
  
    return graph;
  };    

  const [isCalculating, setIsCalculating] = useState(false); // 是否正在计算可达性区域

  useEffect(() => {
    if (resetTrigger) {
      console.log("子组件：开始清除地图上的可达结果...");
      // 清除各种本地结果
      setIsochroneData(null);
      setReachableRoadsData(null);
      setReachableHullData(null);

      // 这里也可以清除你任何想要重置的 child state

      // 通知父组件“我清理完了”，父组件会把 resetTrigger 设回 false
      onResetHandled && onResetHandled();
    }
  }, [resetTrigger, onResetHandled]);

  useEffect(() => {
    if (selectedLayers.includes("roads")) {
      const fetchRoadData = async () => {
        try {
          //const response = await fetch("/data/stadtstrassen_EPSG_4326.json");
          const response = await fetch("/data/street_noise_4326.geojson");
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

  const [isochroneData, setIsochroneData] = useState(null); // 存储可达区域

  const computeReachableArea = (graph, startPointUTM, maxTime) => {

    const startKey = `${startPointUTM[0]},${startPointUTM[1]}`;
  
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
    console.log("Dijkstra结果示例:", Object.entries(resultObj).slice(0, 5));
  
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
    const reachableNodes = new Set(
      Object.entries(resultObj)
        .filter(([_, { distance }]) => distance <= maxDistance)
        .map(([nodeKey]) => nodeKey)
    );

    const xCoords = Array.from(reachableNodes).map(k => parseFloat(k.split(",")[0]));
    console.log("可达节点东经范围:", Math.min(...xCoords), "~", Math.max(...xCoords));

    // 遍历所有边，检查至少一端在可达节点中
    graph.edges().forEach((edge) => {
      const isVReachable = reachableNodes.has(edge.v);
      const isWReachable = reachableNodes.has(edge.w);

      // 如果至少一端可达，则保留该边
      if (isVReachable && isWReachable) {
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
    let hull = turf.concave(pointsFC, { maxEdge: 5000, units: "meters" });
    if (!hull) {
      hull = turf.convex(pointsFC);
    }
  
    //-----------------------------------------------
    // 4) 组织结果
    //-----------------------------------------------
    const pointsGeoJSON = pointsFC;    // 零散点
    const roadsGeoJSON  = roadsFC;     // LineString
    const hullGeoJSON   = hull;        // Polygon / MultiPolygon

    // 在计算完成后添加
    const testWestKey = "567072, 5934847"; // 替换为实际西侧节点UTM坐标
    console.log("西侧节点是否可达:", resultObj[testWestKey]?.distance <= maxDistance);
    // 在 buildGraph 完成后
    console.log("西侧节点是否存在:", graph.hasNode("500000,5930000")); // 替换为实际坐标
    console.log("图的边示例（包含西侧）:", graph.edges().filter(edge => edge.v.includes("500000")));
  
    return { pointsGeoJSON, roadsGeoJSON, hullGeoJSON };
    return { pointsGeoJSON, roadsGeoJSON};
  };         

  useEffect(() => {
    if (computeAccessibility && startPoint && roadNetwork) {
      console.log("开始计算可达性区域...");
      setIsCalculating(true);

      const roadGraph = buildGraph(roadNetwork, selectedLayers);
      console.log("🚀 是否启用了 Noise 影响:", selectedLayers.includes("noise"));
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
  }, [computeAccessibility, selectedLayers]);


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

  const handleResetResults = () => {
    console.log("🚀 Resetting results from MapComponent...");
    setIsochroneData(null);
    setReachableRoadsData(null);
    setReachableHullData(null);
  
    // Call the parent component's reset function
    if (resetResults) {
      resetResults(); // ✅ Call the function passed from PlasmicUser.jsx
    }
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
          <Marker position={[startPoint[1], startPoint[0]]} icon={customMarkerIcon}>
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
