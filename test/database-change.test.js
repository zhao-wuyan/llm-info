import assert from "node:assert/strict";
import test from "node:test";
import { renderChangeSummaryMarkdown, summarizeDatabaseChanges } from "../src/database-change.js";

function model(id, overrides = {}) {
  return {
    id,
    canonicalId: id,
    name: id,
    pricing: [],
    displayPrices: { USD: null, CNY: null },
    sourceRefs: [],
    ...overrides,
  };
}

function database(models, providers = []) {
  return {
    stats: { quotes: models.reduce((total, item) => total + item.pricing.length, 0) },
    models,
    providers,
  };
}

test("summarizes canonical model, price, quality, and provider changes", () => {
  const previous = database(
    [
      model("openai/gpt-a", { pricing: [{ id: "usd", rates: { textInput: 1 }, observedAt: "old" }] }),
      model("anthropic/claude-old"),
      model("quality/model", { quality: { aaIndex: 40, observedAt: "old", revision: "old" } }),
    ],
    [{ id: "openai" }],
  );
  const current = database(
    [
      model("openai/gpt-a", { pricing: [{ id: "usd", rates: { textInput: 2 }, observedAt: "new" }] }),
      model("google/gemini-new"),
      model("quality/model", { quality: { aaIndex: 41, observedAt: "new", revision: "new" } }),
    ],
    [{ id: "openai" }, { id: "google" }],
  );

  const summary = summarizeDatabaseChanges(previous, current);
  assert.deepEqual(summary.addedModels, ["google/gemini-new"]);
  assert.deepEqual(summary.removedModels, ["anthropic/claude-old"]);
  assert.deepEqual(summary.priceChangedModels, ["openai/gpt-a"]);
  assert.deepEqual(summary.qualityChangedModels, ["quality/model"]);
  assert.deepEqual(summary.addedProviders, ["google"]);
});

test("ignores volatile observations and caps markdown item lists", () => {
  const previousModels = Array.from({ length: 25 }, (_, index) =>
    model(`owner/model-${index}`, { pricing: [{ id: `price-${index}`, rates: { textInput: 1 }, observedAt: "old" }] }),
  );
  const currentModels = previousModels.map((item) => ({
    ...item,
    pricing: item.pricing.map((price) => ({ ...price, rates: { textInput: 2 }, observedAt: "new" })),
  }));
  const summary = summarizeDatabaseChanges(database(previousModels), database(currentModels), {
    bulkCount: 500,
    bulkRatio: 2,
  });
  const markdown = renderChangeSummaryMarkdown(summary, { limit: 20 });

  assert.equal(summary.priceChangedModels.length, 25);
  assert.match(markdown, /价格变动（25）/);
  assert.match(markdown, /另有 5 条未展开/);
  assert.doesNotMatch(markdown, /owner\/model-9`/);
});

test("blocks auto merge when affected models cross a bulk threshold", () => {
  const previous = database(Array.from({ length: 100 }, (_, index) => model(`owner/model-${index}`)));
  const current = database([
    ...previous.models,
    ...Array.from({ length: 6 }, (_, index) => model(`owner/new-${index}`)),
  ]);
  const summary = summarizeDatabaseChanges(previous, current, { bulkCount: 500, bulkRatio: 0.05 });

  assert.equal(summary.bulkChange, true);
  assert.match(renderChangeSummaryMarkdown(summary), /已禁止自动合并/);
});
