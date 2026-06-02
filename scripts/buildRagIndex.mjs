import path from "path";
import { buildRagIndex } from "../utils/ragIndex.js";

async function main() {
  try {
    const result = await buildRagIndex();
    console.log(`RAG 索引已生成：${result.path}`);
    console.log(`文档数：${result.documents}`);
  } catch (error) {
    console.error("构建 RAG 索引失败：", error);
    process.exit(1);
  }
}

main();
