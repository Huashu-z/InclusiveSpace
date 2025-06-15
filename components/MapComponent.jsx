import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css"; 
import * as turf from "@turf/turf";
import proj4 from "proj4"; 
import Legend from "./Legend";
import sty from './MapComponent.module.css'; 
import {getStyle, useCircleMarker,isWmsLayer, layerGroupMap, wmsLayerComponents} from "./LayerManager"; // Import the style functions 
 
//icon for start point, mark the position the user clicked
const customMarkerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
 
const MapComponent = ({ 
  selectedLayers, 
  enabledVariables,
  selectingStart, 
  setSelectingStart, 
  walkingTime, 
  walkingSpeed, 
  startPoints, 
  setStartPoints, 
  computeAccessibility,
  setComputeAccessibility,
  resetTrigger,
  onResetHandled,
  layerValues
}) => {
  const [reachableRoadsData, setReachableRoadsData] = useState([]); 
  const [reachableHullData, setReachableHullData] = useState([]); 
  const [geoJsonData, setGeoJsonData] = useState({}); 
  const [isCalculating, setIsCalculating] = useState(false); // function attachment calculation works? 
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); 
  const [resultMetadata, setResultMetadata] = useState([]); // store metadata for each result/ user setting each time
  
  const colorPool = [
    "#173F5F", "#3CAEA3", "#ED553B", "#20639B", "#F6D55C"
  ]; // color pool for different calculation results/ accessibility analysis

  //selectingStart is true when the user clicks the "Select Start Point" button
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
  
    if (selectingStart) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }
  
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [selectingStart]);
  
  // Reset the state when resetTrigger changes 
  useEffect(() => {
    if (resetTrigger) {
      setStartPoints([]);
      setReachableRoadsData([]);
      setReachableHullData([]);
      setResultMetadata([]);
      onResetHandled && onResetHandled();
    }
  }, [resetTrigger, onResetHandled]);  

  // Load GeoJSON data for the selected layers (sidebar map layers)
  useEffect(() => {
    const loadGeoJsonData = async () => {
      const newGeoJsonData = {};

      const expandedLayers = selectedLayers.flatMap(layer => {
        return layerGroupMap[layer] || [layer]; // Expand the tactile_guidance and other grouped layers
      });

      for (const layer of expandedLayers) {
        if (isWmsLayer(layer)) continue;

        try {
          const res = await fetch(`/data/${layer}.geojson`);
          const data = await res.json();
          newGeoJsonData[layer] = data;
        } catch (err) {
          console.error("Failed to load:", layer, err);
        }
      }

      setGeoJsonData(newGeoJsonData);
    };

    loadGeoJsonData();
  }, [selectedLayers]);
  
  // Fetch accessibility data from the backend 
  const fetchAccessibilityFromBackend = async (lat, lon, time, speed, variableSettings) => {
    try {
      const selected = enabledVariables || [];

      const params = new URLSearchParams({
        lat, lon, time, speed,
        noise: selected.includes("noise") ? variableSettings.noise ?? 1 : 1,
        light: selected.includes("light") ? variableSettings.light ?? 1 : 1,
        trafficLight: selected.includes("trafficLight") ? variableSettings.trafficLight ?? 1 : 1,
        tactile: selected.includes("tactile_pavement") ? variableSettings.tactile_pavement ?? 1 : 1,
        tree: selected.includes("tree") ? variableSettings.tree ?? 1 : 1
      });
      const res = await fetch(`/api/accessibility?${params}`);
      if (!res.ok) throw new Error("API call failed");
      return await res.json();
    } catch (err) {
      console.error("Failed to obtain reachability area:", err);
      return null;
    }
  };  

  // Listen for map click events
  // This component handles the click event on the map to select the starting point
  const MapClickHandler = () => {
    useMapEvents({ 
      click: (e) => {
        if (selectingStart) {
          const [lon, lat] = [e.latlng.lng, e.latlng.lat];
          console.log("Selected starting point：", [lon, lat]);
          setStartPoints(prev => [...prev, [lon, lat]]);
          setSelectingStart(false);
        }
      }
      
    });
    return null;
  };

  // Perform reachability analysis, calculate road features and hulls
  useEffect(() => {
    const performAnalysis = async () => {
      if (startPoints.length === 0) return;
      const [lon, lat] = startPoints[startPoints.length - 1]; // get the last clicked point

      setIsCalculating(true);
      try { 
        const result = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed, layerValues);
        const roadFeatures = result.roads?.features || []; 
        setReachableRoadsData(prev => [...prev, result.roads]);

        const featureCollection = turf.featureCollection(roadFeatures);

        // method 1: buffer: more accurate but very slow (10-20s)
        const combined = turf.combine(featureCollection); 
        const simplified = turf.simplify(combined, { tolerance: 0.002, highQuality: false });
        const outerHull = turf.buffer(simplified, 0.02, { units: "kilometers" });
        //only keep the outer boundary of the hull
        const cleaned = {
          type: "FeatureCollection",
          features: outerHull.features.map(f => {
            if (f.geometry.type === "Polygon") {
              return turf.polygon([f.geometry.coordinates[0]]);
            } else if (f.geometry.type === "MultiPolygon") {
              return turf.multiPolygon(
                f.geometry.coordinates.map(polygon => [polygon[0]])
              );
            }
            return f;
          })
        };

        //method 2: convex hull: faster but simplified convex form (1-2s)
        // const convexHull = turf.convex(featureCollection); 
        // const outerHull = turf.buffer(convexHull, 0.01, { units: "kilometers" });

        // method 3: concave hull: failed (2-3s)
        // const points = [];
        // roadFeatures.forEach((feature) => {
        //   const coords = feature.geometry.coordinates;
        //   if (coords.length >= 2) {
        //     points.push(turf.point(coords[0]));
        //     points.push(turf.point(coords[coords.length - 1]));
        //   }
        // });
        // const pointCollection = turf.featureCollection(points);
        // const concaveHull = turf.concave(pointCollection, { maxEdge: 0.3, units: "kilometers" });
        // const outerHull = turf.buffer(concaveHull, 0.05, { units: "kilometers" });

        // store the metadata for the current analysis
        const resultColor = colorPool[resultMetadata.length % colorPool.length];
        setResultMetadata(prev => [
          ...prev,
          {
            color: resultColor,
            layers: enabledVariables,
            values: { ...layerValues },
            time: walkingTime,
            speed: walkingSpeed
          }
        ]); // choose a color for the current analysis result
 
        setReachableHullData(prev => [...prev, cleaned]);
      } catch (err) {
        console.error("Reachability analysis error：", err);
      } finally {
        setIsCalculating(false);
        setComputeAccessibility(false);
      }
    };
  
    if (computeAccessibility) {
      performAnalysis();
    }
  }, [computeAccessibility]); 

  return (
    <div className="mapBox" style={{ position: "relative" }}>

      {/* Show loading overlay when calculating */}
      {isCalculating && (
        <div className={sty.loadingOverlay}>
          <div className={sty.spinnerContainer}>
            <div className={sty.spinnerCircle}></div>
            <div className={sty.loadingText}>Calculating...</div>
          </div>
        </div>
      )}

      {selectingStart && (
        <div
          className={sty.mouseHint}
          style={{
            top: mousePosition.y,
            left: mousePosition.x
          }}
        >
          📌
        </div>
      )}

      <MapContainer center={[53.5503, 9.9920]} zoom={13} style={{ width: "100%", height: "100vh" }}>
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
        {startPoints.map((pt, i) => (
          <Marker key={`start-${i}`} position={[pt[1], pt[0]]} icon={customMarkerIcon}>
            <Popup>Analysis starting point {i + 1}</Popup>
          </Marker>
        ))} 
 
        {/* Render WMS layers based on selectedLayers */}
        {selectedLayers.map((layer) => {
          const WmsComponent = wmsLayerComponents[layer];
          return WmsComponent ? <WmsComponent key={layer} /> : null;
        })}

        {/* Render Geojson Layers based on selectedLayers*/}
        {Object.entries(geoJsonData).map(([layer, data]) => (
          <GeoJSON
            key={layer}
            data={data}
            pointToLayer={(feature, latlng) => {
              if (useCircleMarker(layer)) {
                return L.circleMarker(latlng, getStyle(layer, feature));
              } else {
                return L.marker(latlng, {
                  icon: L.divIcon({
                    html: "📍",
                    className: "",
                    iconSize: [18, 18]
                  })
                });
              }
            }}
            style={(feature) => {
              // style only works for polygon/line
              return getStyle(layer, feature);
            }}
          />
        ))}

        {/* Legend */}
        <Legend resultMetadata={resultMetadata} />
 
        {/* Render reachable roads and hulls */}
        {reachableRoadsData.map((roads, i) => (
          <GeoJSON
            key={`roads-${i}`}
            data={roads}
            style={{
              color: resultMetadata[i]?.color || '#173F5F',
              weight: 0.5,
              opacity: 0.8
            }}
          />
        ))} 
        {reachableHullData.map((hull, i) => (
          <GeoJSON
            key={`hull-${i}`}
            data={hull}
            style={{
              color: resultMetadata[i]?.color || "#0072bd",
              fillColor: resultMetadata[i]?.color || "#0072bd",
              fillOpacity: 0.1,
              weight: 2,
              opacity: 1
            }}
          />
        ))}
         
      </MapContainer>
    </div>
  );
};

export default MapComponent;
