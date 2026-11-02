import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderChangeSummaryMarkdown, summarizeDatabaseChanges } from "../src/database-change.js";
import { modelIndexCoverageWarnings } from "../src/model-index/coverage.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const beforePath = resolve(option("--before", "data/models.json"));
const afterPath = resolve(option("--after", "data/models.json"));
const indexPath = resolve(option("--index", "data/model-index.json"));
const outputPath = resolve(option("--output", "model-update-summary.md"));
const githubOutput = option("--github-output", process.env.GITHUB_OUTPUT);
const [previous, current, index] = await Promise.all(
  [beforePath, afterPath, indexPath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const summary = summarizeDatabaseChanges(previous, current);
const warnings = modelIndexCoverageWarnings(index, current);
const markdown = renderChangeSummaryMarkdown(summary) + (warnings.length
  ? `\n## 外部榜单覆盖告警\n\n覆盖不足仅告警，不阻断更新；未匹配模型不沿用旧分数。\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n`
  : "");

await writeFile(outputPath, markdown, "utf8");
if (githubOutput) {
  await appendFile(
    githubOutput,
    `bulk_change=${summary.bulkChange}\naffected_models=${summary.affectedModels.length}\nsummary_path=${outputPath}\n`,
    "utf8",
  );
}
console.log(markdown);
