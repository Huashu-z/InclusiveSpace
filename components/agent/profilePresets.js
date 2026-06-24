import { cityLayerConfig } from "../cityVariableConfig.js";

export const PROFILE_PRESETS = {
  elderly: {
    id: "elderly",
    label: "Elderly person",
    labelKey: "profile_elderly",
    icon: "/images/profile_elderly.png",
    walkingSpeed: 3.0,
    walkingTime: 15,
    enabledVariables: [
      "stair",
      "slope",
      "unevenSurface",
      "poorPavement",
      "kerbsHigh",
      "obstacle",
      "trafficLight",
      "station",
      "wcDisabled",
      "light",
    ],
    layerValues: {
      stair: 0.5,
      slope: 0.5,
      unevenSurface: 0.5,
      poorPavement: 0.5,
      kerbsHigh: 0.5,
      obstacle: 0.5,
      trafficLight: 0.7,
      station: 0.9,
      wcDisabled: 0.9,
      light: 0.8,
    },
  },

  wheelchair_user: {
    id: "wheelchair_user",
    aliases: ["wheelchair"],
    label: "Wheelchair user",
    labelKey: "profile_wheelchair",
    icon: "/images/profile_wheelchair.png",
    walkingSpeed: 3.0,
    walkingTime: 15,
    enabledVariables: [
      "stair",
      "kerbsHigh",
      "slope",
      "narrowRoads",
      "poorPavement",
      "unevenSurface",
      "obstacle",
      "wcDisabled",
      "trafficLight",
    ],
    layerValues: {
      stair: 0.1,
      kerbsHigh: 0.2,
      slope: 0.3,
      narrowRoads: 0.3,
      poorPavement: 0.3,
      unevenSurface: 0.3,
      obstacle: 0.3,
      wcDisabled: 0.9,
      trafficLight: 0.7,
    },
  },

  visually_impaired: {
    id: "visually_impaired",
    aliases: ["visual_impairment"],
    label: "Visually impaired pedestrian",
    labelKey: "profile_visual_impairment",
    icon: "/images/profile_blind.png",
    walkingSpeed: 4.0,
    walkingTime: 15,
    enabledVariables: [
      "tactile_pavement",
      "light",
      "trafficLight",
      "obstacle",
      "pedestrianFlow",
    ],
    layerValues: {
      tactile_pavement: 0.9,
      light: 0.8,
      trafficLight: 0.8,
      obstacle: 0.4,
      pedestrianFlow: 0.5,
    },
  },

  children_family: {
    id: "children_family",
    aliases: ["stroller", "pushchair", "pram", "buggy", "trolley", "cart", "luggage", "suitcase"],
    label: "Children, families, and stroller users",
    labelKey: "profile_stroller",
    icon: "/images/profile_stroller.png",
    walkingSpeed: 3.5,
    walkingTime: 15,
    enabledVariables: [
      "narrowRoads",
      "kerbsHigh",
      "stair",
      "obstacle",
      "poorPavement",
      "unevenSurface",
      "trafficLight",
      "facility",
      "greeninf",
      "light",
    ],
    layerValues: {
      narrowRoads: 0.4,
      kerbsHigh: 0.4,
      stair: 0.4,
      obstacle: 0.5,
      poorPavement: 0.5,
      unevenSurface: 0.5,
      trafficLight: 0.8,
      facility: 0.8,
      greeninf: 0.8,
      light: 0.7,
    },
  },

  default_adult: {
    id: "default_adult",
    label: "Default adult pedestrian",
    labelKey: "profile_default_adult",
    icon: "/images/profile.png",
    walkingSpeed: 5.0,
    walkingTime: 15,
    enabledVariables: [
      "light",
      "trafficLight",
      "station",
      "facility",
      "greeninf",
      "noise",
    ],
    layerValues: {
      light: 0.7,
      trafficLight: 0.7,
      station: 0.8,
      facility: 0.7,
      greeninf: 0.7,
      noise: 0.5,
    },
  },
};

const legacyProfileOrder = [
  "elderly",
  "children_family",
  "wheelchair_user",
  "visually_impaired",
];

export function getProfilePreset(profileId) {
  if (!profileId) return null;
  if (PROFILE_PRESETS[profileId]) return PROFILE_PRESETS[profileId];
  return Object.values(PROFILE_PRESETS).find((preset) => preset.aliases?.includes(profileId)) || null;
}

export function getProfilePresetList({ includeDefault = false } = {}) {
  const ids = includeDefault ? [...legacyProfileOrder, "default_adult"] : legacyProfileOrder;
  return ids.map((id) => PROFILE_PRESETS[id]).filter(Boolean);
}

export function getAllSupportedVariables() {
  return new Set(Object.values(cityLayerConfig).flatMap((city) => city.discomfortFeatures || []));
}

export function validateProfilePresets() {
  const supportedVariables = getAllSupportedVariables();
  const errors = [];

  for (const preset of Object.values(PROFILE_PRESETS)) {
    const valueKeys = Object.keys(preset.layerValues || {});
    const enabledSet = new Set(preset.enabledVariables || []);

    for (const variable of preset.enabledVariables || []) {
      if (!supportedVariables.has(variable)) {
        errors.push(`${preset.id} enables unsupported CAT variable "${variable}"`);
      }
    }

    for (const variable of valueKeys) {
      if (!enabledSet.has(variable)) {
        errors.push(`${preset.id} has layerValues.${variable} but does not enable it`);
      }
      if (!supportedVariables.has(variable)) {
        errors.push(`${preset.id} assigns unsupported CAT variable "${variable}"`);
      }
    }

    if (!Number.isFinite(Number(preset.walkingSpeed)) || preset.walkingSpeed <= 0) {
      errors.push(`${preset.id} has invalid walkingSpeed`);
    }

    if (!Number.isFinite(Number(preset.walkingTime)) || preset.walkingTime <= 0) {
      errors.push(`${preset.id} has invalid walkingTime`);
    }
  }

  return errors;
}
