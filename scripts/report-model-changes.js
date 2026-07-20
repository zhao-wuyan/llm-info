import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderChangeSummaryMarkdown, summarizeDatabaseChanges } from "../src/database-change.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const beforePath = resolve(option("--before", "data/models.json"));
const afterPath = resolve(option("--after", "data/models.json"));
const outputPath = resolve(option("--output", "model-update-summary.md"));
const githubOutput = option("--github-output", process.env.GITHUB_OUTPUT);
const [previous, current] = await Promise.all(
  [beforePath, afterPath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const summary = summarizeDatabaseChanges(previous, current);
const markdown = renderChangeSummaryMarkdown(summary);

await writeFile(outputPath, markdown, "utf8");
if (githubOutput) {
  await appendFile(
    githubOutput,
    `bulk_change=${summary.bulkChange}\naffected_models=${summary.affectedModels.length}\nsummary_path=${outputPath}\n`,
    "utf8",
  );
}
console.log(markdown);
