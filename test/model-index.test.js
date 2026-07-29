import assert from "node:assert/strict";
import test from "node:test";
import { adaptAaIndexFromCatalog, adaptAiderPolyglot, adaptHuggingFace, adaptLmArenaCsv } from "../src/model-index/boards.js";
import { buildModelIndex, validateModelIndex } from "../src/model-index/build.js";
import { canonicalIndexFromCatalog, createModelMatcher, looseKey, matchKey, ownersCompatible } from "../src/model-index/match.js";
import { parseCsv, parseFlatYamlList } from "../src/model-index/parse.js";

const catalogFixture = {
  generatedAt: "2026-07-29T00:00:00Z",
  sources: [{ id: "ai-pricing", revision: "a".repeat(40), observedAt: "2026-07-28T00:00:00Z" }],
  models: [
    {
      id: "deepseek/deepseek-v4-pro", providerId: "deepseek", ownerId: "deepseek", modelId: "deepseek-v4-pro",
      canonicalId: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", sourceRefs: [], pricing: [],
      displayPrices: { USD: { rates: { textInput: 1 } }, CNY: null },
      quality: { source: "ai-pricing", sourceModel: "DeepSeek V4 Pro", sourceDeveloper: "DeepSeek", aaIndex: 51, observedAt: null, revision: "a".repeat(40) },
    },
    {
      id: "openrouter/deepseek-v4-pro", providerId: "openrouter", ownerId: "deepseek", modelId: "deepseek-v4-pro",
      canonicalId: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro", sourceRefs: [], pricing: [], displayPrices: { USD: null, CNY: null },
    },
    {
      id: "qwen/qwen3-235b-a22b", providerId: "qwen", ownerId: "qwen", modelId: "qwen3-235b-a22b",
      canonicalId: "qwen/qwen3-235b-a22b", name: "Qwen3 235B A22B", sourceRefs: [], pricing: [], displayPrices: { USD: null, CNY: null },
    },
    {
      id: "mistral/ministral-8b-2512", providerId: "mistral", ownerId: "mistral", modelId: "ministral-8b-2512",
      canonicalId: "mistral/ministral-8b-2512", name: "Ministral 8B 2512", sourceRefs: [], pricing: [], displayPrices: { USD: null, CNY: null },
    },
    {
      id: "cohere/command-r-plus", providerId: "cohere", ownerId: "cohere", modelId: "command-r-plus",
      canonicalId: "cohere/command-r-plus", name: "Command R+", sourceRefs: [], pricing: [], displayPrices: { USD: null, CNY: null },
    },
    {
      id: "cohere/command-r", providerId: "cohere", ownerId: "cohere", modelId: "command-r",
      canonicalId: "cohere/command-r", name: "Command R", sourceRefs: [], pricing: [], displayPrices: { USD: null, CNY: null },
    },
  ],
};

test("normalizes model ids into provider-agnostic match keys", () => {
  assert.equal(matchKey("openrouter/DeepSeek-V4-Pro"), "deepseek-v4-pro");
  assert.equal(matchKey("Qwen/Qwen3-235B-A22B"), "qwen3-235b-a22b");
  assert.equal(matchKey("Command R+ (04-2024)"), "command-r-plus-04-2024");
  assert.equal(matchKey("gpt-4o-mini@2024-07-18"), "gpt-4o-mini");
  assert.equal(looseKey("Command R+ (04-2024)"), "command-r-plus");
  assert.equal(looseKey("Grok-2-08-13"), "grok-2");
});

test("matches upstream rows onto canonicalIds regardless of provider", () => {
  const matcher = createModelMatcher(canonicalIndexFromCatalog(catalogFixture));
  assert.equal(matcher.match({ id: "DeepSeek-V4-Pro" })?.canonicalId, "deepseek/deepseek-v4-pro");
  assert.equal(matcher.match({ id: "openrouter/deepseek-v4-pro" })?.canonicalId, "deepseek/deepseek-v4-pro");
  assert.equal(matcher.match({ id: "totally-unknown-model" }), null);
});

test("keeps date-stamped upstream rows off a different stamped canonicalId", () => {
  const matcher = createModelMatcher(canonicalIndexFromCatalog(catalogFixture));
  assert.equal(matcher.match({ id: "Ministral-8B-2410" }), null);
  assert.equal(matcher.match({ id: "Command R+ (04-2024)" })?.canonicalId, "cohere/command-r-plus");
});

test("requires a compatible owner when the board demands it", () => {
  const matcher = createModelMatcher(canonicalIndexFromCatalog(catalogFixture));
  assert.equal(matcher.match({ id: "antirez/deepseek-v4-pro", organization: "antirez", ownerRequired: true, allowLoose: false }), null);
  assert.equal(
    matcher.match({ id: "deepseek-ai/deepseek-v4-pro", organization: "deepseek-ai", ownerRequired: true, allowLoose: false })?.canonicalId,
    "deepseek/deepseek-v4-pro",
  );
  assert.equal(ownersCompatible("deepseek", "deepseek-ai"), true);
  assert.equal(ownersCompatible("accounts/fireworks/models", "qwen"), false);
});

test("parses quoted CSV rows and the flat Aider YAML layout", () => {
  const rows = parseCsv('rank,model,arena_score\n1,"Gemini, Pro",1470\n2,GLM-5.2,1434\n');
  assert.deepEqual(rows, [
    { rank: "1", model: "Gemini, Pro", arena_score: "1470" },
    { rank: "2", model: "GLM-5.2", arena_score: "1434" },
  ]);
  const records = parseFlatYamlList("- model: X\n  pass_rate_2: 61.7\n  edit_format: diff\n- model: Y\n  pass_rate_2: 50\n");
  assert.deepEqual(records, [
    { model: "X", pass_rate_2: 61.7, edit_format: "diff" },
    { model: "Y", pass_rate_2: 50 },
  ]);
});

test("adapts arena, aider, hugging face, and AAIndex payloads", () => {
  const arena = adaptLmArenaCsv(
    "rank,model,arena_score,votes,95_pct_ci,organization,license\n1,DeepSeek V4 Pro,1470,26019,+5/-5,DeepSeek,MIT\n2,Unmatched Model,1400,10,+9/-9,Nobody,MIT\n",
    { boardId: "lmarena-text" },
  );
  assert.equal(arena.entries.length, 2);
  assert.equal(arena.entries[0].metrics.votes, 26019);

  const aider = adaptAiderPolyglot("- model: DeepSeek V4 Pro\n  pass_rate_2: 40\n- model: DeepSeek V4 Pro\n  pass_rate_2: 61.7\n", { boardId: "aider-polyglot" });
  assert.equal(aider.entries.length, 1, "keeps the best run per model");
  assert.equal(aider.entries[0].score, 61.7);

  const huggingFace = adaptHuggingFace(
    [
      { id: "Qwen/Qwen3-235B-A22B", author: "Qwen", downloads: 784414, likes: 1102, safetensors: { total: 235093634560 }, cardData: { license: "apache-2.0" }, tags: [] },
      { id: "unsloth/Qwen3-235B-A22B-GGUF", author: "unsloth", downloads: 999999, tags: ["license:apache-2.0"] },
    ],
    { boardId: "hf-downloads" },
  );
  assert.equal(huggingFace.entries.length, 1, "skips derivative quantization repositories");
  assert.equal(huggingFace.entries[0].facts.license, "apache-2.0");

  const aaIndex = adaptAaIndexFromCatalog(catalogFixture, { boardId: "aaindex" });
  assert.deepEqual(aaIndex.entries.map((entry) => entry.score), [51]);
});

test("builds a validated index keyed by canonicalId with blank cells for missing boards", () => {
  const arena = adaptLmArenaCsv(
    "rank,model,arena_score,votes,organization\n1,DeepSeek V4 Pro,1470,26019,DeepSeek\n2,Nonexistent Model,1400,10,Nobody\n",
    { boardId: "lmarena-text" },
  );
  const index = buildModelIndex({
    catalog: catalogFixture,
    generatedAt: "2026-07-29T10:00:00Z",
    boards: [
      { config: { id: "aaindex", name: "AAIndex", direction: "higher", homepageUrl: "https://example.com/aa" }, ...adaptAaIndexFromCatalog(catalogFixture, { boardId: "aaindex" }) },
      { config: { id: "lmarena-text", name: "LMArena", direction: "higher", homepageUrl: "https://lmarena.ai/leaderboard" }, ...arena, provenance: { revision: "b".repeat(40) } },
    ],
  });

  assert.deepEqual(validateModelIndex(index), []);
  assert.equal(index.models["deepseek/deepseek-v4-pro"].boards["lmarena-text"].score, 1470);
  assert.equal(index.models["deepseek/deepseek-v4-pro"].boards.aaindex.score, 51);
  assert.equal(index.models["qwen/qwen3-235b-a22b"], undefined, "models without any board stay out of the index");
  assert.deepEqual(index.unmapped["lmarena-text"], ["Nonexistent Model"]);
  assert.equal(index.boards[1].coverage.matched, 1);
  assert.equal(index.boards[1].revision, "b".repeat(40));
});

test("rejects an index whose board reference or direction is broken", () => {
  const broken = {
    schemaVersion: 1,
    boards: [{ id: "x", name: "X", homepageUrl: "https://example.com", direction: "sideways", coverage: { matched: 1 } }],
    models: { "a/b": { boards: { missing: { score: 1 } } } },
  };
  const errors = validateModelIndex(broken);
  assert.ok(errors.some((error) => error.includes("direction")));
  assert.ok(errors.some((error) => error.includes("unknown board")));
});
