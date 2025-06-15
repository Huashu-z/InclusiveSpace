// /layers/layerManager.js
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useEffect } from "react";

// layer grounp for tactile guidance
export const layerGroupMap = {
  tactile_guidance: ["tactile_points", "tactile_lines", "tactile_polygons"]
};

// seperate wms layers and geojson layers
export const isWmsLayer = (layer) =>
  [
    "noise_wms",
    "tree_wms",
    "trafic_light_wms",
    "blue_infrastructure",
    "green_infrastructure",
    "transport_station_wms",
    "wc_wms"
  ].includes(layer);

// use circleMarker render point layers
export const useCircleMarker = (layer) =>
  ["tactile_points"].includes(layer);

// noise style map (multiple polygons)
export function getStyle(layer, feature) {
  const noiseStyleMap = {
    "> 55 - 60 dB(A)": "#1a9850",
    "> 60 - 65 dB(A)": "#91cf60",
    "> 65 - 70 dB(A)": "#d9ef8b",
    "> 70 - 75 dB(A)": "#a6bddb",
    "> 75 dB(A)": "#810f7c"
  };

  switch (layer) {
    case "noise":
      const klasse = feature?.properties?.klasse?.toString() ?? "> 55 - 60 dB(A)";
      return {
        color: "#000",
        weight: 1,
        fillColor: noiseStyleMap[klasse] || "#ccc",
        fillOpacity: 0.6
      }; 
    case "streetlight":
      return {
        radius: 5,
        fillColor: "#ffd166",
        fillOpacity: 0.8,
        stroke: false
      };
    
    case "tactile_points":
      return {
        radius: 5,
        fillColor: "#be609a",
        fillOpacity: 0.8,
        stroke: false     
      };

    case "tactile_lines":
      return {
        color: "#be609a", 
        weight: 2,
        opacity: 0.9
      };

    case "tactile_polygons":
      return {
        color: "#be609a",      
        fillColor: "#be609a",   
        fillOpacity: 0.6,
        weight: 1,
        opacity: 0.6
      };

    default:
      return {
        color: "#555",
        weight: 1,
        fillOpacity: 0.6
      };
  }
}

// import WMS layers from Geoportal Hamburg
export function NoiseWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/HH_WMS_Strassenverkehr", {
      layers: "strassenverkehr_tag_abend_nacht_2022",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function TreeWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/HH_WMS_Pflanzstandorte", {
      layers: "baumpflanzung",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function TraficLightWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/HH_WMS_Lichtsignalanlagen", {
      layers: "lichtsignalanlagen",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function BlueInfWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/HH_WMS_Geotourismus", {
      layers: "wasseruwasserbau",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function GreenInfWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/HH_WMS_Gruenplan", {
      layers: "gruenplan",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function StationWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/MRH_WMS_Erreichbarkeitsanalysen_Ziele_Einrichtungen", {
      layers: "mrh_haltestellen",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export function WCWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/wms_wc_mit_trinkbrunnen", {
      layers: "wc_mit_trinkbrunnen",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      attribution: "© Geoportal Hamburg"
    });
    layer.addTo(map);
    return () => map.removeLayer(layer);
  }, [map]);
  return null;
}

export const wmsLayerComponents = {
  noise_wms: NoiseWMSLayer,
  tree_wms: TreeWMSLayer,
  trafic_light_wms: TraficLightWMSLayer,
  blue_infrastructure: BlueInfWMSLayer,
  green_infrastructure: GreenInfWMSLayer,
  transport_station_wms: StationWMSLayer,
  wc_wms: WCWMSLayer
};

