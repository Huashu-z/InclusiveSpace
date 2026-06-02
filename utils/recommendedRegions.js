// 推荐区域定义：各城市在不同使用场景下的推荐区域
export const recommendedRegions = {
  hamburg: {
    elderly_friendly: [
      {
        id: "altstadt",
        name: "老城区（Altstadt）",
        description: "历史中心，有较多无障碍设施和公共交通",
        center: [9.9920, 53.5466],
        score: 72,
        reasons: ["照明充足", "无障碍设施较完善", "人流密集，安全性高"]
      },
      {
        id: "neustadt",
        name: "新城区（Neustadt）",
        description: "现代化街区，基础设施较新",
        center: [9.9850, 53.5550],
        score: 68,
        reasons: ["道路平坦", "信号灯完善", "商业设施集中"]
      },
      {
        id: "harvestehude",
        name: "哈菲斯泰胡德（Harvestehude）",
        description: "绿化较好的住宅区",
        center: [9.9700, 53.5700],
        score: 65,
        reasons: ["环境优美", "人行道宽敞", "设施相对新旧参半"]
      }
    ],
    stroller_friendly: [
      {
        id: "planten_blomen",
        name: "植物与花卉公园附近（Planten un Blomen）",
        description: "公园及周边街区，适合散步",
        center: [9.9700, 53.5650],
        score: 75,
        reasons: ["道路平坦", "人行道宽", "无障碍设施完善"]
      },
      {
        id: "stadtpark",
        name: "城市公园附近（Stadtpark）",
        description: "休闲绿地周边",
        center: [10.0100, 53.5800],
        score: 70,
        reasons: ["路面良好", "行人友好", "设施齐全"]
      },
      {
        id: "museum_island",
        name: "博物馆岛周边（Museumsmeile）",
        description: "文化区，适合家庭活动",
        center: [9.9800, 53.5550],
        score: 68,
        reasons: ["交通便利", "基础设施完善", "人流管理好"]
      }
    ],
    night_walking: [
      {
        id: "speicherstadt",
        name: "仓库城（Speicherstadt）",
        description: "历史商业区，夜间照明充足",
        center: [10.0050, 53.5400],
        score: 76,
        reasons: ["照明非常好", "安全感强", "商业活跃"]
      },
      {
        id: "city_center",
        name: "城市中心购物区",
        description: "主商业街，夜间人多光亮",
        center: [9.9920, 53.5500],
        score: 73,
        reasons: ["灯火通明", "人多安全", "警察巡逻"]
      },
      {
        id: "jungfernstieg",
        name: "少女堤岸（Jungfernstieg）",
        description: "外阿尔斯特湖畔，夜景优美",
        center: [9.9950, 53.5530],
        score: 70,
        reasons: ["路灯密集", "湖景照明", "游客众多"]
      }
    ],
    wheelchair_accessible: [
      {
        id: "hauptbahnhof_area",
        name: "中央火车站附近",
        description: "公共交通枢纽，无障碍设施最完善",
        center: [10.0070, 53.5520],
        score: 80,
        reasons: ["无障碍卫生间多", "轮椅坡道完善", "公共设施齐全"]
      },
      {
        id: "rathaus_platz",
        name: "市政厅广场",
        description: "政务中心，设施规范完整",
        center: [9.9930, 53.5505],
        score: 77,
        reasons: ["路面平坦", "无台阶", "厕所设施完善"]
      },
      {
        id: "neustadt_central",
        name: "新城中心商业街",
        description: "现代化商业区",
        center: [9.9850, 53.5560],
        score: 72,
        reasons: ["台阶少", "坡度缓", "设施现代"]
      }
    ]
  },
  penteli: {
    elderly_friendly: [
      {
        id: "penteli_center",
        name: "佩特利中心",
        description: "主城区，基础设施相对完善",
        center: [23.8100, 38.1100],
        score: 65,
        reasons: ["交通枢纽", "设施集中", "人口密集"]
      },
      {
        id: "penteli_residential",
        name: "佩特利居住区",
        description: "住宅安定区",
        center: [23.8050, 38.1050],
        score: 60,
        reasons: ["交通便利", "社区完善", "相对安静"]
      }
    ],
    stroller_friendly: [
      {
        id: "penteli_green",
        name: "佩特利绿地",
        description: "公园与绿化区",
        center: [23.8150, 38.1150],
        score: 68,
        reasons: ["环境优美", "设施较新", "人口流量适中"]
      }
    ]
  }
};

// 根据问题关键词推荐合适的区域类别
export function getRecommendedRegionsByQuery(prompt, city = "hamburg") {
  const regions = recommendedRegions[city];
  if (!regions) return [];

  const normalizedPrompt = (prompt || "").toLowerCase();
  let category = null;

  if (/老年|老人|年长|退休/.test(normalizedPrompt)) {
    category = "elderly_friendly";
  } else if (/婴儿|婴儿车|推车|儿童|孩子/.test(normalizedPrompt)) {
    category = "stroller_friendly";
  } else if (/夜间|晚上|夜晚|夜|天黑|照明/.test(normalizedPrompt)) {
    category = "night_walking";
  } else if (/轮椅|行动|无障碍|不便|障碍|坡度|台阶/.test(normalizedPrompt)) {
    category = "wheelchair_accessible";
  }

  return category ? (regions[category] || []) : [];
}

// 获取单个区域的详细建议
export function getRegionDetails(regionId, city = "hamburg") {
  const regions = recommendedRegions[city];
  if (!regions) return null;

  for (const category in regions) {
    const found = regions[category].find(r => r.id === regionId);
    if (found) return found;
  }
  return null;
}
