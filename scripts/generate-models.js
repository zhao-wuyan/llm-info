import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptAidy } from "../src/adapters/aidy.js";
import { adaptLiteLlm } from "../src/adapters/litellm.js";
import { adaptPriceHub } from "../src/adapters/price-hub.js";
import { SOURCE_CONFIG } from "../src/config.js";
import { hasMeaningfulChanges } from "../src/database-change.js";
import { fetchJson } from "../src/fetch.js";
import { mergeCatalogs } from "../src/merge.js";
import { validateDatabase } from "../src/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, process.argv[2] || "data/models.json");
const generatedAt = new Date().toISOString();

console.log("Fetching LiteLLM, aidy-models, and model-price-hub...");
const [litellmData, aidyData, priceHubData] = await Promise.all([
  fetchJson(SOURCE_CONFIG.litellm.url),
  fetchJson(SOURCE_CONFIG.aidy.url),
  fetchJson(SOURCE_CONFIG.priceHub.url),
]);

const database = mergeCatalogs(
  [
    { configKey: "litellm", ...adaptLiteLlm(litellmData, generatedAt) },
    { configKey: "aidy", ...adaptAidy(aidyData) },
    { configKey: "priceHub", ...adaptPriceHub(priceHubData) },
  ],
  generatedAt,
);
const errors = validateDatabase(database);
if (errors.length > 0) throw new Error(`Generated database is invalid:\n${errors.slice(0, 20).join("\n")}`);

await mkdir(dirname(outputPath), { recursive: true });
let previous = null;
try {
  previous = JSON.parse(await readFile(outputPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (previous && !hasMeaningfulChanges(previous, database)) {
  console.log(`No model or pricing changes: ${outputPath}`);
  console.log(JSON.stringify(database.stats, null, 2));
  process.exit(0);
}

const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(database)}\n`, "utf8");
await rename(temporaryPath, outputPath);
console.log(`Generated ${outputPath}`);
console.log(JSON.stringify(database.stats, null, 2));
