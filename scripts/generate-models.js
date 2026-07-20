import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptAidy } from "../src/adapters/aidy.js";
import { adaptAiPricing } from "../src/adapters/ai-pricing.js";
import { adaptLiteLlm } from "../src/adapters/litellm.js";
import { adaptPriceHub } from "../src/adapters/price-hub.js";
import { SOURCE_CONFIG } from "../src/config.js";
import { hasMeaningfulChanges } from "../src/database-change.js";
import { fetchGitHubJsonSource, fetchGitHubLicense } from "../src/fetch.js";
import { mergeCatalogs } from "../src/merge.js";
import { validateDatabase } from "../src/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, process.argv[2] || "data/models.json");
const generatedAt = new Date().toISOString();

console.log("Fetching LiteLLM, aidy-models, model-price-hub, and ai-pricing...");
const githubHeaders = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const [sourceEntries, sourceLicenseEntries] = await Promise.all([
  Promise.all(
    Object.entries(SOURCE_CONFIG).map(async ([configKey, source]) => [
      configKey,
      await fetchGitHubJsonSource(source, { headers: githubHeaders }),
    ]),
  ),
  Promise.all(
    Object.entries(SOURCE_CONFIG).map(async ([configKey, source]) => [
      configKey,
      await fetchGitHubLicense(source.repository, { headers: githubHeaders }),
    ]),
  ),
]);

const sources = Object.fromEntries(sourceEntries);
const sourceLicenses = Object.fromEntries(sourceLicenseEntries);
const withProvenance = (configKey, catalog) => ({
  configKey,
  ...catalog,
  meta: {
    ...catalog.meta,
    ...sourceLicenses[configKey],
    ...sources[configKey].provenance,
    licenseCheckedAt: generatedAt,
  },
});

const database = mergeCatalogs(
  [
    withProvenance("litellm", adaptLiteLlm(sources.litellm.data, sources.litellm.provenance.observedAt)),
    withProvenance("aidy", adaptAidy(sources.aidy.data)),
    withProvenance("priceHub", adaptPriceHub(sources.priceHub.data)),
    withProvenance(
      "aiPricing",
      adaptAiPricing(sources.aiPricing.data, {
        observedAt: sources.aiPricing.provenance.observedAt,
        revision: sources.aiPricing.provenance.revision,
      }),
    ),
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
  console.log(`No model, pricing, or Quality changes: ${outputPath}`);
  console.log(JSON.stringify(database.stats, null, 2));
  process.exit(0);
}

const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(database)}\n`, "utf8");
await rename(temporaryPath, outputPath);
console.log(`Generated ${outputPath}`);
console.log(JSON.stringify(database.stats, null, 2));
