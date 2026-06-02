// 演示场景定义：为面试展示准备的完整可复现场景
export const demoScenarios = [
  {
    id: "elderly_night_shopping",
    title: "🌙 场景 1：老年人夜间去超市",
    description: "选择一个老城区的起点，问 AI 该区域是否适合老年人夜间去超市。展示启发式评估 + 推荐参数 + 真实计算按钮。",
    
    // 地图与数据配置
    map: {
      city: "hamburg",
      center: [9.9920, 53.5466],
      zoom: 15
    },
    
    // 用户选择的起点（在地图上标记）
    startPoint: [9.9950, 53.5460],
    startPointLabel: "老城区超市附近",
    
    // 选择的用户画像
    userProfile: {
      id: "elderly",
      label: "老年人"
    },
    
    // 选择的图层
    selectedLayers: [
      "stair",           // 台阶
      "streetlight",     // 夜间照明点
      "wc_disabled",     // 无障碍卫生间
      "obstacle",        // 障碍物
      "slope"            // 坡度
    ],
    
    // 向 AI 提出的问题
    question: "这里是否适合老年人夜间去超市？有充足的照明吗？",
    
    // 预期响应特征（用于验证）
    expectedResponse: {
      mode: "point_analysis",
      shouldHaveScore: true,
      shouldHaveFactors: true,
      shouldMentionLight: true,
      shouldMentionStairs: true,
      askRealComputation: true
    },
    
    // 演示讲述要点
    narrative: {
      setup: "用户想在夜间去超市，我们选择老城区一个实际的超市位置作为起点，并加载相关的可达性因素（照明、台阶、障碍物等）。",
      question: "询问 AI：这里是否适合老年人夜间去超市？",
      result: "Agent 返回启发式评估得分、发现的环境问题、推荐的参数调整，并建议用户可以点击'运行真实计算'使用 pgRouting 获得更精确的路网可达性分析。",
      nextStep: "点击按钮展示演示占位对话，说明完整版本如何集成路网计算。"
    }
  },

  {
    id: "stroller_friendly_areas",
    title: "👶 场景 2：汉堡市内哪些区域适合推婴儿车散步",
    description: "不选择起点，直接提问。展示区域推荐模式，Agent 返回 3 个推荐区域、各自的优势和得分。",
    
    // 地图与数据配置
    map: {
      city: "hamburg",
      center: [9.9950, 53.5600],
      zoom: 13
    },
    
    // 无起点（区域推荐模式）
    startPoint: null,
    startPointLabel: "（无需选择起点）",
    
    // 用户选择的用户画像
    userProfile: {
      id: "stroller",
      label: "推婴儿车"
    },
    
    // 选择的图层（不严格，用于背景）
    selectedLayers: [
      "sidewalk_narrow",
      "slope",
      "obstacle",
      "wc_disabled",
      "poi_hh_park_spiel"
    ],
    
    // 向 AI 提出的问题
    question: "汉堡市内哪些区域比较适合推婴儿车散步？",
    
    // 预期响应特征
    expectedResponse: {
      mode: "region_recommendation",
      shouldHaveScore: false,
      shouldHaveRecommendedRegions: true,
      regionCount: 3,
      askRealComputation: true
    },
    
    // 演示讲述要点
    narrative: {
      setup: "用户是新手父母，想找到适合推婴儿车散步的区域。我们选择'推婴儿车'的用户画像，但暂不选择起点。",
      question: "问：汉堡市内哪些区域比较适合推婴儿车散步？",
      result: "Agent 使用区域推荐模式，返回 3 个按可达性得分排序的推荐区域（植物与花卉公园、城市公园、博物馆岛），每个区域有优势说明和得分。",
      nextStep: "点击推荐区域之一在地图上标记，然后重新提问进行精确分析；或直接在地图上选择任意起点开始详细查询。"
    }
  },

  {
    id: "wheelchair_accessibility",
    title: "♿ 场景 3：轮椅使用者的可达性分析",
    description: "选择一个公共交通枢纽（中央火车站附近）作为起点，问 AI 该区域的无障碍通行情况。展示针对轮椅用户的启发式评估。",
    
    // 地图与数据配置
    map: {
      city: "hamburg",
      center: [10.0070, 53.5520],
      zoom: 15
    },
    
    // 用户选择的起点
    startPoint: [10.0080, 53.5515],
    startPointLabel: "汉堡中央火车站附近",
    
    // 用户选择的用户画像
    userProfile: {
      id: "wheelchair",
      label: "轮椅使用者"
    },
    
    // 选择的图层
    selectedLayers: [
      "stair",           // 台阶（重要障碍）
      "obstacle",        // 障碍物
      "slope",           // 坡度
      "kerbs_high",      // 高路缘
      "wc_disabled",     // 无障碍卫生间
      "poi_hh_supermarket" // 超市 POI
    ],
    
    // 向 AI 提出的问题
    question: "从火车站出发，这个区域的无障碍设施是否完善？轮椅能方便通行吗？",
    
    // 预期响应特征
    expectedResponse: {
      mode: "point_analysis",
      shouldHaveScore: true,
      shouldHaveFactors: true,
      shouldMentionStairs: true,
      shouldMentionWCDisabled: true,
      shouldMentionSlope: true,
      askRealComputation: true
    },
    
    // 演示讲述要点
    narrative: {
      setup: "轮椅使用者从汉堡中央火车站出发，我们选择站附近作为起点，加载无障碍相关的图层（台阶、障碍、坡度、无障碍设施等）。",
      question: "问：这个区域的无障碍设施是否完善？轮椅能方便通行吗？",
      result: "Agent 返回启发式评估，重点标注台阶、高路缘、坡度等障碍，以及无障碍卫生间的数量与位置。推荐参数优先降低台阶权重。",
      nextStep: "展示应用推荐参数的过程，或点击'运行真实计算'获得基于实际路网的精确可达路径建议。"
    }
  }
];

/**
 * 根据场景 ID 获取完整场景配置
 */
export function getDemoScenario(scenarioId) {
  return demoScenarios.find(s => s.id === scenarioId);
}

/**
 * 获取所有演示场景的简要列表（用于 UI 菜单）
 */
export function getDemoScenariosList() {
  return demoScenarios.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description
  }));
}

/**
 * 将场景配置应用到 UI 状态（由前端调用）
 * 返回需要设置的状态对象
 */
export function applyScenarioToUI(scenarioId) {
  const scenario = getDemoScenario(scenarioId);
  if (!scenario) return null;

  return {
    selectedCity: scenario.map.city,
    startPoint: scenario.startPoint,
    selectedLayers: scenario.selectedLayers,
    agentProfile: scenario.userProfile,
    mapCenter: scenario.map.center,
    mapZoom: scenario.map.zoom,
    initialQuestion: scenario.question
  };
}
