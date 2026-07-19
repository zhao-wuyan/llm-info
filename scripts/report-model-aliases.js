import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv.find((argument) => argument.endsWith(".json")) || "data/models.json");
const markdown = process.argv.includes("--markdown");
const database = JSON.parse(await readFile(inputPath, "utf8"));
const aliases = database.modelAliases || [];
const candidates = database.modelAliasCandidates || [];

if (markdown) {
  console.log("## 模型 alias 扫描");
  console.log();
  console.log(`- 已应用：${aliases.length} 条（自动 ${database.stats?.automaticModelAliases || 0} 条）`);
  console.log(`- 待审查候选：${candidates.length} 条`);
  if (candidates.length > 0) {
    console.log();
    console.log("| 置信度 | Alias | 建议 canonical ID |");
    console.log("| ---: | --- | --- |");
    for (const candidate of candidates.slice(0, 30)) {
      console.log(`| ${(candidate.confidence * 100).toFixed(0)}% | \`${candidate.alias}\` | \`${candidate.canonicalId}\` |`);
    }
  }
} else {
  console.log(`Applied aliases: ${aliases.length} (${database.stats?.automaticModelAliases || 0} automatic)`);
  console.log(`Review candidates: ${candidates.length}`);
  for (const candidate of candidates) {
    console.log(
      `${(candidate.confidence * 100).toFixed(0).padStart(3)}%  ${candidate.alias} -> ${candidate.canonicalId}`,
    );
  }
}
