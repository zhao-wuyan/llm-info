import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adaptAidy } from "../src/adapters/aidy.js";
import { adaptAiPricing } from "../src/adapters/ai-pricing.js";
import { adaptLiteLlm } from "../src/adapters/litellm.js";
import { adaptPriceHub } from "../src/adapters/price-hub.js";
import { SOURCE_CONFIG } from "../src/config.js";
import { hasMeaningfulChanges } from "../src/database-change.js";
import { fetchGitHubLicense, fetchJson } from "../src/fetch.js";
import { mergeCatalogs } from "../src/merge.js";
import { validateDatabase } from "../src/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, process.argv[2] || "data/models.json");
const generatedAt = new Date().toISOString();

console.log("Fetching LiteLLM, aidy-models, model-price-hub, and ai-pricing...");
const githubHeaders = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const [litellmData, aidyData, priceHubData, aiPricingData, aiPricingCommits, sourceLicenseEntries] = await Promise.all([
  fetchJson(SOURCE_CONFIG.litellm.url),
  fetchJson(SOURCE_CONFIG.aidy.url),
  fetchJson(SOURCE_CONFIG.priceHub.url),
  fetchJson(SOURCE_CONFIG.aiPricing.url, { headers: githubHeaders }),
  fetchJson(SOURCE_CONFIG.aiPricing.revisionUrl, { headers: githubHeaders }),
  Promise.all(
    Object.entries(SOURCE_CONFIG).map(async ([configKey, source]) => [
      configKey,
      await fetchGitHubLicense(source.repository, { headers: githubHeaders }),
    ]),
  ),
]);

const aiPricingCommit = aiPricingCommits?.[0];
if (!aiPricingCommit?.sha) throw new Error("ai-pricing: unable to resolve the latest data-file revision");
const sourceLicenses = Object.fromEntries(sourceLicenseEntries);
const withLicense = (configKey, catalog) => ({
  configKey,
  ...catalog,
  meta: { ...catalog.meta, ...sourceLicenses[configKey], licenseCheckedAt: generatedAt },
});

const database = mergeCatalogs(
  [
    withLicense("litellm", adaptLiteLlm(litellmData, generatedAt)),
    withLicense("aidy", adaptAidy(aidyData)),
    withLicense("priceHub", adaptPriceHub(priceHubData)),
    withLicense(
      "aiPricing",
      adaptAiPricing(aiPricingData, {
        observedAt: aiPricingCommit.commit?.committer?.date || generatedAt,
        revision: aiPricingCommit.sha,
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
