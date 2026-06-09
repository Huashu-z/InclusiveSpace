import {
  inferProfile,
  inferProfileFromRetrievedKnowledge,
} from "../utils/profileInference.js";

const cases = [
  {
    id: "direct_child_match",
    run: () => inferProfile("三岁小孩从主火可以到达哪些区域").profile === "children_family",
  },
  {
    id: "approx_slow_walker_match",
    run: () => {
      const result = inferProfile("I walk very slowly and need rest often.");
      return result.profile === "elderly" && result.isApproximation === true;
    },
  },
  {
    id: "no_semantic_fallback_without_dense_mode",
    run: () => {
      const result = inferProfileFromRetrievedKnowledge({
        message: "A person with special mobility needs wants to walk here.",
        retrieval: {
          results: [
            {
              collection: "profiles",
              title: "Children and family profile",
              similarity: 0.9,
              metadata: {
                source: "profiles/children_family.md",
                retrievalMode: "lexical_metadata",
              },
            },
          ],
        },
      });
      return result.profile === null;
    },
  },
  {
    id: "semantic_fallback_with_dense_mode",
    run: () => {
      const result = inferProfileFromRetrievedKnowledge({
        message: "A person with special mobility needs wants to walk here.",
        retrieval: {
          results: [
            {
              collection: "profiles",
              title: "Wheelchair user profile",
              similarity: 0.42,
              metadata: {
                source: "profiles/wheelchair_user.md",
                retrievalMode: "hybrid_dense_lexical_metadata",
                semanticSimilarity: 0.51,
              },
            },
          ],
        },
      });
      return result.profile === "wheelchair_user" && result.isApproximation === true;
    },
  },
];

for (const testCase of cases) {
  const passed = testCase.run();
  console.log(`test ${testCase.id}: ${passed ? "ok" : "failed"}`);
  if (!passed) process.exitCode = 1;
}
