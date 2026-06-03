import { cityLayerConfig } from "../components/cityVariableConfig.js";
import { getProfilePresetList } from "../components/agent/profilePresets.js";
import { AGENT_INTENTS } from "./agentIntent.js";
import { getSupportedVariables } from "./cityVariableFiltering.js";

export const SAFE_ACTION_TYPES = new Set([
  "RUN_ACCESSIBILITY_ANALYSIS",
  "ANSWER_ONLY",
  "ASK_USER_TO_SELECT_POINT",
]);

export const SAFE_CITIES = new Set(Object.keys(cityLayerConfig));
export const SAFE_INTENTS = new Set(AGENT_INTENTS);
export const SAFE_PROFILES = new Set(getProfilePresetList().map((profile) => profile.id));

const blockedTextPatterns = [
  { pattern: /\b(select|insert|update|delete|drop|alter|create|grant|revoke)\b[\s\S]{0,80}\b(from|table|database|schema|user|password)\b/i, reason: "raw SQL or database operation" },
  { pattern: /\b(api[_-]?key|secret|password|token|database_url|postgresql:\/\/|postgres:\/\/)\b/i, reason: "secret or credential-like content" },
  { pattern: /\bFeatureCollection\b/i, reason: "raw GeoJSON content" },
  { pattern: /"coordinates"\s*:/i, reason: "raw geometry coordinates" },
];

export function validateIntent(intent) {
  return SAFE_INTENTS.has(intent) ? [] : [`invalid intent: ${intent}`];
}

export function validateAgentAction(action) {
  const errors = [];
  if (!SAFE_ACTION_TYPES.has(action?.type)) errors.push("invalid action type");
  if (action?.city && !SAFE_CITIES.has(action.city)) errors.push("invalid city");
  if (action?.profile && !SAFE_PROFILES.has(action.profile)) errors.push("invalid profile");

  if (action?.enabledVariables) {
    if (!Array.isArray(action.enabledVariables)) {
      errors.push("enabledVariables must be an array");
    } else {
      const supportedVariables = getSupportedVariables(action.city);
      for (const variable of action.enabledVariables) {
        if (!supportedVariables.has(variable)) errors.push(`unsupported variable: ${variable}`);
      }
    }
  }

  if (action?.layerValues) {
    if (typeof action.layerValues !== "object" || Array.isArray(action.layerValues)) {
      errors.push("layerValues must be an object");
    } else {
      const supportedVariables = getSupportedVariables(action.city);
      for (const [variable, value] of Object.entries(action.layerValues)) {
        if (!supportedVariables.has(variable)) errors.push(`unsupported layer value: ${variable}`);
        if (!Number.isFinite(Number(value))) errors.push(`invalid layer value: ${variable}`);
      }
    }
  }

  if (action?.coordinates) {
    if (!Array.isArray(action.coordinates) || action.coordinates.length !== 2) {
      errors.push("invalid coordinates");
    } else {
      const [lon, lat] = action.coordinates;
      if (!Number.isFinite(Number(lon)) || !Number.isFinite(Number(lat))) {
        errors.push("coordinates must be [lon, lat]");
      }
    }
  }

  if (action?.walkingSpeed && (!Number.isFinite(Number(action.walkingSpeed)) || Number(action.walkingSpeed) <= 0)) {
    errors.push("invalid walkingSpeed");
  }
  if (action?.walkingTime && (!Number.isFinite(Number(action.walkingTime)) || Number(action.walkingTime) <= 0)) {
    errors.push("invalid walkingTime");
  }

  return errors;
}

export function validateAgentReply(reply) {
  const text = String(reply || "");
  const errors = [];
  for (const rule of blockedTextPatterns) {
    if (rule.pattern.test(text)) errors.push(`blocked ${rule.reason}`);
  }
  return errors;
}

export function safeFallback({ detected, citations = [], retrieval = null, errors = [] }) {
  return {
    reply: "I could not create a safe CAT answer from this message. Please try again with a clearer accessibility question.",
    intent: detected?.intent || "general_question",
    detected,
    action: { type: "ANSWER_ONLY", city: detected?.city || "hamburg" },
    missingDataWarnings: errors,
    citations,
    retrieval,
    debug: { validationErrors: errors },
  };
}
