import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
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

test("report CLI includes non-blocking coverage warnings in the shared summary", async (t) => {
  const run = promisify(execFile);
  const script = fileURLToPath(new URL("../scripts/report-model-changes.js", import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), "model-change-summary-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "data"));
  const current = {
    ...database([model("owner/current")]),
    sources: [{ id: "ai-pricing", unmappedCount: 1, unmappedModels: ["Future Quality Model"] }],
    stats: { quotes: 0, unmatchedQualityModels: 1 },
  };
  const index = {
    boards: [{ id: "arena", name: "Arena", coverage: { entries: 1, matched: 0, unmatched: 1 } }],
    models: {},
    unmapped: { arena: ["Future Arena Model"] },
  };
  await writeFile(join(directory, "data/models.json"), JSON.stringify(current));
  await writeFile(join(directory, "data/model-index.json"), JSON.stringify(index));
  await writeFile(join(directory, "custom-index.json"), JSON.stringify(index));

  for (const args of [[], ["--index", "custom-index.json"]]) {
    const { stdout } = await run(process.execPath, [script, ...args, "--github-output", "github-output"], { cwd: directory });
    const markdown = await readFile(join(directory, "model-update-summary.md"), "utf8");
    const outputs = await readFile(join(directory, "github-output"), "utf8");
    assert.equal(stdout.trim(), markdown.trim());
    assert.match(markdown, /外部榜单覆盖告警/);
    assert.match(markdown, /0\/1 matched/);
    assert.match(markdown, /Future Arena Model/);
    assert.match(markdown, /Quality coverage: 1 unmatched/);
    assert.match(markdown, /Future Quality Model/);
    assert.match(outputs, /bulk_change=false/);
    assert.ok(outputs.includes(`summary_path=${join(directory, "model-update-summary.md")}`));
  }

  await writeFile(join(directory, "complete-index.json"), JSON.stringify({
    boards: [{ id: "arena", coverage: { entries: 1, matched: 1, unmatched: 0 } }],
    unmapped: {},
  }));
  await writeFile(join(directory, "data/models.json"), JSON.stringify(database([model("owner/current")])));
  await run(process.execPath, [script, "--index", "complete-index.json", "--github-output", "github-output"], { cwd: directory });
  assert.doesNotMatch(await readFile(join(directory, "model-update-summary.md"), "utf8"), /外部榜单覆盖告警/);

  await assert.rejects(
    run(process.execPath, [script, "--index", "missing-index.json"], { cwd: directory }),
    /ENOENT/,
  );
  await writeFile(join(directory, "invalid-index.json"), "not JSON");
  await assert.rejects(
    run(process.execPath, [script, "--index", "invalid-index.json"], { cwd: directory }),
    /SyntaxError/,
  );
});
