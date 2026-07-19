import assert from "node:assert/strict";
import test from "node:test";
import { adaptAidy } from "../src/adapters/aidy.js";
import { adaptAiPricing } from "../src/adapters/ai-pricing.js";
import { adaptLiteLlm } from "../src/adapters/litellm.js";
import { adaptPriceHub } from "../src/adapters/price-hub.js";
import { hasMeaningfulChanges } from "../src/database-change.js";
import { fetchGitHubLicense } from "../src/fetch.js";
import { mergeCatalogs } from "../src/merge.js";
import { discoverModelAliases } from "../src/model-alias-discovery.js";
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

const qualityFixture = [
  {
    model: "DeepSeek V4 Pro",
    developer: "DeepSeek",
    AAIndex: 44,
    inputPrice: 99,
    context: 123,
  },
  { model: "Unmapped Future Model", developer: "Example", AAIndex: 50 },
];

const qualityMeta = {
  observedAt: "2026-07-18T00:00:00Z",
  revision: "5ab51479cd8cae12e0c63dec14200ed75ef480cd",
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

test("propagates explicit free markers and zero-priced free labels", () => {
  const zeroPriced = structuredClone(aidyFixture);
  zeroPriced.models.deepseek[0].pricing.basePricing = { textInput: 0, textOutput: 0 };
  const unmarked = mergeCatalogs(
    [{ configKey: "aidy", ...adaptAidy(zeroPriced) }],
    "2026-07-18T00:00:00Z",
  );
  assert.equal(unmarked.models[0].displayPrices.CNY.free, undefined);

  zeroPriced.models.deepseek[0].pricing.free = true;
  const explicitlyFree = mergeCatalogs(
    [{ configKey: "aidy", ...adaptAidy(zeroPriced) }],
    "2026-07-18T00:00:00Z",
  );
  assert.equal(explicitlyFree.models[0].displayPrices.CNY.free, true);

  const freeLiteLlm = structuredClone(litellmFixture);
  freeLiteLlm["deepseek-chat"].is_free = true;
  assert.equal(adaptLiteLlm(freeLiteLlm, "2026-07-18T00:00:00Z").models[0].pricing[0].free, true);

  const freeHub = structuredClone(hubFixture);
  freeHub.entries[0].isFree = true;
  assert.equal(adaptPriceHub(freeHub).models[0].pricing[0].free, true);

  const labeledZero = structuredClone(aidyFixture);
  labeledZero.models.deepseek[0].id = "deepseek-chat-free";
  labeledZero.models.deepseek[0].name = "DeepSeek Chat Free";
  labeledZero.models.deepseek[0].pricing.basePricing = { textInput: 0, textOutput: 0 };
  assert.equal(adaptAidy(labeledZero).models[0].pricing[0].free, true);

  labeledZero.models.deepseek[0].pricing.basePricing.textInput = 1;
  assert.equal(adaptAidy(labeledZero).models[0].pricing[0].free, undefined);

  const substringOnly = structuredClone(aidyFixture);
  substringOnly.models.deepseek[0].id = "freeform-chat";
  substringOnly.models.deepseek[0].pricing.basePricing = { textInput: 0, textOutput: 0 };
  assert.equal(adaptAidy(substringOnly).models[0].pricing[0].free, undefined);
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

test("adapts only AAIndex quality evidence from ai-pricing", () => {
  const catalog = adaptAiPricing(qualityFixture, qualityMeta);
  assert.equal(catalog.qualities.length, 1);
  assert.deepEqual(catalog.qualities[0], {
    canonicalId: "deepseek/deepseek-v4-pro",
    source: "ai-pricing",
    sourceModel: "DeepSeek V4 Pro",
    sourceDeveloper: "DeepSeek",
    aaIndex: 44,
    ...qualityMeta,
  });
  assert.equal(catalog.meta.unmappedCount, 1);
  assert.deepEqual(catalog.meta.unmappedModels, ["Unmapped Future Model"]);
  assert.equal("inputPrice" in catalog.qualities[0], false);
  assert.equal("context" in catalog.qualities[0], false);
});

test("resolves explicit canonical aliases for model and Quality records", () => {
  const aliased = structuredClone(aidyFixture);
  aliased.providers.anthropic = { name: "Anthropic", official: true };
  aliased.providers.poe = { name: "Poe", official: false };
  aliased.models = {
    anthropic: [{ id: "claude-opus-4-8", name: "Claude Opus 4.8", abilities: {} }],
    poe: [{ id: "anthropic/claude-opus-4.8", name: "Claude Opus 4.8", abilities: {} }],
  };
  const catalog = adaptAidy(aliased);
  assert.deepEqual(new Set(catalog.models.map((model) => model.canonicalId)), new Set(["anthropic/claude-opus-4-8"]));
  assert.equal(catalog.models[0].id === catalog.models[1].id, false);

  const quality = adaptAiPricing(
    [{ model: "Claude Opus 4.8", developer: "Anthropic", AAIndex: 56 }],
    qualityMeta,
  );
  assert.equal(quality.qualities[0].canonicalId, "anthropic/claude-opus-4-8");
});

test("automatically merges owner variants and model separator substitutions only", () => {
  const providers = [
    { id: "anthropic", name: "Anthropic", official: true, sourceRefs: [] },
    { id: "poe", name: "Poe", official: false, sourceRefs: [] },
    { id: "xai", name: "xAI", official: true, sourceRefs: [] },
  ];
  const models = [
    {
      id: "anthropic/claude-sonnet-4-6",
      providerId: "anthropic",
      ownerId: "anthropic",
      modelId: "claude-sonnet-4-6",
      canonicalId: "anthropic/claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      sourceRefs: [{ source: "litellm", id: "anthropic/claude-sonnet-4-6" }],
      pricing: [{ official: true }],
    },
    {
      id: "poe/anthropic/claude-sonnet-4.6",
      providerId: "poe",
      ownerId: "anthropic",
      modelId: "anthropic/claude-sonnet-4.6",
      canonicalId: "anthropic/claude-sonnet-4.6",
      name: "Claude Sonnet 4.6",
      sourceRefs: [{ source: "aidy-models", id: "poe/anthropic/claude-sonnet-4.6" }],
      pricing: [{ official: false }],
    },
    {
      id: "poe/qwen3-14b",
      providerId: "poe",
      ownerId: "qwen",
      modelId: "qwen3-14b",
      canonicalId: "qwen/qwen3-14b",
      name: "Qwen 3 14B",
      sourceRefs: [{ source: "aidy-models", id: "poe/qwen3-14b" }],
      pricing: [],
    },
    {
      id: "poe/qwen-3-14b",
      providerId: "poe",
      ownerId: "qwen",
      modelId: "qwen-3-14b",
      canonicalId: "qwen/qwen-3-14b",
      name: "Qwen 3 14B",
      sourceRefs: [{ source: "litellm", id: "poe/qwen-3-14b" }],
      pricing: [],
    },
    {
      id: "poe/claude-opus-48",
      providerId: "poe",
      ownerId: "anthropic",
      modelId: "claude-opus-48",
      canonicalId: "anthropic/claude-opus-48",
      name: "Claude Opus 48",
      sourceRefs: [{ source: "aidy-models", id: "poe/claude-opus-48" }],
      pricing: [],
    },
    {
      id: "poe/claude-opus-4-8",
      providerId: "poe",
      ownerId: "anthropic",
      modelId: "claude-opus-4-8",
      canonicalId: "anthropic/claude-opus-4-8",
      name: "Claude Opus 4.8",
      sourceRefs: [{ source: "litellm", id: "poe/claude-opus-4-8" }],
      pricing: [],
    },
    {
      id: "xai/grok-4.5",
      providerId: "xai",
      ownerId: "xai",
      modelId: "grok-4.5",
      canonicalId: "xai/grok-4.5",
      name: "Grok 4.5",
      sourceRefs: [{ source: "litellm", id: "xai/grok-4.5" }],
      pricing: [{ official: true }],
    },
    {
      id: "poe/x-ai/grok-4.5",
      providerId: "poe",
      ownerId: "x-ai",
      modelId: "x-ai/grok-4.5",
      canonicalId: "x-ai/grok-4.5",
      name: "Grok 4.5",
      sourceRefs: [{ source: "aidy-models", id: "poe/x-ai/grok-4.5" }],
      pricing: [{ official: false }],
    },
  ];

  const aliases = discoverModelAliases(models, providers);
  assert.deepEqual(
    aliases.automatic.map(({ alias, canonicalId }) => ({ alias, canonicalId })),
    [
      { alias: "anthropic/claude-sonnet-4.6", canonicalId: "anthropic/claude-sonnet-4-6" },
      { alias: "x-ai/grok-4.5", canonicalId: "xai/grok-4.5" },
    ],
  );
  assert.deepEqual(aliases.candidates, []);
  assert.equal(
    aliases.automatic.some(
      ({ alias, canonicalId }) =>
        new Set([alias, canonicalId]).has("qwen/qwen3-14b") &&
        new Set([alias, canonicalId]).has("qwen/qwen-3-14b"),
    ),
    false,
  );
  assert.equal(
    aliases.automatic.some(
      ({ alias, canonicalId }) =>
        new Set([alias, canonicalId]).has("anthropic/claude-opus-48") &&
        new Set([alias, canonicalId]).has("anthropic/claude-opus-4-8"),
    ),
    false,
  );
});

test("attaches Quality to every listing with the mapped canonicalId", () => {
  const modelFixture = {
    "deepseek-v4-pro": {
      litellm_provider: "deepseek",
      mode: "chat",
    },
  };
  const database = mergeCatalogs(
    [
      { configKey: "litellm", ...adaptLiteLlm(modelFixture, "2026-07-18T00:00:00Z") },
      { configKey: "aiPricing", ...adaptAiPricing(qualityFixture, qualityMeta) },
    ],
    "2026-07-18T00:00:00Z",
  );

  assert.equal(database.models[0].quality.aaIndex, 44);
  assert.equal(database.models[0].quality.revision, qualityMeta.revision);
  assert.ok(database.models[0].sourceRefs.some((ref) => ref.source === "ai-pricing"));
  assert.equal(database.stats.qualityModels, 1);
  assert.equal(database.stats.qualityListings, 1);
  assert.equal(database.stats.unmatchedQualityModels, 1);
  assert.deepEqual(validateDatabase(database), []);
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

test("ignores Quality observation metadata but detects AAIndex changes", () => {
  const modelFixture = { "deepseek-v4-pro": { litellm_provider: "deepseek", mode: "chat" } };
  const first = mergeCatalogs(
    [
      { configKey: "litellm", ...adaptLiteLlm(modelFixture, "2026-07-18T00:00:00Z") },
      { configKey: "aiPricing", ...adaptAiPricing(qualityFixture, qualityMeta) },
    ],
    "2026-07-18T00:00:00Z",
  );
  const second = mergeCatalogs(
    [
      { configKey: "litellm", ...adaptLiteLlm(modelFixture, "2026-07-19T00:00:00Z") },
      {
        configKey: "aiPricing",
        ...adaptAiPricing(qualityFixture, {
          observedAt: "2026-07-19T00:00:00Z",
          revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      },
    ],
    "2026-07-19T00:00:00Z",
  );

  assert.equal(hasMeaningfulChanges(first, second), false);
  second.models[0].quality.aaIndex = 45;
  assert.equal(hasMeaningfulChanges(first, second), true);
});

test("uses the detected SPDX license and marks a missing license file", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          license: { spdx_id: "NOASSERTION" },
          content: Buffer.from("MIT License\n\nPermission is hereby granted, free of charge").toString("base64"),
          html_url: "https://github.com/example/repo/blob/main/LICENSE",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    assert.deepEqual(await fetchGitHubLicense("https://github.com/example/repo"), {
      license: "MIT",
      licenseLabel: "MIT",
      licenseFile: true,
      licenseUrl: "https://github.com/example/repo/blob/main/LICENSE",
    });

    globalThis.fetch = async () => new Response(null, { status: 404 });
    assert.deepEqual(await fetchGitHubLicense("https://github.com/example/repo"), {
      license: "NOASSERTION",
      licenseLabel: "未标注",
      licenseFile: false,
      licenseUrl: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
