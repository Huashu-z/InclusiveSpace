import { useState, useEffect, useRef } from "react";
// import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
// import L from "leaflet";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css"; 
import * as turf from "@turf/turf";
import proj4 from "proj4"; 
import Legend from "./Legend";
import sty from './MapComponent.module.css'; 
import {getStyle, useCircleMarker,isWmsLayer, layerGroupMap, wmsLayerComponents} from "./LayerManager"; // Import the style functions 

// Dynamic import for react-leaflet
const MapLib = dynamic(
  () => import("react-leaflet"),
  { ssr: false }
);

//icon for start point, mark the position the user clicked
// const customMarkerIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
//   iconSize: [32, 32],
// });


proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
 
const MapComponent = ({ 
  cityCenter = [53.5503, 9.9920],
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
  clearTrigger,
  onClearHandled,
  layerValues,
  onFocusArea,
  highlightedIndex,
  setHighlightedIndex,
}) => {
  const [MapModule, setMapModule] = useState(null);
  const [customMarkerIcon, setCustomMarkerIcon] = useState(null);
  const [reachableRoadsData, setReachableRoadsData] = useState([]); 
  const [reachableHullData, setReachableHullData] = useState([]); 
  const [geoJsonData, setGeoJsonData] = useState({}); 
  const [isCalculating, setIsCalculating] = useState(false); // function attachment calculation works? 
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); 
  const [resultMetadata, setResultMetadata] = useState([]); // store metadata for each result/ user setting each time
  const [defaultResultCache, setDefaultResultCache] = useState({}); // key: `${lat},${lon}`, value: {roads, hull, area}
  const [defaultGroupIndex, setDefaultGroupIndex] = useState(1);  // default group index for the first result
  const [groupMapping, setGroupMapping] = useState({}); // mapping of group index to default results,index for weighted results

  // check if the generated reachability area is valid GeoJSON
  const isValidGeoJSON = (geojson) =>
    geojson &&
    geojson.type === "FeatureCollection" &&
    Array.isArray(geojson.features) &&
    geojson.features.length > 0;

  const colorPool = [
    "#394Ba0", "#D54799", "#009F75", "#FAA31B"
  ]; // color pool for different calculation results/ accessibility analysis

  // Load Leaflet and React-Leaflet dynamically to avoid SSR issues
  useEffect(() => {
    async function loadLibs() {
      const leaflet = await import("leaflet");
      setCustomMarkerIcon(
        new leaflet.Icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
          iconSize: [32, 32]
        })
      );

      const rleaflet = await import("react-leaflet");
      setMapModule(rleaflet);
    }
    loadLibs();
  }, []);

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
      // setReachableRoadsData([]);
      // setReachableHullData([]);
      // setResultMetadata([]);
      onResetHandled && onResetHandled();
      // setDefaultResultCache({});
      // setGroupMapping({});
      // setDefaultGroupIndex(1);
    }
  }, [resetTrigger, onResetHandled]);  

  // clean "get catchment area" result
  useEffect(() => {
    if (clearTrigger) {
      setReachableRoadsData([]);
      setReachableHullData([]);
      setResultMetadata([]);
      setDefaultGroupIndex([]);
      setDefaultResultCache([]);
      setGroupMapping([]);
      onClearHandled?.();
    }
  }, [clearTrigger, onClearHandled]);

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
        tree: selected.includes("tree") ? variableSettings.tree ?? 1 : 1,
        temperatureSummer: selected.includes("temperatureSummer") ? variableSettings.temperatureSummer ?? 1 : 1,
        temperatureWinter: selected.includes("temperatureWinter") ? variableSettings.temperatureWinter ?? 1 : 1,
        blueinf: selected.includes("blueinf") ? variableSettings.blueinf ?? 1 : 1,
        greeninf: selected.includes("greeninf") ? variableSettings.greeninf ?? 1 : 1,
        station: selected.includes("station") ? variableSettings.station ?? 1 : 1,
        wcDisabled: selected.includes("wcDisabled") ? variableSettings.wcDisabled ?? 1 : 1,
        narrowRoads: selected.includes("narrowRoads") ? variableSettings.narrowRoads ?? 1 : 1,
        stair: selected.includes("stair") ? variableSettings.stair ?? 1 : 1,
        obstacle: selected.includes("obstacle") ? variableSettings.obstacle ?? 1 : 1,
        slope: selected.includes("slope") ? variableSettings.slope ?? 1 : 1,
        unevenSurface: selected.includes("unevenSurface") ? variableSettings.unevenSurface ?? 1 : 1,
        poorPavement: selected.includes("poorPavement") ? variableSettings.poorPavement ?? 1 : 1,
        kerbsHigh: selected.includes("kerbsHigh") ? variableSettings.kerbsHigh ?? 1 : 1,
        facility: selected.includes("facility") ? variableSettings.facility ?? 1 : 1,
        pedestrianFlow: selected.includes("pedestrianFlow") ? variableSettings.pedestrianFlow ?? 1 : 1
      });
      params.append("n", Math.max(1, selected.length));
      const res = await fetch(`/api/accessibility?${params}`);
      if (!res.ok) throw new Error("API call failed");
      return await res.json();
    } catch (err) {
      console.error("Failed to obtain reachability area:", err);
      return null;
    }
  };  

  // load poi data
  // useEffect(() => {
  //   const loadFacilities = async () => {
  //     try {
  //       const res = await fetch("/data/hh_facilities.geojson");
  //       const data = await res.json();
  //       setGeoJsonData(prev => ({
  //         ...prev,
  //         hh_facilities: data
  //       }));
  //     } catch (err) {
  //       console.error("Failed to load hh_facilities.geojson:", err);
  //     }
  //   };

  //   loadFacilities();
  // }, []); 
  // console.log("POI features loaded:", geoJsonData["hh_facilities"]?.features?.length);
  useEffect(() => {
    const loadPOIGeoJsons = async () => {
      const poiLayers = [
        "poi_hh_gastronomy",
        "poi_hh_haltstelle",
        "poi_hh_health",
        "poi_hh_kita_schule",
        "poi_hh_park_spiel",
        "poi_hh_supermarket",
        "poi_hh_uni_fh"
      ];
      const newData = {};
      for (const layer of poiLayers) {
        try {
          const res = await fetch(`/data/POI/${layer}.geojson`);
          const data = await res.json();
          newData[layer] = data;
        } catch (err) {
          console.error("Failed to load:", layer, err);
        }
      }
      setGeoJsonData(prev => ({
        ...prev,
        ...newData
      }));
    };
    loadPOIGeoJsons();
  }, []);

  // Perform reachability analysis, calculate road features and hulls
  useEffect(() => {
    const performAnalysis = async () => {
      if (startPoints.length === 0) return;
      const [lon, lat] = startPoints[startPoints.length - 1]; // latest point
      const key = `${lat},${lon},${walkingTime},${walkingSpeed}`; //store basic parameters for default catchment area
      setIsCalculating(true);

      try {
        let defaultArea;
        let currentGroupIndex;

        // --------- Step 1: Default Reslut (only speed/time/start) ---------
        if (!defaultResultCache[key]) {
          const newGroupIndex = Object.keys(groupMapping).length + 1;
          setGroupMapping(prev => ({ ...prev, [key]: newGroupIndex }));
          setDefaultGroupIndex(newGroupIndex);
          currentGroupIndex = newGroupIndex;

          const defaultVars = {
            noise: 1, light: 1, trafficLight: 1,
            tactile_pavement: 1, tree: 1,
            temperatureSummer: 1, temperatureWinter: 1
          };

          const defaultRes = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed, defaultVars);
          
          if (!isValidGeoJSON(defaultRes.roads)) {
            alert("No reachable area found for this walking time/speed. Please try another setting.");
            setComputeAccessibility(false);
            setIsCalculating(false);
            return;
          }
          const defaultRoads = defaultRes.roads.features;
          const fc = turf.featureCollection(defaultRoads);

          const combined = turf.combine(fc);
          const simplified = turf.simplify(combined, { tolerance: 0.002, highQuality: false });
          const buffered = turf.buffer(simplified, 0.02, { units: "kilometers" });
          const cleaned = {
            type: "FeatureCollection",
            features: buffered.features.map(f => {
              if (f.geometry.type === "Polygon") {
                return turf.polygon([f.geometry.coordinates[0]]);
              } else if (f.geometry.type === "MultiPolygon") {
                return turf.multiPolygon(f.geometry.coordinates.map(p => [p[0]]));
              }
              return f;
            })
          };

          let area = 0;
          cleaned.features.forEach(f => {
            area += turf.area(f);
          });
          defaultArea = area / 10000;

          setDefaultResultCache(prev => ({ ...prev, [key]: { roads: defaultRes.roads, hull: cleaned, area: defaultArea } }));
          setReachableRoadsData(prev => [...prev, defaultRes.roads]);
          setReachableHullData(prev => [...prev, cleaned]);

          // calculate the number of POI in the default hull
          // let poiCount = 0;
          // let poiCategoryCount = {};
          // const poiLayer = geoJsonData["hh_facilities"];
          // if (poiLayer && cleaned && cleaned.features.length > 0) {
          //   const filteredPOI = poiLayer.features.filter(f => f.geometry.type === "Point");
          //   const inAreaPOI = filteredPOI.filter(f =>
          //     cleaned.features.some(area => turf.booleanPointInPolygon(f, area))
          //   );
          //   poiCount = inAreaPOI.length;
          //   poiCategoryCount = inAreaPOI.reduce((acc, f) => {
          //     const category = f.properties.layer || f.properties.category || "Unknown";
          //     acc[category] = (acc[category] || 0) + 1;
          //     return acc;
          //   }, {});
          // }
          const poiLayers = [
            "poi_hh_gastronomy",
            "poi_hh_haltstelle",
            "poi_hh_health",
            "poi_hh_kita_schule",
            "poi_hh_park_spiel",
            "poi_hh_supermarket",
            "poi_hh_uni_fh"
          ];
          let poiGroupCounts = {};
          let totalPOI = 0;
          for (const layerName of poiLayers) {
            const poiData = geoJsonData[layerName];
            if (!poiData || !cleaned.features.length) continue;
            const filteredPOI = poiData.features.filter(f => f.geometry.type === "Point");
            const inArea = filteredPOI.filter(f =>
              cleaned.features.some(polygon => turf.booleanPointInPolygon(f, polygon))
            );
            poiGroupCounts[layerName] = inArea.length;
            totalPOI += inArea.length;
          }

          setResultMetadata(prev => [
            ...prev,
            {
              color: "#676767ff", // default color for the first result
              layers: [],
              values: {},
              time: walkingTime,
              speed: walkingSpeed,
              area: defaultArea.toFixed(2),
              poiCount: totalPOI,
              poiGroupCounts,
              isDefault: true,
              groupIndex: newGroupIndex
            }
          ]);
        } else {
          currentGroupIndex = groupMapping[key];
          setDefaultGroupIndex(currentGroupIndex);
          defaultArea = defaultResultCache[key].area;
        }

        // --------- Step 2: Weighted Result (with comfort features) ---------
        if (enabledVariables.length > 0) {
          const weightedRes = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed, layerValues);
          if (!isValidGeoJSON(weightedRes.roads)) {
            alert("The selected comfort settings result in no reachable area. Try adjusting the sliders.");
            return;
          }
          const weightedRoads = weightedRes.roads.features;

          const fc2 = turf.featureCollection(weightedRoads);
          const combined2 = turf.combine(fc2);
          const simplified2 = turf.simplify(combined2, { tolerance: 0.002, highQuality: false });
          const buffered2 = turf.buffer(simplified2, 0.02, { units: "kilometers" });
          const cleaned2 = {
            type: "FeatureCollection",
            features: buffered2.features.map(f => {
              if (f.geometry.type === "Polygon") {
                return turf.polygon([f.geometry.coordinates[0]]);
              } else if (f.geometry.type === "MultiPolygon") {
                return turf.multiPolygon(f.geometry.coordinates.map(p => [p[0]]));
              }
              return f;
            })
          };

          let weightedArea = 0;
          cleaned2.features.forEach(f => {
            weightedArea += turf.area(f);
          });
          weightedArea = weightedArea / 10000;

          const ratio = (weightedArea / defaultArea).toFixed(2);
          const color = colorPool[resultMetadata.length % colorPool.length];

          setReachableRoadsData(prev => [...prev, weightedRes.roads]);
          setReachableHullData(prev => [...prev, cleaned2]);

          // calculate the number of POI in the weighted hull
          // let poiCount = 0;
          // let poiCategoryCount = {};
          // const poiLayer = geoJsonData["hh_facilities"];
          // if (poiLayer && cleaned2 && cleaned2.features.length > 0) {
          //   const filteredPOI = poiLayer.features.filter(f => f.geometry.type === "Point");
          //   const inAreaPOI = filteredPOI.filter(f =>
          //     cleaned2.features.some(area => turf.booleanPointInPolygon(f, area))
          //   );
          //   poiCount = inAreaPOI.length;

          //   poiCategoryCount = inAreaPOI.reduce((acc, f) => {
          //     const category = f.properties.layer || f.properties.category || "Unknown";
          //     acc[category] = (acc[category] || 0) + 1;
          //     return acc;
          //   }, {});
          // }
          const poiLayers = [
            "poi_hh_gastronomy",
            "poi_hh_haltstelle",
            "poi_hh_health",
            "poi_hh_kita_schule",
            "poi_hh_park_spiel",
            "poi_hh_supermarket",
            "poi_hh_uni_fh"
          ];

          let poiGroupCounts = {};
          let totalPOI = 0;

          for (const layerName of poiLayers) {
            const poiData = geoJsonData[layerName];
            if (!poiData || !cleaned2.features.length) continue;

            const filteredPOI = poiData.features.filter(f => f.geometry.type === "Point");
            const inArea = filteredPOI.filter(f =>
              cleaned2.features.some(polygon => turf.booleanPointInPolygon(f, polygon))
            );

            poiGroupCounts[layerName] = inArea.length;
            totalPOI += inArea.length;
          }

          setResultMetadata(prev => [
            ...prev,
            {
              color,
              layers: enabledVariables,
              values: { ...layerValues },
              time: walkingTime,
              speed: walkingSpeed,
              area: weightedArea.toFixed(2),
              weightedRatio: ratio,
              poiCount: totalPOI,
              poiGroupCounts,
              isDefault: false,
              groupIndex: currentGroupIndex,
              subIndex: prev.filter(p => p.groupIndex === currentGroupIndex && !p.isDefault).length + 1
            }
          ]);
        }

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

  // handle legend click to focus on a specific area
  const handleFocusArea = (idx) => {
    if (!reachableHullData[idx]) return;
    const L = require("leaflet");
    const map = document.querySelector(".leaflet-container")?._leaflet_map;
    if (!map) return;
    map.fitBounds(L.geoJSON(reachableHullData[idx]).getBounds(), { padding: [40, 40] });
    setHighlightedIndex(idx);   
    console.log("setHighlightedIndex to", idx);
  };

  if (!MapModule || !MapModule.MapContainer) return null;
  const { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, Pane } = MapModule;

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

      <MapContainer center={cityCenter} zoom={13} style={{ width: "100%", height: "100vh" }}>
        <Pane name="highlight-pane" style={{ zIndex: 650 }} />
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
        {/*{startPoints.map((pt, i) => (
          <Marker key={`start-${i}`} position={[pt[1], pt[0]]} icon={customMarkerIcon}>
            <Popup>Analysis starting point {i + 1}</Popup>
          </Marker>
        ))} */}
        {startPoints.map((pt, i) => (
          customMarkerIcon ? (
            <Marker key={`start-${i}`} position={[pt[1], pt[0]]} icon={customMarkerIcon}>
              <Popup>Analysis starting point {i + 1}</Popup>
            </Marker>
          ) : null
        ))}
 
        {/* Render WMS layers based on selectedLayers */}
        {selectedLayers.map((layer) => {
          const WmsComponent = wmsLayerComponents[layer];
          return WmsComponent ? <WmsComponent key={layer} /> : null;
        })}

        {/* Render Geojson Layers based on selectedLayers*/}
        {Object.entries(geoJsonData).map(([layer, data]) => (
          layer.startsWith("poi_") && !selectedLayers.includes(layer) ? null : (
            <GeoJSON
              key={layer}
              data={data}
              pointToLayer={(feature, latlng) => {
                const L = require("leaflet");
                return L.circleMarker(latlng, getStyle(layer, feature));
              }}
              style={(feature) => getStyle(layer, feature)}
            />
          )
        ))}

        {/* Legend */}
        <Legend 
          resultMetadata={resultMetadata} 
          onFocusArea={handleFocusArea}
        />
 
        {/* Render reachable roads and hulls */}
        {reachableRoadsData.map((roads, i) =>
          isValidGeoJSON(roads) ? (
            <GeoJSON
              key={`roads-${i}`}
              data={roads}
              style={{
                color: resultMetadata[i]?.color || '#173F5F',
                weight: 0.5,
                opacity: 0.8
              }}
            />
          ) : null
        )}
        {reachableHullData.map((hull, i) =>
          isValidGeoJSON(hull) ? (
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
          ) : null
        )}
        {highlightedIndex !== null && reachableHullData[highlightedIndex] && (
          <GeoJSON
            key={`highlighted-${highlightedIndex}`}
            data={reachableHullData[highlightedIndex]}
            style={{
              color: "#e63946",
              fillColor: "#e63946",
              weight: 3,
              dashArray: "5",
              fillOpacity: 0.7,
              opacity: 1
            }}
            pane="highlight-pane"
          />
        )}
        
         
      </MapContainer>
    </div>
  );
};

export default MapComponent;
