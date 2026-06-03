export const AGENT_INTENTS = [
  "run_accessibility_analysis",
  "explain_variable",
  "ask_data_availability",
  "explain_result",
  "compare_profiles",
  "how_to_use",
  "troubleshooting",
  "general_question",
];

export const VARIABLE_ALIASES = {
  noise: ["noise", "noisy", "traffic noise", "noise data", "噪声", "噪音"],
  light: ["light", "lighting", "street light", "streetlight", "good lighting", "too dark", "照明", "路灯", "太暗"],
  trafficLight: ["traffic light", "crossing", "signal", "red light", "交通信号", "红绿灯"],
  tactile_pavement: ["tactile", "tactile paving", "blind guidance", "盲道", "触觉"],
  station: ["station", "public transport", "bus stop", "train station", "车站", "公共交通"],
  wcDisabled: ["accessible toilet", "wheelchair toilet", "toilet", "无障碍厕所", "无障碍卫生间"],
  narrowRoads: ["narrow", "narrow sidewalk", "narrow road", "窄路", "狭窄", "人行道"],
  stair: ["stair", "stairs", "step", "avoid stairs", "台阶", "楼梯", "有台阶"],
  obstacle: ["obstacle", "barrier", "blockage", "障碍"],
  slope: ["slope", "hill", "steep", "坡度", "斜坡"],
  unevenSurface: ["uneven", "uneven surface", "rough surface", "路面不平", "不平", "不平整"],
  poorPavement: ["poor pavement", "damaged pavement", "broken sidewalk", "破损", "路面"],
  kerbsHigh: ["kerb", "kerbs", "curb", "kerbshigh", "high kerb", "curb is too high", "高路缘", "路缘"],
  facility: ["facility", "facilities", "shops", "benches", "设施"],
  pedestrianFlow: ["pedestrian flow", "crowd", "crowded", "人流", "拥挤"],
  greeninf: ["green", "green space", "park", "绿地", "绿色"],
  blueinf: ["blue", "water", "waterfront", "水体", "蓝色"],
  temperatureSummer: ["summer", "heat", "hot", "夏季", "炎热"],
  temperatureWinter: ["winter", "cold", "icy", "冬季", "寒冷"],
};

const profileRules = [
  { profile: "elderly", pattern: /elderly|older|senior|old person|老年|老人|年长|退休/i },
  { profile: "wheelchair_user", pattern: /wheelchair|wheel chair|轮椅|行动不便|无障碍/i },
  { profile: "visually_impaired", pattern: /visual|blind|visually impaired|视障|视觉障碍|盲/i },
  { profile: "children_family", pattern: /stroller|pushchair|children|family|婴儿车|儿童|孩子|家庭/i },
];

function normalize(text) {
  return String(text || "").trim();
}

export function detectCity(message, fallbackCity = "hamburg") {
  const text = normalize(message).toLowerCase();
  if (text.includes("penteli") || text.includes("彭特利")) return "penteli";
  if (text.includes("hamburg") || text.includes("汉堡")) return "hamburg";
  return fallbackCity;
}

export function detectProfile(message) {
  const text = normalize(message);
  return profileRules.find((rule) => rule.pattern.test(text))?.profile || null;
}

export function detectVariable(message) {
  const text = normalize(message).toLowerCase();
  for (const [key, aliases] of Object.entries(VARIABLE_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias.toLowerCase()))) return key;
  }
  return null;
}

export function detectLocationText(message) {
  const text = normalize(message);
  if (/hamburg hauptbahnhof/i.test(text)) return "Hamburg Hauptbahnhof";
  if (/hauptbahnhof/i.test(text)) return "Hauptbahnhof";
  if (/\bnear\s+the\s+station\b/i.test(text)) return "the station";

  const nearMatch = text.match(/\b(?:near|around|at|in|to)\s+([A-Z][A-Za-zÄÖÜäöüß\s-]{2,80}?)(?:[.?]|$)/);
  if (nearMatch?.[1]?.trim().toLowerCase() === "cat") return null;
  if (nearMatch?.[1]) return nearMatch[1].trim();

  const chineseMatch = text.match(/(?:在|去|到|附近|周边)([^。！？?]{2,30})(?:是否|方便|适合|可达|通行|散步|步行|吗|？|\?|。|$)/);
  if (chineseMatch?.[1]) return chineseMatch[1].trim();

  return null;
}

export function detectAgentIntent(message, { hasResultMetadata = false } = {}) {
  const text = normalize(message).toLowerCase();
  const variable = detectVariable(message);
  const profile = detectProfile(message);
  const locationText = detectLocationText(message);
  const hasRunCue = /convenient|accessible|move around|walking|walk|suitable|can i|is .* area|analysis|analyze|catchment|方便|适合|可达|通行|步行|活动|分析|计算/.test(text);
  const explicitHowToUse = /how.*use|use.*cat|instruction|guide|怎么用|如何使用|网页|界面/.test(text);

  if (/trouble|error|failed|not working|no reachable|empty|问题|报错|失败|没有结果|无法/.test(text)) {
    return { intent: "troubleshooting", confidence: 0.95, method: "rules" };
  }
  if ((profile || hasRunCue || locationText) && !explicitHowToUse) {
    return { intent: "run_accessibility_analysis", confidence: 0.82, method: "rules" };
  }
  if (explicitHowToUse || /使用/.test(text)) {
    return { intent: "how_to_use", confidence: 0.95, method: "rules" };
  }
  if (/what.*mean|meaning|explain.*variable|does .* mean|是什么|什么意思|含义|解释.*变量/.test(text) && variable) {
    return { intent: "explain_variable", confidence: 0.95, method: "rules" };
  }
  if (/data|available|availability|have .* data|support|missing|unavailable|有没有|是否有|支持|可用|缺少|数据/.test(text) && (text.includes("hamburg") || text.includes("penteli") || variable)) {
    return { intent: "ask_data_availability", confidence: 0.92, method: "rules" };
  }
  if (/comfort ratio|explain this|explain result|latest cat result|解释结果|结果|面积|ratio/.test(text) || hasResultMetadata) {
    return { intent: "explain_result", confidence: 0.86, method: "rules" };
  }
  if (/compare|difference|which profile|对比|比较/.test(text)) {
    return { intent: "compare_profiles", confidence: 0.86, method: "rules" };
  }
  return { intent: "general_question", confidence: 0.45, method: "rules_uncertain" };
}

export function detectAgentRequest(message, { city = "hamburg", hasResultMetadata = false } = {}) {
  const intentResult = detectAgentIntent(message, { hasResultMetadata });
  return {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    method: intentResult.method,
    city: detectCity(message, city),
    profile: detectProfile(message),
    variable_key: detectVariable(message),
    locationText: intentResult.intent === "run_accessibility_analysis" ? detectLocationText(message) : null,
  };
}
