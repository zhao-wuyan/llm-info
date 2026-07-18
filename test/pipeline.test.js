import assert from "node:assert/strict";
import test from "node:test";
import { adaptAidy } from "../src/adapters/aidy.js";
import { adaptLiteLlm } from "../src/adapters/litellm.js";
import { adaptPriceHub } from "../src/adapters/price-hub.js";
import { hasMeaningfulChanges } from "../src/database-change.js";
import { mergeCatalogs } from "../src/merge.js";
import { validateDatabase } from "../src/validate.js";

const aidyFixture = {
  _meta: { generatedAt: "2026-07-17T00:00:00Z" },
  providers: {
    deepseek: {
      id: "deepseek",
      name: "DeepSeek",
      official: true,
      featured: true,
      description: "DeepSeek 官方模型服务。",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com",
      url: "https://deepseek.com",
      doc: "https://api-docs.deepseek.com",
      checkModel: "deepseek-chat",
    },
  },
  models: {
    deepseek: [
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        description: "DeepSeek 的通用对话模型。",
        abilities: {},
        pricing: { currency: "CNY", unit: "millionTokens", basePricing: { textInput: 2, textOutput: 8 } },
      },
    ],
  },
};

const litellmFixture = {
  "deepseek-chat": {
    litellm_provider: "deepseek",
    mode: "chat",
    input_cost_per_token: 0.00000027,
    output_cost_per_token: 0.0000011,
  },
};

const hubFixture = {
  generated_at: "2026-07-18T00:00:00Z",
  entries: [
    {
      provider: "deepseek",
      channel: "official",
      model: "deepseek-chat",
      canonical_model: "deepseek-chat",
      region: "cn",
      currency: "CNY",
      input_per_1m: 2.1,
      output_per_1m: 8.1,
      official: true,
      source_url: "https://example.com/pricing",
    },
  ],
};

test("merges native USD and CNY quotes without currency conversion", () => {
  const database = mergeCatalogs(
    [
      { configKey: "litellm", ...adaptLiteLlm(litellmFixture, "2026-07-18T00:00:00Z") },
      { configKey: "aidy", ...adaptAidy(aidyFixture) },
      { configKey: "priceHub", ...adaptPriceHub(hubFixture) },
    ],
    "2026-07-18T00:00:00Z",
  );

  assert.equal(database.models.length, 1);
  assert.equal(database.models[0].pricing.length, 3);
  assert.equal(database.models[0].displayPrices.USD.rates.textInput, 0.27);
  assert.equal(database.models[0].displayPrices.USD.source, "litellm");
  assert.equal(database.models[0].displayPrices.CNY.rates.textInput, 2);
  assert.equal(database.models[0].displayPrices.CNY.source, "aidy-models");
  assert.deepEqual(validateDatabase(database), []);
});

test("uses null when a native currency price is unavailable", () => {
  const database = mergeCatalogs(
    [{ configKey: "aidy", ...adaptAidy(aidyFixture) }],
    "2026-07-18T00:00:00Z",
  );
  assert.equal(database.models[0].displayPrices.USD, null);
  assert.ok(database.models[0].displayPrices.CNY);
});

test("keeps supplier details on providers and model descriptions on models", () => {
  const catalog = adaptAidy(aidyFixture);
  assert.equal(catalog.providers[0].description, "DeepSeek 官方模型服务。");
  assert.equal(catalog.providers[0].api, "openai-completions");
  assert.equal(catalog.providers[0].website, "https://deepseek.com");
  assert.equal(catalog.models[0].description, "DeepSeek 的通用对话模型。");
  assert.equal("api" in catalog.models[0], false);
});

test("prefers complete aidy supplier information during provider merging", () => {
  const database = mergeCatalogs(
    [
      { configKey: "litellm", ...adaptLiteLlm(litellmFixture, "2026-07-18T00:00:00Z") },
      { configKey: "aidy", ...adaptAidy(aidyFixture) },
      { configKey: "priceHub", ...adaptPriceHub(hubFixture) },
    ],
    "2026-07-18T00:00:00Z",
  );
  const provider = database.providers.find((item) => item.id === "deepseek");
  assert.equal(provider.name, "DeepSeek");
  assert.equal(provider.description, "DeepSeek 官方模型服务。");
  assert.equal(provider.api, "openai-completions");
});

test("keeps channel prices as separate model listings", () => {
  const data = {
    entries: [
      hubFixture.entries[0],
      { ...hubFixture.entries[0], channel: "siliconflow", input_per_1m: 1.5 },
    ],
  };
  const catalog = adaptPriceHub(data);
  assert.deepEqual(
    catalog.models.map((model) => model.id).sort(),
    ["deepseek/deepseek-chat", "siliconflow-cn/deepseek-chat"],
  );
});

test("ignores negative upstream sentinel prices", () => {
  const data = structuredClone(aidyFixture);
  data.models.deepseek[0].pricing.basePricing = { textInput: -1, textOutput: 8 };
  const catalog = adaptAidy(data);
  assert.deepEqual(catalog.models[0].pricing[0].rates, { textOutput: 8 });
});

test("keeps hub evidence variants and prefers a fresh scraped quote", () => {
  const direct = {
    ...hubFixture.entries[0],
    source: "deepseek",
    provenance: "scraped",
    scraped_at: "2026-07-18T00:00:00Z",
    via_vision: false,
  };
  const staleVision = {
    ...direct,
    input_per_1m: 99,
    source: "vision-deepseek",
    provenance: "stale",
    scraped_at: "2026-07-17T00:00:00Z",
    via_vision: true,
  };
  const catalog = adaptPriceHub({ entries: [direct, staleVision] });
  const database = mergeCatalogs([{ configKey: "priceHub", ...catalog }], "2026-07-18T00:00:00Z");

  assert.equal(database.models[0].pricing.length, 2);
  assert.equal(database.models[0].displayPrices.CNY.rates.textInput, 2.1);
  assert.match(database.models[0].displayPrices.CNY.priceId, /:deepseek-scraped-/);
});

test("ignores generated and observed timestamps when detecting data changes", () => {
  const first = mergeCatalogs(
    [{ configKey: "litellm", ...adaptLiteLlm(litellmFixture, "2026-07-18T00:00:00Z") }],
    "2026-07-18T00:00:00Z",
  );
  const second = mergeCatalogs(
    [{ configKey: "litellm", ...adaptLiteLlm(litellmFixture, "2026-07-19T00:00:00Z") }],
    "2026-07-19T00:00:00Z",
  );

  assert.equal(hasMeaningfulChanges(first, second), false);
  second.models[0].pricing[0].rates.textInput = 99;
  assert.equal(hasMeaningfulChanges(first, second), true);
});
