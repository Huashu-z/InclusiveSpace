// /layers/layerManager.js
let L;
if (typeof window !== "undefined") {
  L = require("leaflet");
}
// import { useMap } from "react-leaflet";
let useMap;
if (typeof window !== "undefined") {
  useMap = require("react-leaflet").useMap;
}
import { useEffect } from "react";

// layer grounp for tactile guidance
export const layerGroupMap = {
  hh_tactile_guidance: ["hh_tactile_points", "hh_tactile_lines", "hh_tactile_polygons"]
};

// seperate wms layers and geojson layers
export const isWmsLayer = (layer) =>
  [
    "hh_noise_wms",
    "hh_tree_wms",
    "hh_trafic_light_wms",
    "hh_blue_infrastructure",
    "hh_green_infrastructure",
    "hh_transport_station_wms", 
    "hh_facility_wms",
    "hh_pedestrian_flow_wms"
  ].includes(layer);

// use circleMarker render point layers
export const useCircleMarker = (layer) =>
  ["hh_tactile_points"].includes(layer);
 
export function getStyle(layer, feature) { 

  switch (layer) { 
    case "hh_streetlight":
      return {
        radius: 5,
        fillColor: "#ffd166",
        fillOpacity: 0.8,
        stroke: false
      };
    
    case "hh_tactile_points":
      return {
        radius: 5,
        fillColor: "#be609a",
        fillOpacity: 0.8,
        stroke: false     
      };

    case "hh_tactile_lines":
      return {
        color: "#be609a", 
        weight: 2,
        opacity: 0.9
      };

    case "hh_tactile_polygons":
      return {
        color: "#be609a",      
        fillColor: "#be609a",   
        fillOpacity: 0.6,
        weight: 1,
        opacity: 0.6
      };
    
    case "hh_wc_disabled":
      return {
        radius: 5,
        fillColor: "#e4a28b",
        fillOpacity: 0.8,
        stroke: false     
      };

    case "hh_sidewalk_narrow":
      return {
        color: "#992842", 
        weight: 2,
        opacity: 0.9
      };
    
    case "hh_stair":
      return {
        color: "#91744a", 
        weight: 2,
        opacity: 0.9
      };
    
    case "hh_obstacle":
      return {
        radius: 5,
        fillColor: "#d65a90",
        fillOpacity: 0.8,
        stroke: false     
      };

    case "hh_slope":
      return {
        color: "#6c8be0", 
        weight: 2,
        opacity: 0.9
      };

    case "hh_uneven_surfaces":
      return {
        color: "#b30000", 
        weight: 2,
        opacity: 0.9
      };

    case "hh_poor_pavement":
      return {
        color: "#a5ab59", 
        weight: 2,
        opacity: 0.9
      };

    case "hh_kerbs_high":
      return {
        radius: 5,
        fillColor: "#d65a90",
        fillOpacity: 0.8,
        stroke: false     
      };

    case "hh_temp_summer":{
      const breaks = [ 
        { max: 11,  color: "#ffaaaa" },
        { max: 17,  color: "#ff5555" },
        { max: 100,  color: "#ff0000" },
      ];

      const val = parseFloat(feature?.properties?.comfort);
      const match = breaks.find(b => val < b.max) || breaks[breaks.length - 1];

      return {
        color: "#000",
        weight: 0.1,
        fillColor: match.color,
        fillOpacity: 0.6
      };
    }

    case "hh_temp_winter": {
      const breaks = [
        { max: -7,  color: "#afd1e7" },
        { max: -4.5,  color: "#3e8ec4" },
        { max: 0,  color: "#08306b" }, 
      ];

      const val = parseFloat(feature?.properties?.comfort);
      const match = breaks.find(b => val < b.max) || breaks[breaks.length - 1];

      return {
        color: "#000",
        weight: 0.1,
        fillColor: match.color,
        fillOpacity: 0.6
      };
    }

      return {
        color: "#000", 
        weight: 0.1,
        fillColor: fillColorWinter,
        fillOpacity: 0.5
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

export function FacilityWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/wms_bildung_kultur_eimsbuettel", {
      layers: "bildung_kultur_eimsbuettel",
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

export function PedestrianFlowWMSLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = L.tileLayer.wms("https://geodienste.hamburg.de/wms_bedeutungsraeume_fussverkehr", {
      layers: "bedeutungsraeume_heatmap",
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
  hh_noise_wms: NoiseWMSLayer,
  hh_tree_wms: TreeWMSLayer,
  hh_trafic_light_wms: TraficLightWMSLayer,
  hh_blue_infrastructure: BlueInfWMSLayer,
  hh_green_infrastructure: GreenInfWMSLayer,
  hh_transport_station_wms: StationWMSLayer,
  hh_facility_wms: FacilityWMSLayer,
  hh_pedestrian_flow_wms: PedestrianFlowWMSLayer
};

