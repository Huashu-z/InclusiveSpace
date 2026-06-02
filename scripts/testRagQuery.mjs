import { loadRagIndex, queryRagIndex } from "../utils/ragIndex.js";

const query = process.argv.slice(2).join(" ") || "无障碍设施附近哪个区域更适合轮椅用户";
const city = "hamburg";
const topK = 5;

async function main() {
  const index = await loadRagIndex();
  const results = queryRagIndex({ index, query, city, topK });

  console.log(`查询：${query}`);
  console.log(`城市：${city}`);
  console.log(`返回 top ${results.length} 个相关图层摘要：\n`);

  results.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.description}  (score=${doc.score.toFixed(4)})`);
    console.log(`   摘要：${doc.summary}`);
    console.log(`   source=${doc.metadata.filePath} count=${doc.metadata.count}`);
    console.log("");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
