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
      // Clear various local results
      // setIsochroneData(null);
      setReachableRoadsData(null);
      setReachableHullData(null);
 
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
  //     setRoadNetwork(null); 
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
    console.log("MapComponent received selectedLayers:", selectedLayers);
  }, [selectedLayers]);

  useEffect(() => {
    const loadGeoJsonData = async () => {
      const newGeoJsonData = {};
      
      for (const keyword of selectedLayers) {
        
        const matchedFiles = availableFiles.filter(file => file.includes(keyword));
        
        for (const file of matchedFiles) {
          try {
            const response = await fetch(`/data/${file}`);
            if (!response.ok) throw new Error(`failed: ${file}`);
            const data = await response.json();
            newGeoJsonData[file] = data;
          } catch (error) {
            console.error("Failed to load GeoJSON:", error);
          }
        }
      }
      
      setGeoJsonData(newGeoJsonData);
    };
    
    if (availableFiles.length > 0) {
      loadGeoJsonData();
    }
  }, [selectedLayers, availableFiles]); 
 
  const fetchAccessibilityFromBackend = async (lat, lon, time, speed, variableSettings) => {
    try {
      //variables related to speed
      const noise = variableSettings.noise ?? 1;
      const light = variableSettings.light ?? 1;
      const tactile = variableSettings.tactile_pavement ?? 1;
      const crossing = variableSettings.crossing ?? 1;
      const tree = variableSettings.tree ?? 1;

      // Constructing the query string
      const queryParams = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        time: time.toString(),
        speed: speed.toString(),
        noise: noise.toString(),
        light: light.toString(),
        tactile: tactile.toString(),
        crossing: crossing.toString(),
        tree: tree.toString()
      });

      // Making a request
      const res = await fetch(`/api/accessibility?${queryParams.toString()}`); 
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
      click: (e) => {
        if (selectingStart) {
          const [lon, lat] = [e.latlng.lng, e.latlng.lat];
          console.log("Selected starting point：", [lon, lat]);
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
        alert("Please select a starting point first");
        return;
      }
      setIsCalculating(true);
      try {
        const [lon, lat] = startPoint;
        const result = await fetchAccessibilityFromBackend(lat, lon, walkingTime, walkingSpeed, 
          {
            noise: layerValues.noise ?? 1.0,
            light: layerValues.light ?? 1.0,
            tactile_pavement: layerValues.tactile_pavement ?? 1.0,
            crossing: layerValues.crossing ?? 1.0,
            tree: layerValues.tree ?? 1.0
          }
        );
        const roadFeatures = result.roads?.features || [];
        console.log("Number of reachable paths：", roadFeatures.length);
        setReachableRoadsData(result.roads);

        const featureCollection = turf.featureCollection(roadFeatures);

        // method 1: buffer: more accurate but very slow (10-20s)
        // const combined = turf.combine(featureCollection); 
        // const simplified = turf.simplify(combined, { tolerance: 0.002, highQuality: false });
        // const outerHull = turf.buffer(simplified, 0.1, { units: "kilometers" }); 

        //method 2: convex hull: faster but simplified convex form (1-2s)
        // const convexHull = turf.convex(featureCollection); 
        // const outerHull = turf.buffer(convexHull, 0.01, { units: "kilometers" });

        // method 3: concave hull: failed (2-3s)
        const points = [];
        roadFeatures.forEach((feature) => {
          const coords = feature.geometry.coordinates;
          if (coords.length >= 2) {
            points.push(turf.point(coords[0]));
            points.push(turf.point(coords[coords.length - 1]));
          }
        });

        const pointCollection = turf.featureCollection(points);
        const concaveHull = turf.concave(pointCollection, { maxEdge: 0.3, units: "kilometers" });
        const outerHull = turf.buffer(concaveHull, 0.05, { units: "kilometers" });

        setReachableHullData(outerHull);
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
    // Find the corresponding variable color
    const layerName = Object.keys(layerColors).find(layer => fileName.includes(layer));
    const color = layerName ? layerColors[layerName] : "#000000"; 
    return {
      color: color,
      weight: 2,  
      fillOpacity: 0  
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

        {/* Legend */}
        <Legend
          walkingTime={walkingTime}
          walkingSpeed={walkingSpeed}
          selectedLayers={selectedLayers}
          layerValues={layerValues}
        />

        {isCalculating && (
          <div style={{ color: "red", fontWeight: "bold", marginTop: "10px" }}>
            Calculating, please wait...
          </div>
        )}

        {reachableRoadsData && (
          <GeoJSON
            data={reachableRoadsData}
            style={{ color: '#0072bd', weight: 0.6 }}
          />
        )}

        {reachableHullData && (
          <GeoJSON
            data={reachableHullData}
            style={{ color: "black", weight: 0.2, fillOpacity: 0.2 }}
          />
        )} 
         
      </MapContainer>
    </div>
  );
};

export default MapComponent;
