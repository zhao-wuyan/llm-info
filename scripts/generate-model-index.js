import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGitHubTextSource } from "../src/fetch.js";
import { adaptAaIndexFromCatalog, adaptAiderPolyglot, adaptHuggingFace, adaptLmArenaCsv } from "../src/model-index/boards.js";
import { buildModelIndex, validateModelIndex } from "../src/model-index/build.js";
import { MODEL_INDEX_BOARD_CONFIG } from "../src/model-index/config.js";
import { crawlHuggingFace } from "../src/model-index/hugging-face.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(root, process.env.MODEL_CATALOG_PATH || "data/models.json");
const outputPath = resolve(root, process.argv[2] || "data/model-index.json");
const generatedAt = new Date().toISOString();
const githubHeaders = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
console.log(`Loaded catalog: ${catalog.models.length} channel records`);

async function githubBoard(configKey, adapt) {
  const config = MODEL_INDEX_BOARD_CONFIG[configKey];
  const { text, provenance } = await fetchGitHubTextSource({ id: config.id, github: config.github }, { headers: githubHeaders });
  const { entries } = adapt(text, { boardId: config.id });
  console.log(`${config.id}: ${entries.length} upstream rows @ ${provenance.revision.slice(0, 8)}`);
  return { config, entries, provenance };
}

const [arenaText, arenaVision, aider, huggingFaceRepositories] = await Promise.all([
  githubBoard("lmarena-text", adaptLmArenaCsv),
  githubBoard("lmarena-vision", adaptLmArenaCsv),
  githubBoard("aider-polyglot", adaptAiderPolyglot),
  crawlHuggingFace({ log: (message) => console.log(message) }),
]);

const huggingFace = {
  config: MODEL_INDEX_BOARD_CONFIG["hf-downloads"],
  ...adaptHuggingFace(huggingFaceRepositories, { boardId: "hf-downloads" }),
  provenance: { observedAt: generatedAt, revision: null, revisionUrl: null },
};
const aaIndexSource = catalog.sources.find((source) => source.id === "ai-pricing");
const aaIndex = {
  config: MODEL_INDEX_BOARD_CONFIG.aaindex,
  ...adaptAaIndexFromCatalog(catalog, { boardId: "aaindex" }),
  provenance: {
    observedAt: aaIndexSource?.observedAt ?? catalog.generatedAt ?? null,
    revision: aaIndexSource?.revision ?? null,
    revisionUrl: aaIndexSource?.revisionUrl ?? null,
  },
};

const index = buildModelIndex({
  catalog,
  boards: [aaIndex, arenaText, arenaVision, aider, huggingFace],
  generatedAt,
});

const errors = validateModelIndex(index);
if (errors.length > 0) throw new Error(`Generated model index is invalid:\n${errors.slice(0, 20).join("\n")}`);

await mkdir(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(index)}\n`, "utf8");
await rename(temporaryPath, outputPath);
console.log(`Generated ${outputPath}`);
console.log(JSON.stringify({ stats: index.stats, coverage: index.boards.map((board) => ({ id: board.id, ...board.coverage })) }, null, 2));
