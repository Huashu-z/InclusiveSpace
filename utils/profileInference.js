const inferenceRules = [
  {
    profile: "elderly",
    confidence: 0.7,
    isApproximation: true,
    pattern: /walks slowly|parent walks slowly|ältere person|ältere menschen|älteren menschen|senioren|alte menschen/i,
    reason: "The message describes slower walking; elderly is used as the closest available low-speed walking profile.",
    matchedTerms: ["walks slowly", "parent walks slowly", "ältere person", "ältere menschen", "senioren"],
    fallbackProfiles: ["wheelchair_user"],
  },
  {
    profile: "wheelchair_user",
    confidence: 0.82,
    isApproximation: true,
    pattern: /step-free|step free|no steps|avoid steps|avoid stairs|avoids stairs|avoid all stairs|avoids all stairs|without stairs|reduced mobility|rollstuhl|barrierefrei/i,
    reason: "The message describes a need for step-free or reduced-mobility movement; wheelchair_user is the closest available CAT profile.",
    matchedTerms: ["step-free", "step free", "no steps", "avoid steps", "avoid stairs", "avoids stairs", "avoid all stairs", "without stairs", "reduced mobility", "rollstuhl", "barrierefrei"],
    fallbackProfiles: ["elderly"],
  },
  {
    profile: "visually_impaired",
    confidence: 0.86,
    isApproximation: true,
    pattern: /low vision|poor eyesight|limited vision/i,
    reason: "The message describes limited vision; visually_impaired is the closest available CAT profile.",
    matchedTerms: ["low vision", "poor eyesight", "limited vision"],
  },
  {
    profile: "children_family",
    confidence: 0.86,
    isApproximation: true,
    pattern: /three[-\s]?year[-\s]?old|two[-\s]?year[-\s]?old|one[-\s]?year[-\s]?old/i,
    reason: "The message describes a young child; children_family is the closest available CAT profile.",
    matchedTerms: ["three-year-old", "three year old", "two-year-old", "one-year-old"],
  },
  {
    profile: "elderly",
    confidence: 0.72,
    isApproximation: true,
    pattern: /slow walking|slow walking setting|get tired easily|tired easily|fatigue/i,
    reason: "The message describes fatigue or a slow walking setting; elderly is used as the closest available low-speed walking profile.",
    matchedTerms: ["slow walking", "slow walking setting", "get tired easily", "tired easily", "fatigue"],
    fallbackProfiles: ["wheelchair_user"],
  },
  {
    profile: "elderly",
    confidence: 0.94,
    isApproximation: false,
    pattern: /\b(?:father|mother|parent)\s+is\s+[7-9][0-9]\b|\b[7-9][0-9]\s*years?\s*old\b/i,
    reason: "The message describes an older adult by age or parent reference.",
    matchedTerms: ["father is 78", "mother is 78", "parent is 78", "78 years old"],
  },
  {
    profile: "elderly",
    confidence: 0.95,
    isApproximation: false,
    pattern: /\bold\s+(people|adults?|person)\b/i,
    reason: "The message explicitly describes older people.",
    matchedTerms: ["old people", "old adults", "old person"],
  },
  {
    profile: "elderly",
    confidence: 0.95,
    isApproximation: false,
    pattern: /elderly|older|senior|old person|grandma|grandmother|grandpa|grandfather|older adult|老年|老人|年长|退休|爷爷|奶奶|外公|外婆|八十|七十|高龄|\b[78]0\s*(years?\s*old|岁|歲)\b/i,
    reason: "The message explicitly describes an older adult.",
    matchedTerms: ["elderly", "older", "senior", "grandma", "grandmother", "grandpa", "grandfather", "老年", "老人", "爷爷", "奶奶", "八十", "80岁"],
  },
  {
    profile: "wheelchair_user",
    confidence: 0.95,
    isApproximation: false,
    pattern: /wheelchair|wheel chair|轮椅/i,
    reason: "The message explicitly describes wheelchair use.",
    matchedTerms: ["wheelchair", "轮椅"],
  },
  {
    profile: "wheelchair_user",
    confidence: 0.78,
    isApproximation: true,
    pattern: /mobility impaired|limited mobility|行动不便|无障碍/i,
    reason: "The message describes mobility limitations; the wheelchair profile is the closest available CAT profile.",
    matchedTerms: ["mobility impaired", "行动不便", "无障碍"],
  },
  {
    profile: "visually_impaired",
    confidence: 0.95,
    isApproximation: false,
    pattern: /visual|blind|visually impaired|视障|视觉障碍|盲/i,
    reason: "The message explicitly describes visual impairment.",
    matchedTerms: ["visual", "blind", "视障", "盲"],
  },
  {
    profile: "children_family",
    confidence: 0.95,
    isApproximation: false,
    pattern: /stroller|pushchair|children|child|kid|kids|family|婴儿车|儿童|孩子|家庭/i,
    reason: "The message explicitly describes children, a family, or stroller use.",
    matchedTerms: ["stroller", "children", "child", "kid", "family", "婴儿车", "儿童", "孩子"],
  },
  {
    profile: "children_family",
    confidence: 0.86,
    isApproximation: true,
    pattern: /toddler|preschool|kindergarten|baby|infant|小孩|幼儿|三岁|两岁|一岁|宝宝|婴儿/i,
    reason: "The message describes a young child; CAT currently has no separate toddler profile, so children_family is the closest available profile.",
    matchedTerms: ["toddler", "preschool", "小孩", "幼儿", "三岁", "宝宝"],
  },
  {
    profile: "elderly",
    confidence: 0.68,
    isApproximation: true,
    pattern: /walk slowly|slow walker|need rest|rest often|cane|walking stick|走得慢|走路慢|需要休息|手杖/i,
    reason: "The message describes slower walking or frequent rest needs; elderly is used as the closest available low-speed walking profile.",
    matchedTerms: ["walk slowly", "need rest", "cane", "走得慢", "需要休息", "手杖"],
    fallbackProfiles: ["wheelchair_user"],
  },
  {
    profile: "elderly",
    confidence: 0.68,
    isApproximation: true,
    pattern: /pregnant|pregnancy|孕妇|怀孕/i,
    reason: "CAT currently has no pregnancy profile; elderly is used as a conservative low-speed approximation focused on slopes, stairs, pavement, and obstacles.",
    matchedTerms: ["pregnant", "孕妇", "怀孕"],
    fallbackProfiles: ["children_family"],
  },
  {
    profile: "wheelchair_user",
    confidence: 0.68,
    isApproximation: true,
    pattern: /rehab|recovery|injury|crutches|术后|康复|受伤|拐杖/i,
    reason: "CAT currently has no rehabilitation profile; wheelchair_user is used as a conservative approximation for reduced mobility.",
    matchedTerms: ["rehab", "injury", "crutches", "康复", "拐杖"],
    fallbackProfiles: ["elderly"],
  },
];

function matchedTermFor(text, terms = []) {
  const lower = String(text || "").toLowerCase();
  return terms.find((term) => lower.includes(term.toLowerCase())) || null;
}

export function inferProfile(message) {
  const text = String(message || "");
  for (const rule of inferenceRules) {
    if (!rule.pattern.test(text)) continue;
    return {
      profile: rule.profile,
      confidence: rule.confidence,
      isApproximation: rule.isApproximation,
      reason: rule.reason,
      matchedTerm: matchedTermFor(text, rule.matchedTerms),
      fallbackProfiles: rule.fallbackProfiles || [],
    };
  }

  return {
    profile: null,
    confidence: 0,
    isApproximation: false,
    reason: "No mobility profile was explicitly described; default_adult will be used only if an analysis action is needed.",
    matchedTerm: null,
    fallbackProfiles: [],
  };
}

export function shouldAttemptSemanticProfileInference(message) {
  const text = String(message || "").toLowerCase();
  return /slow|difficulty|hard to walk|cannot walk|limited|mobility|needs?|support|rest|caregiver|crutches|walker|cane|pram|pushchair|stroller|child|baby|toddler|走得慢|走路慢|走路困难|行动|不便|需要休息|拐杖|助行器|小孩|孩子|宝宝|婴儿|幼儿|岁/.test(text);
}

const profileFromSource = {
  "profiles/elderly.md": "elderly",
  "profiles/wheelchair_user.md": "wheelchair_user",
  "profiles/visually_impaired.md": "visually_impaired",
  "profiles/children_family.md": "children_family",
  "profiles/default_adult.md": "default_adult",
};

export function inferProfileFromRetrievedKnowledge({ message, retrieval, minScore = 0.12 } = {}) {
  const direct = inferProfile(message);
  if (direct.profile) return direct;
  if (!shouldAttemptSemanticProfileInference(message)) return direct;

  const candidates = (retrieval?.results || [])
    .filter((doc) => doc.collection === "profiles")
    .map((doc) => ({
      doc,
      profile: profileFromSource[doc.metadata?.source],
      score: Number(doc.similarity || 0),
      semanticSimilarity: Number(doc.metadata?.semanticSimilarity),
      retrievalMode: doc.metadata?.retrievalMode,
    }))
    .filter((item) =>
      item.profile &&
      item.profile !== "default_adult" &&
      item.retrievalMode === "hybrid_dense_lexical_metadata" &&
      Number.isFinite(item.semanticSimilarity)
    )
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best || best.score < minScore) return direct;

  return {
    profile: best.profile,
    confidence: Math.max(0.5, Math.min(0.78, best.score)),
    isApproximation: true,
    reason: `No exact CAT profile phrase was found. The closest profile knowledge match is ${best.doc.title}, based on semantic/RAG retrieval.`,
    matchedTerm: null,
    fallbackProfiles: candidates.slice(1, 3).map((item) => item.profile),
    retrievalSource: best.doc.metadata?.source || null,
    retrievalScore: best.score,
  };
}
