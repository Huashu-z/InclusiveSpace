function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePoint(point) {
  if (Array.isArray(point) && point.length === 2) {
    const lon = toNumber(point[0]);
    const lat = toNumber(point[1]);
    if (lon !== null && lat !== null) return { lon, lat };
  }
  if (point && typeof point === "object") {
    const lon = toNumber(point.lon ?? point.lng ?? point.longitude ?? point[0]);
    const lat = toNumber(point.lat ?? point.latitude ?? point[1]);
    if (lon !== null && lat !== null) return { lon, lat, label: point.label || point.locationText || null };
  }
  return null;
}

function samePoint(a, b, tolerance = 0.00001) {
  const pointA = normalizePoint(a);
  const pointB = normalizePoint(b);
  if (!pointA || !pointB) return false;
  return Math.abs(pointA.lon - pointB.lon) <= tolerance && Math.abs(pointA.lat - pointB.lat) <= tolerance;
}

function latestItem(items) {
  return Array.isArray(items) && items.length ? items[items.length - 1] : null;
}

export function normalizeAnalysisRecord(record, index = 0) {
  if (!record || typeof record !== "object") return null;
  const startPoint = normalizePoint(record.startPoint || record.coordinates || record.targetPoint);
  const baseline = record.baseline || record.result?.baseline || {};
  const adjusted = record.adjusted || record.result?.adjusted || {};
  const result = record.result || {};
  const baselineArea = toNumber(baseline.area ?? result.baselineArea ?? result.defaultArea);
  const adjustedArea = toNumber(adjusted.area ?? result.adjustedArea ?? result.weightedArea);
  const comfortRatio = toNumber(adjusted.comfortRatio ?? result.comfortRatio ?? result.weightedRatio) ??
    (baselineArea && adjustedArea ? adjustedArea / baselineArea : null);

  return {
    ...record,
    id: record.id || `analysis_${index + 1}`,
    startPoint,
    settings: record.settings || {},
    baseline: {
      area: baselineArea,
      poiCount: toNumber(baseline.poiCount ?? result.baselinePoiCount),
    },
    adjusted: {
      area: adjustedArea,
      comfortRatio,
      poiCount: toNumber(adjusted.poiCount ?? result.adjustedPoiCount ?? result.poiCount),
    },
  };
}

export function normalizeAnalysisHistory(history) {
  return (Array.isArray(history) ? history : [])
    .map((record, index) => normalizeAnalysisRecord(record, index))
    .filter(Boolean);
}

export function getCurrentSelectedPoint(currentMapState = {}) {
  const fromList = latestItem(currentMapState.startPoints);
  return normalizePoint(fromList || currentMapState.selectedStartPoint || currentMapState.startPoint);
}

export function isFollowUpComparison(message) {
  const text = String(message || "").toLowerCase();
  return /刚刚|刚才|之前|上一个|现在这个|这个地方|这个点|这里|这个起点|当前起点|新起点|比呢|相比|比较|对比|compare|previous|before|last one|this one|this place|this start point|current start point|new start point|how about here|what about this one|how about this start point|what about this start point/.test(text) &&
    /比|相比|比较|对比|更好|更适合|怎么样|如何|compare|better|worse|previous|before|last one|what about|how about/.test(text);
}

export function resolveAnalysisReferences({ message, analysisHistory = [], currentMapState = {} } = {}) {
  const normalizedHistory = normalizeAnalysisHistory(analysisHistory);
  const currentStartPoint = getCurrentSelectedPoint(currentMapState);
  const currentPointAnalysis = currentStartPoint
    ? [...normalizedHistory].reverse().find((record) => samePoint(record.startPoint, currentStartPoint))
    : null;
  const previousAnalysis = currentPointAnalysis && currentStartPoint
    ? [...normalizedHistory].reverse().find((record) => record.id !== currentPointAnalysis.id && !samePoint(record.startPoint, currentStartPoint)) || currentPointAnalysis
    : latestItem(normalizedHistory);
  const currentSameAsPrevious = Boolean(previousAnalysis && currentStartPoint && samePoint(previousAnalysis.startPoint, currentStartPoint));

  return {
    isFollowUpComparison: isFollowUpComparison(message),
    analysisHistoryLength: normalizedHistory.length,
    previousAnalysis,
    currentStartPoint,
    currentPointAnalysis,
    previousAnalysisFound: Boolean(previousAnalysis),
    currentStartPointFound: Boolean(currentStartPoint),
    currentPointAlreadyAnalyzed: Boolean(currentPointAnalysis),
    currentSameAsPrevious,
  };
}

export function buildAnalysisComparison({ previousAnalysis, currentAnalysis }) {
  if (!previousAnalysis || !currentAnalysis) return null;
  const previousRatio = previousAnalysis.adjusted?.comfortRatio;
  const currentRatio = currentAnalysis.adjusted?.comfortRatio;
  const previousArea = previousAnalysis.adjusted?.area;
  const currentArea = currentAnalysis.adjusted?.area;
  const previousPoi = previousAnalysis.adjusted?.poiCount;
  const currentPoi = currentAnalysis.adjusted?.poiCount;
  const ratioDelta = currentRatio !== null && previousRatio !== null ? currentRatio - previousRatio : null;
  const areaDelta = currentArea !== null && previousArea !== null ? currentArea - previousArea : null;
  const poiDelta = currentPoi !== null && previousPoi !== null ? currentPoi - previousPoi : null;

  let conclusion = "The two CAT results can be compared, but there is not enough numeric metadata for a clear winner.";
  if (ratioDelta !== null || areaDelta !== null) {
    const currentBetter = (ratioDelta ?? 0) > 0 || ((ratioDelta === null || Math.abs(ratioDelta) < 0.01) && (areaDelta ?? 0) > 0);
    const currentWorse = (ratioDelta ?? 0) < 0 || ((ratioDelta === null || Math.abs(ratioDelta) < 0.01) && (areaDelta ?? 0) < 0);
    if (currentBetter) conclusion = "相比刚刚的位置，当前地点整体更适合这个 profile 的步行/活动。";
    if (currentWorse) conclusion = "相比刚刚的位置，当前地点整体不如刚刚的位置适合这个 profile 的步行/活动。";
  }

  return {
    conclusion,
    previousRatio,
    currentRatio,
    ratioDelta,
    previousArea,
    currentArea,
    areaDelta,
    previousPoi,
    currentPoi,
    poiDelta,
  };
}
