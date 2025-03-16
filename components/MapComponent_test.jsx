import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
//import dijkstra from "dijkstrajs";
import * as dijkstra from "dijkstrajs";
//import graphlib from "graphlib";
//import { Graph, alg } from "graphlib";
import * as turf from "@turf/turf";
import proj4 from "proj4";
import rbush from "rbush";

//icon for start point, mark the position the user clicked
const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

const MapViewControl = ({ reachableRoadsData }) => {
  const map = useMap();

  useEffect(() => {
    if (reachableRoadsData?.features?.length > 0) {
      const bounds = L.geoJSON(reachableRoadsData).getBounds();
      map.flyToBounds(bounds, { padding: [50, 50] });
    }
  }, [reachableRoadsData]);

  return null;
};

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
  if (isNaN(projected[0]) || isNaN(projected[1])) {
    console.error("❌ 投影失败:", coord);
  }
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

const findNearestGraphNode = (startPoint, adjacencyList) => {
  const projectedStart = toProjected(startPoint);

  
  const tree = new rbush();
  const nodes = Object.keys(adjacencyList).map((nodeKey) => {
    const [x, y] = nodeKey.split(",").map(Number);
    return {
      minX: x,
      minY: y,
      maxX: x,
      maxY: y,
      nodeKey,
      x,
      y
    };
  });
  tree.load(nodes);

  const searchRadius = 2000; // 1km
  const candidateNodes = tree.search({
    minX: projectedStart[0] - searchRadius,
    minY: projectedStart[1] - searchRadius,
    maxX: projectedStart[0] + searchRadius,
    maxY: projectedStart[1] + searchRadius
  });

  
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

  
  console.log("📍 选中的起点 (25832):", projectedStart);
  console.log("📌 R-tree 里最近的匹配点:", nearestNode || "未找到");
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
  const [geoJsonData, setGeoJsonData] = useState({});
  const [availableFiles, setAvailableFiles] = useState([]);
  const [roadNetwork, setRoadNetwork] = useState(null);
  
  function buildAdjacencyList(roadData) {
    const adjacencyList = {};

    roadData.features.forEach((feature, idx) => {
      
      const geom = feature.geometry;
      
      if (!geom) {
        console.warn(`⚠️ Feature ${idx} 无几何数据`);
        return;
      }

      // 可能是 LineString 或 MultiLineString
      const coordSets =
        geom.type === "MultiLineString" ? geom.coordinates : [geom.coordinates];

      coordSets.forEach((coords) => {
        for (let i = 0; i < coords.length - 1; i++) {
          const startProj = toProjected(coords[i]);     // [x1, y1]
          const endProj   = toProjected(coords[i + 1]); // [x2, y2]

          const startKey = `${startProj[0]},${startProj[1]}`;
          const endKey   = `${endProj[0]},${endProj[1]}`;

          const dist = Math.hypot(startProj[0] - endProj[0], startProj[1] - endProj[1]);

          // 添加距离验证
          // if (isNaN(dist) || dist <= 0) {
          //   console.error("❌ 无效道路长度:", startKey, "→", endKey, "距离:", dist);
          //   continue; // 跳过无效边
          // }

          // 确保对象存在，然后为其添加边
          if (!adjacencyList[startKey]) adjacencyList[startKey] = {};
          adjacencyList[startKey][endKey] = dist;

          // 无向图，所以反向也需要
          if (!adjacencyList[endKey]) adjacencyList[endKey] = {};
          adjacencyList[endKey][startKey] = dist;
        }
      });
    });
    console.log("邻接表示例（前5个节点）:", Object.entries(adjacencyList).slice(0, 5));

    return adjacencyList;
  }

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

  const computeReachableArea = (adjacencyList, startPointUTM, maxTime) => {

    const startKey = `${startPointUTM[0]},${startPointUTM[1]}`;
    console.log("检查起点是否存在:", startKey, adjacencyList[startKey]);
  
    if (!adjacencyList[startKey]) {
      console.error("❌ 计算失败：起点未连接到路网");
      return null;
    }

    console.log("✅ Dijkstra 计算进行中...");
    console.time("Dijkstra");
    const resultObj = dijkstra.single_source_shortest_paths(
      adjacencyList,
      startKey
    );
    console.timeEnd("Dijkstra");
    console.log("Dijkstra结果示例:", Object.entries(resultObj).slice(0, 5));
    console.log("Dijkstra结果完整检查:", Object.entries(resultObj).map(([k, v]) => `${k}: ${v.distance}`).slice(0, 10));
  
    const walkingSpeed = 1.4; // 米/秒
    const maxDistance = maxTime * 60 * walkingSpeed;
  
    //-----------------------------------------------
    // 1) 可达节点散点 (Point)
    //-----------------------------------------------
    const pointFeatures = [];
    for (const [nodeKey, info] of Object.entries(resultObj)) {
      if (typeof info.distance !== "number") {
        console.error("❌ 无效距离:", nodeKey, info);
        continue;
      }
      const distance = info.distance;
      if (distance <= maxDistance) {
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
        .filter(([_, dist]) => dist <= maxDistance)
        .map(([nodeKey]) => nodeKey)
    );

    // const xCoords = Array.from(reachableNodes).map(k => parseFloat(k.split(",")[0]));
    // console.log("可达节点东经范围:", Math.min(...xCoords), "~", Math.max(...xCoords));

    // 遍历所有邻接信息，如果至少一端在 reachableNodes 里，就把它视为可达边
    for (const vKey of Object.keys(adjacencyList)) {
      for (const wKey of Object.keys(adjacencyList[vKey])) {
        const isVReachable = reachableNodes.has(vKey);
        const isWReachable = reachableNodes.has(wKey);
        // 至少有一端可达，就把这条边纳入
        if (isVReachable || isWReachable) {
          const [x1, y1] = vKey.split(",").map(Number);
          const [x2, y2] = wKey.split(",").map(Number);
          const coord1 = toWGS84([x1, y1]);
          const coord2 = toWGS84([x2, y2]);
          lineFeatures.push(turf.lineString([coord1, coord2]));
        }
      }
    }

    const roadsFC = turf.featureCollection(lineFeatures);

    console.log('可达道路要素数量:', roadsFC.features.length);
    console.log('可达点要素数量:', pointsFC.features.length);

    return {
      pointsGeoJSON: pointsFC,   // 所有可达节点散点
      roadsGeoJSON: roadsFC      // 可达道路
      // 如果还要凹壳，就用 concave / convex 做一下
    };

  };         

  useEffect(() => {
    if (computeAccessibility && startPoint && roadNetwork) {
      console.log("开始计算可达性区域...");
      setIsCalculating(true);
  
      // 1) 构建邻接表 (替代原buildGraph)
      const adjacencyList = buildAdjacencyList(roadNetwork);
  
      // 2) 找 nearestNode (照你现有 rbush 逻辑不变)
      const adjustedStartPoint = findNearestGraphNode(startPoint, adjacencyList);
  
      // 3) 计算可达范围
      const result = computeReachableArea(adjacencyList, adjustedStartPoint, walkingTime);
      if (result) {
        
        setIsochroneData(result.pointsGeoJSON);
        
        setReachableRoadsData(result.roadsGeoJSON);
      
      }
  
      setComputeAccessibility(false);
      setIsCalculating(false);
    }
  }, [computeAccessibility]);
  

  // 监听地图点击事件
  // const MapClickHandler = () => {
  //   useMapEvents({
  //     click: (e) => {
  //       if (selectingStart) {
  //         const startPt = [e.latlng.lng, e.latlng.lat];
  //         console.log("用户选择起点 (EPSG:4326)[lon, lat]:", startPt);
  //         setStartPoint(startPt);
  //         setSelectingStart(false);
  //       }
  //     },
  //   });
  //   return null;
  // };
  const MapClickHandler = ({ selectingStart, setSelectingStart, setStartPoint }) => {
    const map = useMap(); // 直接在此子组件中获取 map 实例
  
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
        <MapViewControl reachableRoadsData={reachableRoadsData} />
        <MapClickHandler 
          selectingStart={selectingStart}
          setSelectingStart={setSelectingStart}
          setStartPoint={setStartPoint}
        />

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
            key="reachable-roads" // 确保唯一性
            data={reachableRoadsData}
            style={{ 
              color: "#ff0000", 
              weight: 5,          // 加粗线条
              opacity: 0.8 
            }}
            zIndex={1000}         // 确保图层在顶层
          />
        )}

        {/* {reachableHullData && (
          <GeoJSON
            data={reachableHullData}
            style={{ color: "black", weight: 2, fillOpacity: 0.15 }}
          />
        )}
         */}

        {/* Display the isochrone data */}
        {isochroneData && (
          <GeoJSON
            key="isochrone-points"
            data={isochroneData}
            pointToLayer={(feature, latlng) => {

              return L.circleMarker(latlng, {
                radius: 8,           // 增大点半径
                fillColor: "#9400D3",
                color: "#4B0082",    // 更深的边框色
                weight: 2,
                fillOpacity: 0.8,
              });
            }}
            zIndex={1001}           // 点层在线上方
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
