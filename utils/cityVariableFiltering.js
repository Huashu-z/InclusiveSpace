import { cityLayerConfig } from "../components/cityVariableConfig.js";

export function getSupportedVariables(city) {
  return new Set(cityLayerConfig[city]?.discomfortFeatures || []);
}

export function filterVariablesByCity({ city, enabledVariables = [], layerValues = {}, requestedVariables = [] }) {
  const supportedVariables = getSupportedVariables(city);
  const warnings = [];
  const finalEnabledVariables = [];

  for (const variable of enabledVariables) {
    if (supportedVariables.has(variable)) {
      finalEnabledVariables.push(variable);
    } else {
      warnings.push(`${variable} was not applied because it is not available for ${city}.`);
    }
  }

  for (const variable of requestedVariables.filter(Boolean)) {
    if (!supportedVariables.has(variable)) {
      const warning = `${variable} was not applied because it is not available for ${city}.`;
      if (!warnings.includes(warning)) warnings.push(warning);
    } else if (!finalEnabledVariables.includes(variable)) {
      finalEnabledVariables.push(variable);
    }
  }

  const finalLayerValues = Object.fromEntries(
    Object.entries(layerValues).filter(([variable]) => supportedVariables.has(variable)),
  );

  for (const variable of finalEnabledVariables) {
    if (finalLayerValues[variable] === undefined) {
      finalLayerValues[variable] = 0.7;
    }
  }

  return {
    enabledVariables: finalEnabledVariables,
    layerValues: finalLayerValues,
    missingDataWarnings: warnings,
  };
}
