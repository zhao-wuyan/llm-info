import assert from "node:assert/strict";
import test from "node:test";
import { adaptAaIndexFromCatalog, adaptAiderPolyglot, adaptHuggingFace, adaptLmArenaParquet } from "../src/model-index/boards.js";
import { buildModelIndex, validateModelIndex } from "../src/model-index/build.js";
import { canonicalIndexFromCatalog, createModelMatcher, looseKey, normalizeModelKey, ownersCompatible } from "../src/model-index/match.js";
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

const timestampIndexFixture = {
  schemaVersion: 1,
  catalogGeneratedAt: catalogFixture.generatedAt,
  boards: [{
    id: "fixture",
    name: "Fixture",
    homepageUrl: "https://example.com/fixture",
    direction: "higher",
    coverage: { entries: 1, matched: 1, unmatched: 0 },
  }],
  models: {
    "deepseek/deepseek-v4-pro": {
      boards: { fixture: { score: 1 } },
    },
  },
};

test("normalizes model ids into provider-agnostic match keys", () => {
  assert.equal(normalizeModelKey("openrouter/DeepSeek-V4-Pro"), "deepseek-v4-pro");
  assert.equal(normalizeModelKey("Qwen/Qwen3-235B-A22B"), "qwen3-235b-a22b");
  assert.equal(normalizeModelKey("Command R+ (04-2024)"), "command-r-plus-04-2024");
  assert.equal(normalizeModelKey("gpt-4o-mini@2024-07-18"), "gpt-4o-mini");
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

test("uses strict separator-equivalent owners as a hard compatibility gate", () => {
  const matcher = createModelMatcher(canonicalIndexFromCatalog(catalogFixture));
  assert.equal(matcher.match({ id: "deepseek-v4-pro", organization: "antirez" }), null);
  assert.equal(matcher.match({ id: "deepseek-v4-pro", organization: "deepseek-ai", ownerRequired: true, allowLoose: false }), null);
  assert.equal(matcher.match({ id: "deepseek-v4-pro", ownerRequired: true, allowLoose: false }), null);
  assert.equal(ownersCompatible("deepseek", "deepseek-ai"), false);
  assert.equal(ownersCompatible("x-ai", "x_ai"), true);
  assert.equal(ownersCompatible("accounts/fireworks/models", "qwen"), false);
});
 
test("keeps semantic repository variants distinct while score boards strip only effort annotations", () => {
  assert.equal(normalizeModelKey("gpt-5 (high)", "arena"), "gpt-5");
  assert.equal(normalizeModelKey("gpt-5 (thinking budget: 32k tokens)", "coding"), "gpt-5");
  assert.equal(normalizeModelKey("gpt-5 (high)", "popularity"), "gpt-5-high");
  assert.equal(normalizeModelKey("Kimi-K2-Thinking", "arena"), "kimi-k2-thinking");
  // LM Arena parquet 用连字符后缀标注推理强度，score board 剥离尾部 -high/-xhigh
  assert.equal(normalizeModelKey("gpt-5.6-sol-xhigh", "arena"), "gpt-5-6-sol");
  assert.equal(normalizeModelKey("gpt-5-high", "arena"), "gpt-5");
  assert.equal(normalizeModelKey("gpt-5-high", "popularity"), "gpt-5-high");

  const matcher = createModelMatcher([
    { canonicalId: "deepseek-ai/deepseek-llm-67b-chat", ownerId: "deepseek-ai", name: "DeepSeek LLM 67B Chat" },
    { canonicalId: "moonshotai/kimi-k2-thinking", ownerId: "moonshotai", name: "Kimi K2 Thinking" },
  ]);
  assert.equal(
    matcher.match({ id: "deepseek-ai/deepseek-llm-67b-base", organization: "deepseek-ai", kind: "popularity", ownerRequired: true }),
    null,
  );
  assert.equal(
    matcher.match({ id: "moonshotai/Kimi-K2-Instruct", organization: "moonshotai", kind: "popularity", ownerRequired: true }),
    null,
  );
});

test("keeps Hugging Face Base, Instruct, Chat, and Thinking repositories owner-strict", () => {
  const variants = ["base", "instruct", "chat", "thinking"];
  const matcher = createModelMatcher([
    ...variants.map((variant) => ({
      canonicalId: `acme/model-${variant}`,
      ownerId: "acme",
      name: `Model ${variant}`,
    })),
    { canonicalId: "openai/gpt-chat-latest", ownerId: "openai", name: "OpenAI GPT" },
  ]);
  for (const variant of variants) {
    assert.equal(
      matcher.match({
        id: `acme/model-${variant}`,
        organization: "acme",
        kind: "popularity",
        ownerRequired: true,
        allowLoose: false,
      })?.canonicalId,
      `acme/model-${variant}`,
    );
  }
  assert.equal(
    matcher.match({
      id: "openai-community/openai-gpt",
      name: "OpenAI GPT",
      organization: "openai-community",
      kind: "popularity",
      ownerRequired: true,
      allowLoose: false,
    }),
    null,
  );
});

test("rejects incompatible ownership and prefers compatible direct official canonical evidence", () => {
  const catalog = {
    providers: [
      { id: "anthropic", official: true },
      { id: "anth-ropic", official: false },
      { id: "302ai", official: false },
    ],
    models: [
      {
        canonicalId: "302ai/claude-3-5-haiku-20241022", providerId: "302ai", ownerId: "302ai",
        name: "Claude 3.5 Haiku", displayPrices: { USD: { rates: { textInput: 1 } }, CNY: null },
      },
      {
        canonicalId: "anth-ropic/claude-haiku-reseller", providerId: "anth-ropic", ownerId: "anth-ropic",
        name: "Claude 3.5 Haiku", displayPrices: { USD: { rates: { textInput: 1 } }, CNY: null },
      },
      {
        canonicalId: "anthropic/claude-3-5-haiku-20241022", providerId: "anthropic", ownerId: "anthropic",
        name: "Claude 3.5 Haiku", displayPrices: { USD: null, CNY: null },
      },
    ],
  };
  const candidates = canonicalIndexFromCatalog(catalog);
  const matcher = createModelMatcher(candidates);
  assert.equal(candidates.find((model) => model.canonicalId.startsWith("anthropic/"))?.directOfficial, true);
  assert.equal(
    matcher.match({ name: "Claude 3.5 Haiku", organization: "Anthropic", allowLoose: false })?.canonicalId,
    "anthropic/claude-3-5-haiku-20241022",
  );
  assert.equal(matcher.match({ name: "Claude 3.5 Haiku", organization: "unrelated", allowLoose: false }), null);
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
  const arena = adaptLmArenaParquet(
    [
      // 真实小数 rating/lower/upper，断言四舍五入取整（用户要求 Arena Elo 不保留小数）
      { model_name: "DeepSeek V4 Pro", organization: "DeepSeek", license: "MIT", rating: 1470.4, rating_lower: 1464.6, rating_upper: 1475.4, vote_count: 26019, rank: 1, category: "overall", leaderboard_publish_date: "2026-07-27" },
      { model_name: "Unmatched Model", organization: "Nobody", license: "MIT", rating: 1400.5, rating_lower: 1391.2, rating_upper: 1409.8, vote_count: 10, rank: 2, category: "overall", leaderboard_publish_date: "2026-07-27" },
      { model_name: "Skipped Non-Overall", organization: "X", license: "MIT", rating: 1500, rating_lower: 1490, rating_upper: 1510, vote_count: 5, rank: 1, category: "coding", leaderboard_publish_date: "2026-07-27" },
      // vision parquet 的 rank/vote_count 是 BigInt，必须被归一为普通 number，否则 JSON 序列化与比较出错
      { model_name: "Vision BigInt Row", organization: "Y", license: "Proprietary", rating: 1300.49, rating_lower: 1290.5, rating_upper: 1310.3, vote_count: 99n, rank: 3n, category: "overall", leaderboard_publish_date: "2026-07-27" },
    ],
    { boardId: "lmarena-text" },
  );
  assert.equal(arena.entries.length, 3, "only overall rows are kept");
  assert.equal(arena.entries[0].score, 1470, "rating rounds to integer");
  assert.equal(arena.entries[0].metrics.arenaScore, 1470);
  assert.equal(arena.entries[0].metrics.confidenceInterval, "1465-1475", "CI bounds round to integers");
  assert.equal(arena.entries[0].metrics.votes, 26019);
  assert.equal(arena.entries[0].sourceModel, "DeepSeek V4 Pro");
  assert.equal(typeof arena.entries[2].metrics.votes, "number", "BigInt vote_count becomes number");
  assert.equal(arena.entries[2].metrics.votes, 99);
  assert.equal(typeof arena.entries[2].rank, "number", "BigInt rank becomes number");
  assert.equal(arena.entries[2].rank, 3);
  assert.doesNotThrow(() => JSON.stringify(arena.entries), "all entries are JSON-serializable");

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
  const arena = adaptLmArenaParquet(
    [
      { model_name: "DeepSeek V4 Pro", organization: "DeepSeek", license: "MIT", rating: 1470, rating_lower: 1465, rating_upper: 1475, vote_count: 26019, rank: 1, category: "overall", leaderboard_publish_date: "2026-07-27" },
      { model_name: "Nonexistent Model", organization: "Nobody", license: "MIT", rating: 1400, rating_lower: 1391, rating_upper: 1409, vote_count: 10, rank: 2, category: "overall", leaderboard_publish_date: "2026-07-27" },
    ],
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

  assert.deepEqual(validateModelIndex(index, catalogFixture), []);
  assert.equal(index.models["deepseek/deepseek-v4-pro"].boards["lmarena-text"].score, 1470);
  assert.equal(index.models["deepseek/deepseek-v4-pro"].boards.aaindex.score, 51);
  assert.equal(index.models["qwen/qwen3-235b-a22b"], undefined, "models without any board stay out of the index");
  assert.deepEqual(index.unmapped["lmarena-text"], ["Nonexistent Model"]);
  assert.equal(index.boards[1].coverage.matched, 1);
  assert.equal(index.boards[1].revision, "b".repeat(40));
});

test("accepts an index generated from the exact catalog timestamp", () => {
  assert.deepEqual(validateModelIndex(timestampIndexFixture, catalogFixture), []);
});

test("rejects a one-character catalog timestamp mismatch", () => {
  const errors = validateModelIndex(timestampIndexFixture, {
    ...catalogFixture,
    generatedAt: "2026-07-29T00:00:01Z",
  });
  assert.deepEqual(errors, ["catalogGeneratedAt must exactly match catalog.generatedAt"]);
});

test("rejects missing catalog and generatedAt timestamps", () => {
  assert.ok(validateModelIndex(timestampIndexFixture).includes("catalog.generatedAt must be a non-empty string"));
  assert.ok(validateModelIndex(timestampIndexFixture, {}).includes("catalog.generatedAt must be a non-empty string"));
  assert.ok(
    validateModelIndex({ ...timestampIndexFixture, catalogGeneratedAt: undefined }, catalogFixture)
      .includes("catalogGeneratedAt must be a non-empty string"),
  );
});


test("converges score-board effort variants and retains the maximum score source", () => {
  const catalog = {
    generatedAt: "2026-07-29T00:00:00Z",
    providers: [{ id: "openai", official: true }],
    models: [{
      canonicalId: "openai/gpt-5", providerId: "openai", ownerId: "openai", name: "GPT-5",
      displayPrices: { USD: null, CNY: null },
    }],
  };
  const entries = [
    ["gpt-5", 100],
    ["gpt-5 (high)", 130],
    ["gpt-5 (medium)", 120],
    ["gpt-5 (low)", 90],
    ["gpt-5 (xhigh)", 150],
    ["gpt-5-high", 140],
    ["gpt-5-xhigh", 160],
  ].map(([sourceModel, score], index) => ({
    sourceModel,
    organization: "OpenAI",
    score,
    rank: index + 1,
    metrics: { arenaScore: score },
  }));
  const index = buildModelIndex({
    catalog,
    generatedAt: "2026-07-29T10:00:00Z",
    boards: [{
      config: {
        id: "effort", name: "Effort", kind: "arena", direction: "higher",
        homepageUrl: "https://example.com/effort",
      },
      entries,
    }],
  });

  assert.equal(index.unmapped.effort, undefined);
  assert.deepEqual(index.boards[0].coverage, { entries: 7, matched: 7, unmatched: 0 });
  assert.deepEqual(index.models["openai/gpt-5"].boards.effort, {
    score: 160,
    rank: 7,
    metrics: { arenaScore: 160 },
    sourceModel: "gpt-5-xhigh",
    sourceUrl: null,
    match: "exact",
  });
});

test("strips trailing effort suffix so an arena `gpt-5-high` row maps onto the base canonical", () => {
  // 当前 catalog 不含 openai/gpt-5-high 独立 canonical；-high/-xhigh 对 Arena 是 effort annotation。
  // 若将来引入 *-high 独立 canonical，score-board 剥离规则需重新评估（见 stripScoreAnnotations）。
  const matcher = createModelMatcher([
    { canonicalId: "openai/gpt-5", ownerId: "openai", name: "GPT-5" },
  ]);
  assert.equal(
    matcher.match({ id: "gpt-5-high", organization: "openai", kind: "arena" })?.canonicalId,
    "openai/gpt-5",
  );
  assert.equal(
    matcher.match({ id: "gpt-5-xhigh", organization: "openai", kind: "arena" })?.canonicalId,
    "openai/gpt-5",
  );
});

test("rejects an index whose board reference or direction is broken", () => {
  const broken = {
    schemaVersion: 1,
    catalogGeneratedAt: catalogFixture.generatedAt,
    boards: [{ id: "x", name: "X", homepageUrl: "https://example.com", direction: "sideways", coverage: { entries: 1, matched: 1, unmatched: 0 } }],
    models: { "a/b": { boards: { missing: { score: 1 } } } },
  };
  const errors = validateModelIndex(broken, catalogFixture);
  assert.ok(errors.some((error) => error.includes("direction")));
  assert.ok(errors.some((error) => error.includes("unknown board")));
});

test("rejects malformed board coverage", () => {
  const broken = {
    ...timestampIndexFixture,
    boards: [{
      ...timestampIndexFixture.boards[0],
      coverage: { entries: Infinity, matched: 1.5, unmatched: -1 },
    }],
  };
  assert.deepEqual(validateModelIndex(broken, catalogFixture), [
    "board fixture coverage.entries must be a finite nonnegative integer",
    "board fixture coverage.matched must be a finite nonnegative integer",
    "board fixture coverage.unmatched must be a finite nonnegative integer",
  ]);
  const inconsistent = {
    ...timestampIndexFixture,
    boards: [{
      ...timestampIndexFixture.boards[0],
      coverage: { entries: 2, matched: 1, unmatched: 0 },
    }],
  };
  assert.deepEqual(validateModelIndex(inconsistent, catalogFixture), [
    "board fixture coverage.entries must equal coverage.matched + coverage.unmatched",
  ]);
});
