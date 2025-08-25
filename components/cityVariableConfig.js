// define which city has which discomfort features and map layers
export const cityLayerConfig = {
  hamburg: {
    discomfortFeatures: [
      "noise", "light", "tree", "trafficLight", "tactile_pavement",
      "temperatureSummer", "temperatureWinter", "greeninf", "blueinf",
      "station", "wcDisabled", "narrowRoads", "ramp", "stair",
      "obstacle", "slope", "unevenSurface", "poorPavement", "kerbsHigh",
      "facility", "pedestrianFlow"
    ],
    mapLayers: [
      "noise_wms", "temp_summer", "temp_winter", "streetlight",
      "trafic_light_wms", "tactile_guidance", "tree_wms",
      "green_infrastructure", "blue_infrastructure",
      "transport_station_wms", "wc_disabled", "sidewalk_narrow",
      "stair", "obstacle", "slope",
      "uneven_surfaces", "poor_pavement", "kerbs_high",
      "facility_wms", "pedestrian_flow_wms"
    ]
  },
  penteli: {
    discomfortFeatures: [
      "trafficLight", "greeninf", "station", "stair", "facility", "pedestrianFlow"
    ],
    mapLayers: [
      "trafic_light_wms", "green_infrastructure", "transport_station_wms", "stair", "facilities", "pedestrian_flow_wms"
    ]
  }
  // 其他城市...
};
