import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateModelIndex } from "../src/model-index/build.js";
import { modelIndexCoverageWarnings } from "../src/model-index/coverage.js";

const inputPath = resolve(process.argv[2] || "data/model-index.json");
const catalogPath = resolve(process.argv[3] || "data/models.json");
const [index, catalog] = await Promise.all([
  readFile(inputPath, "utf8").then(JSON.parse),
  readFile(catalogPath, "utf8").then(JSON.parse),
]);
const errors = validateModelIndex(index, catalog);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  for (const warning of modelIndexCoverageWarnings(index, catalog)) console.warn(warning);
  console.log(`Valid: ${inputPath}`);
  console.log(JSON.stringify({ stats: index.stats, boards: index.boards.map((board) => ({ id: board.id, ...board.coverage })) }, null, 2));
}
