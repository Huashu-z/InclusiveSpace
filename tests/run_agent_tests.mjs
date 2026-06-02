import { getDemoScenariosList, getDemoScenario } from '../utils/demoScenarios.js';
import { summarizeSpatialContext, buildLegendSummary, generateMockAgentResponse, generateRegionRecommendations } from '../utils/spatialRag.js';
import { getRecommendedRegionsByQuery } from '../utils/recommendedRegions.js';

function bboxAround(point, delta = 0.01) {
  const [lon, lat] = point;
  return [lon - delta, lat - delta, lon + delta, lat + delta];
}

async function run() {
  const list = getDemoScenariosList();
  console.log('Loaded demo scenarios:', list.map(s => s.id).join(', '));

  for (const item of list) {
    const scenario = getDemoScenario(item.id);
    console.log('\n---\nScenario:', scenario.id, '-', scenario.title);

    if (scenario.startPoint && scenario.startPoint.length === 2) {
      const bbox = bboxAround(scenario.startPoint, 0.01);
      const spatialSummary = await summarizeSpatialContext({ selectedCity: scenario.map.city, layerIds: scenario.selectedLayers, bbox });
      const legendSummary = buildLegendSummary(scenario.selectedLayers);
      const resp = generateMockAgentResponse({ prompt: scenario.question, profile: scenario.userProfile, layerIds: scenario.selectedLayers, spatialSummary, legendSummary, startPoint: scenario.startPoint });
      console.log('Mode:', resp.mode);
      console.log('Reply (truncated):', resp.reply.slice(0, 800));
      console.log('Score:', resp.score);
      console.log('Suggested Settings:', JSON.stringify(resp.suggestedSettings));
      console.log('References count:', (resp.references || []).length);
    } else {
      // region recommendation
      const recs = getRecommendedRegionsByQuery(scenario.question, scenario.map.city);
      const resp = generateRegionRecommendations({ prompt: scenario.question, profile: scenario.userProfile, selectedCity: scenario.map.city, recommendedRegions: recs });
      console.log('Mode:', resp.mode);
      console.log('Reply (truncated):', resp.reply.slice(0, 800));
      console.log('RecommendedRegions count:', (resp.recommendedRegions || []).length);
      console.log('Suggested Settings:', JSON.stringify(resp.suggestedSettings));
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
