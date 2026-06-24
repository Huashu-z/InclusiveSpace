import { inferProfile } from "./profileInference.js";

export const AGENT_INTENTS = [
  "catchment_area_analysis",
  "area_suitability_question",
  "route_recommendation",
  "specific_poi_query",
  "parameter_recommendation",
  "run_accessibility_analysis",
  "explain_variable",
  "ask_data_availability",
  "explain_result",
  "compare_with_previous_result",
  "compare_current_with_previous",
  "compare_two_locations",
  "follow_up_question",
  "compare_profiles",
  "how_to_use",
  "troubleshooting",
  "unsupported_specific_poi_query",
  "citywide_place_recommendation",
  "unsupported_related_question",
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
  return inferProfile(message).profile;
}

export function detectVariable(message) {
  const text = normalize(message).toLowerCase();
  for (const [key, aliases] of Object.entries(VARIABLE_ALIASES)) {
    if (text.includes(key.toLowerCase()) || aliases.some((alias) => text.includes(alias.toLowerCase()))) return key;
  }
  return null;
}

export function detectLocationText(message) {
  const text = normalize(message);
  if (/hamburg hauptbahnhof/i.test(text)) return "Hamburg Hauptbahnhof";
  if (/hamburg\s+generally|analy[sz]e\s+hamburg\s+generally/i.test(text)) return "Hamburg";
  if (/主火|主火车站|汉堡火车站|汉堡中央车站/i.test(text)) return "Hamburg Hauptbahnhof";
  if (/hauptbahnhof/i.test(text)) return "Hauptbahnhof";
  if (/\bnear\s+the\s+station\b/i.test(text)) return "the station";
  if (/\bbefore\s+i\s+start\b/i.test(text)) return null;

  const nearMatch = text.match(/\b(?:near|around|at|in|to)\s+([A-Z][A-Za-zÄÖÜäöüß\s-]{2,80}?)(?:[.?]|$)/);
  if (nearMatch?.[1]?.trim().toLowerCase() === "cat") return null;
  if (nearMatch?.[1]) return nearMatch[1].trim();

  const chineseMatch = text.match(/(?:在|去|到|附近|周边)([^。！？?]{2,30})(?:是否|方便|适合|可达|通行|散步|步行|吗|？|\?|。|$)/);
  if (chineseMatch?.[1]) {
    const candidate = chineseMatch[1].trim();
    if (isGenericOrInvalidLocation(candidate)) return null;
    return candidate;
  }

  return null;
}

function isGenericOrInvalidLocation(value) {
  const text = normalize(value).toLowerCase();
  return !text ||
    /^(here|this area|this place|selected area|current area|current place|hamburg|penteli|the station|station)$/i.test(text) ||
    /这里|这儿|这个地方|这个区域|当前区域|当前地点|当前选择|活动|设置|分析|变量|代表什么|是什么意思|含义|可达性里/.test(text);
}

export function detectSpecificPoiQuery(message) {
  const text = normalize(message).toLowerCase();
  const asksForSpecificItem = /nearest|closest|which|where is|what is|best|\u6700\u8fd1|\u54ea\u4e2a|\u54ea\u5bb6|\u54ea\u4e00\u4e2a|\u5177\u4f53/u.test(text);
  const mentionsPoiType = /bakery|bakeries|bread|restaurant|cafe|coffee|supermarket|shop|store|pharmacy|toilet|bench|poi|place|\u9762\u5305\u623f|\u9762\u5305\u5e97|\u9762\u5305|\u9910\u5385|\u996d\u5e97|\u5496\u5561|\u8d85\u5e02|\u5546\u5e97|\u836f\u5e97|\u5395\u6240|\u536b\u751f\u95f4|\u957f\u6905|\u8bbe\u65bd/u.test(text);
  const asksForRanking = /nearest|closest|\u6700\u8fd1/u.test(text);
  const asksWhichPoi = /which\s+.+|where\s+is\s+.+|\u54ea\u4e2a|\u54ea\u5bb6|\u54ea\u4e00\u4e2a/u.test(text);
  const isReachableAreaQuestion = /reachable area|catchment area|which areas|\u53ef\u8fbe\u533a\u57df|\u54ea\u4e9b\u533a\u57df/u.test(text);

  return mentionsPoiType && asksForSpecificItem && (asksForRanking || asksWhichPoi) && !isReachableAreaQuestion;
}

export function detectRouteRecommendation(message) {
  const text = normalize(message).toLowerCase();
  const hasRouteCue = /route|path|way|navigation|directions|how to get to|from .+ to .+|\u8def\u7ebf|\u8def\u5f84|\u600e\u4e48\u8d70|\u600e\u4e48\u53bb|\u5bfc\u822a|\u4ece.+\u5230.+|\u5230.+\u7684.+\u8def/u.test(text);
  const asksComfortRoute = /comfortable|comfort|best|safe|safest|\u6700\u8212\u670d|\u6700\u8212\u9002|\u6700\u65b9\u4fbf|\u6700\u5b89\u5168|\u6700\u597d/u.test(text);
  const hasOriginDestinationShape = /from .+ to .+|\u4ece.+\u5230.+/u.test(text);
  const asksReachableArea = /reachable area|catchment area|which areas|\u54ea\u4e9b\u533a\u57df|\u80fd\u5230\u54ea\u91cc|\u53ef\u8fbe\u8303\u56f4/u.test(text);

  return (hasOriginDestinationShape || hasRouteCue) && (hasRouteCue || asksComfortRoute) && !asksReachableArea;
}

export function detectDestinationText(message) {
  const text = normalize(message);
  const englishMatch = text.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:[.?]|$)/i);
  if (englishMatch?.[2]) return englishMatch[2].trim();

  const chineseMatch = text.match(/\u4ece(.+?)\u5230([^?？。.!！,，]{1,40})/u);
  if (chineseMatch?.[2]) {
    return chineseMatch[2]
      .replace(/(最舒服|最舒适|最方便|最安全|路线|路径|怎么走|怎么去|是什么).*$/u, "")
      .trim();
  }

  return null;
}

export function detectAgentIntent(message, { hasResultMetadata = false } = {}) {
  const text = normalize(message).toLowerCase();
  const earlyVariable = detectVariable(message);
  const asksRelatedUnsupported = [
    /\b(weather|forecast|rain|snow|wind|storm|real[-\s]?time|today'?s weather|climate)\b/,
    /\b(traffic|congestion|road closures?|closures?|construction|incident|delay|open now|opening hours|event|crowd now)\b/,
    /\b(bike|bicycle|cycling|cycle route|bike lane|scooter|car|driving|drive|public transport schedule|train schedule|bus schedule)\b/,
    /\b(can i|could i|should i|is it safe to|safe for me to)\s+(ride|cycle|bike|drive|go out|walk now)\b/,
    /\b(health|medical|injury|pregnant|asthma|allergy|legal|law|police|emergency)\b/,
  ].some((pattern) => pattern.test(text));
  if (asksRelatedUnsupported) {
    return { intent: "unsupported_related_question", confidence: 0.94, method: "rules" };
  }
  if (/what can .*map assistant.*do|map assistant.*help|before i start|how do i start|get started|first step|where should i start/.test(text)) {
    return { intent: "how_to_use", confidence: 0.95, method: "rules" };
  }
  if (/what.*mean|meaning|explain.*variable|does .* mean/.test(text) && earlyVariable) {
    return { intent: "explain_variable", confidence: 0.95, method: "rules" };
  }
  if (/trouble|error|failed|not working|no reachable|empty|map.*not.*show|no result|not display|没有结果|地图.*没有显示|没有显示.*可达/.test(text)) {
    return { intent: "troubleshooting", confidence: 0.95, method: "rules" };
  }
  const variable = detectVariable(message);
  const profile = detectProfile(message);
  const locationText = detectLocationText(message);
  const hasRunCue = /convenient|accessible|move around|walking|walk|suitable|can i|is .* area|analysis|analyze|catchment|reachable|到达|哪些区域|方便|适合|可达|通行|步行|活动|分析|计算/.test(text);
  const explicitHowToUse = /how.*use|use.*cat|how do i start|get started|first step|where should i start|what can .*tool.*do|what.*cat.*do|what.*tool.*do|tool.*capabilit|instruction|guide|怎么用|如何使用|网页|界面/.test(text);
  const variableExplanation = /what.*mean|meaning|explain.*variable|does .* mean|是什么|什么意思|代表什么|含义|解释.*变量/.test(text) && variable;
  const explicitParameterRecommendation = /recommend .*?(parameter|setting|comfort factor|factor)|suggest .*?(parameter|setting|comfort factor|factor)|help .*?(choose|set|select).*?(comfort factor|factor|parameter)|which .*?(comfort factor|factor|parameter).*?(set|choose|use|matter)|what .*?(comfort factor|factor|parameter).*?(set|choose|use|matter)|how .*?(choose|set|select).*?(comfort factor|factor|parameter)|comfort factors?.*?(matter|for a person|for someone)|parameter recommendation|recommended settings|recommended parameter/.test(text);
  const explicitResultExplanation = /comfort ratio|explain this|explain result|latest cat result|latest .*result|red area result|what does .*result mean|解释结果|结果|面积|ratio/.test(text);
  const explicitDataAvailability = /data|available|availability|have .* data|support|missing|unavailable|can .*consider|still consider|有没有|是否有|支持|可用|缺少|数据/.test(text) &&
    (text.includes("hamburg") || text.includes("penteli") || variable);
  const followUpComparison = !/\bbefore\s+i\s+start\b/.test(text) && (
    /刚刚|刚才|之前|上一个|现在这个|这个地方|这个点|这里|这个起点|当前起点|新起点|比呢|相比|比较|对比|compare|previous|last one|this one|this place|this start point|current start point|new start point|how about here|what about this one|how about this start point|what about this start point/.test(text) &&
    /比|相比|比较|对比|更好|更适合|怎么样|如何|compare|better|worse|previous|last one|what about|how about/.test(text)
  );

  if (variableExplanation) {
    return { intent: "explain_variable", confidence: 0.95, method: "rules" };
  }
  if (explicitHowToUse) {
    return { intent: "how_to_use", confidence: 0.95, method: "rules" };
  }
  if (explicitDataAvailability) {
    return { intent: "ask_data_availability", confidence: 0.92, method: "rules" };
  }
  if (explicitParameterRecommendation) {
    return { intent: "parameter_recommendation", confidence: 0.9, method: "rules" };
  }
  if (followUpComparison) {
    return { intent: "compare_with_previous_result", confidence: 0.94, method: "rules" };
  }
  if (explicitResultExplanation) {
    return { intent: "explain_result", confidence: 0.88, method: "rules" };
  }
  if (detectSpecificPoiQuery(message)) {
    return { intent: "specific_poi_query", confidence: 0.93, method: "rules" };
  }
  if (detectRouteRecommendation(message)) {
    return { intent: "route_recommendation", confidence: 0.93, method: "rules" };
  }
  if (/trouble|error|failed|not working|no reachable|empty|问题|报错|失败|没有结果|无法/.test(text)) {
    return { intent: "troubleshooting", confidence: 0.95, method: "rules" };
  }
  if (/reachable area|catchment|within .* minutes|reachable|\u5230\u8fbe|\u54ea\u4e9b\u533a\u57df|\u53ef\u8fbe|\u80fd\u5230\u54ea\u91cc|\u591a\u5927\u8303\u56f4/u.test(text) && !explicitHowToUse) {
    return { intent: "catchment_area_analysis", confidence: 0.88, method: "rules" };
  }
  if ((profile || hasRunCue || locationText) && !explicitHowToUse) {
    return { intent: "area_suitability_question", confidence: 0.82, method: "rules" };
  }
  if (explicitHowToUse) {
    return { intent: "how_to_use", confidence: 0.95, method: "rules" };
  }
  if (/what.*mean|meaning|explain.*variable|does .* mean|是什么|什么意思|含义|解释.*变量/.test(text) && variable) {
    return { intent: "explain_variable", confidence: 0.95, method: "rules" };
  }
  if (/data|available|availability|have .* data|support|missing|unavailable|有没有|是否有|支持|可用|缺少|数据/.test(text) && (text.includes("hamburg") || text.includes("penteli") || variable)) {
    return { intent: "ask_data_availability", confidence: 0.92, method: "rules" };
  }
  if (/comfort ratio|explain this|explain result|latest cat result|解释结果|结果|面积|ratio/.test(text)) {
    return { intent: "explain_result", confidence: 0.86, method: "rules" };
  }
  if (/compare|difference|which profile|对比|比较/.test(text)) {
    return { intent: "compare_profiles", confidence: 0.86, method: "rules" };
  }
  return { intent: "general_question", confidence: 0.45, method: "rules_uncertain" };
}

export function detectAgentRequest(message, { city = "hamburg", hasResultMetadata = false } = {}) {
  const intentResult = detectAgentIntent(message, { hasResultMetadata });
  const profileInference = inferProfile(message);
  const locationIntents = [
    "catchment_area_analysis",
    "area_suitability_question",
    "route_recommendation",
    "specific_poi_query",
    "unsupported_specific_poi_query",
    "compare_with_previous_result",
    "compare_current_with_previous",
    "compare_two_locations",
    "run_accessibility_analysis",
  ];
  return {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    method: intentResult.method,
    city: detectCity(message, city),
    profile: profileInference.profile,
    profileInference,
    variable_key: detectVariable(message),
    isFollowUp: [
      "compare_with_previous_result",
      "compare_current_with_previous",
      "compare_two_locations",
      "follow_up_question",
    ].includes(intentResult.intent),
    referenceTarget: intentResult.intent === "compare_with_previous_result" ? "latest_analysis_result" : null,
    currentTarget: intentResult.intent === "compare_with_previous_result" ? "current_selected_start_point" : null,
    requiresComparison: intentResult.intent === "compare_with_previous_result",
    locationText: locationIntents.includes(intentResult.intent)
      ? detectLocationText(message)
      : null,
    destinationText: intentResult.intent === "route_recommendation" ? detectDestinationText(message) : null,
  };
}
