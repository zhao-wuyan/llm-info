function withoutVolatileMetadata(database) {
  const comparable = structuredClone(database);
  comparable.generatedAt = null;

  for (const source of comparable.sources || []) {
    source.observedAt = null;
    if ("revision" in source) source.revision = null;
    if ("licenseCheckedAt" in source) source.licenseCheckedAt = null;
  }
  for (const model of comparable.models || []) {
    for (const price of model.pricing || []) price.observedAt = null;
    if (model.quality) {
      model.quality.observedAt = null;
      model.quality.revision = null;
    }
  }
  return comparable;
}

export function hasMeaningfulChanges(previous, current) {
  return JSON.stringify(withoutVolatileMetadata(previous)) !== JSON.stringify(withoutVolatileMetadata(current));
}

const DEFAULT_SUMMARY_LIMIT = 20;
const DEFAULT_BULK_COUNT = 500;
const DEFAULT_BULK_RATIO = 0.05;

function indexBy(items, key) {
  return new Map((items || []).map((item) => [item[key], item]));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function changedKeys(previous, current, project = (value) => value) {
  const previousById = indexBy(previous, "id");
  const currentById = indexBy(current, "id");
  return uniqueSorted(
    [...currentById.keys()].filter(
      (id) =>
        previousById.has(id) &&
        JSON.stringify(project(previousById.get(id))) !== JSON.stringify(project(currentById.get(id))),
    ),
  );
}

function stablePricing(model) {
  return (model.pricing || []).map(({ observedAt: _observedAt, ...price }) => price);
}

function stableQuality(model) {
  if (!model.quality) return null;
  const { observedAt: _observedAt, revision: _revision, ...quality } = model.quality;
  return quality;
}

function modelMetadata(model) {
  const { pricing: _pricing, displayPrices: _displayPrices, quality: _quality, sourceRefs: _sourceRefs, ...metadata } = model;
  return metadata;
}

function canonicalIds(models) {
  return uniqueSorted((models || []).map((model) => model.canonicalId));
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function canonicalIdsForListings(ids, modelsById) {
  return uniqueSorted(ids.map((id) => modelsById.get(id)?.canonicalId).filter(Boolean));
}

export function summarizeDatabaseChanges(
  previous,
  current,
  { bulkCount = DEFAULT_BULK_COUNT, bulkRatio = DEFAULT_BULK_RATIO } = {},
) {
  const previousModels = previous.models || [];
  const currentModels = current.models || [];
  const previousById = indexBy(previousModels, "id");
  const currentById = indexBy(currentModels, "id");
  const previousCanonicalIds = canonicalIds(previousModels);
  const currentCanonicalIds = canonicalIds(currentModels);
  const previousListingIds = uniqueSorted(previousModels.map((model) => model.id));
  const currentListingIds = uniqueSorted(currentModels.map((model) => model.id));
  const addedListingIds = difference(currentListingIds, previousListingIds);
  const removedListingIds = difference(previousListingIds, currentListingIds);
  const priceChangedListingIds = changedKeys(previousModels, currentModels, (model) => stablePricing(model));
  const qualityChangedListingIds = changedKeys(previousModels, currentModels, stableQuality);
  const metadataChangedListingIds = changedKeys(previousModels, currentModels, modelMetadata);
  const addedModels = difference(currentCanonicalIds, previousCanonicalIds);
  const removedModels = difference(previousCanonicalIds, currentCanonicalIds);
  const priceChangedModels = canonicalIdsForListings(priceChangedListingIds, currentById);
  const qualityChangedModels = canonicalIdsForListings(qualityChangedListingIds, currentById);
  const metadataChangedModels = canonicalIdsForListings(metadataChangedListingIds, currentById);
  const affectedModels = uniqueSorted([
    ...addedModels,
    ...removedModels,
    ...priceChangedModels,
    ...qualityChangedModels,
    ...metadataChangedModels,
  ]);
  const baseline = Math.max(previousCanonicalIds.length, 1);
  const affectedRatio = affectedModels.length / baseline;

  return {
    before: {
      canonicalModels: previousCanonicalIds.length,
      listings: previousModels.length,
      providers: previous.providers?.length || 0,
      quotes: previous.stats?.quotes || previousModels.reduce((total, model) => total + (model.pricing?.length || 0), 0),
    },
    after: {
      canonicalModels: currentCanonicalIds.length,
      listings: currentModels.length,
      providers: current.providers?.length || 0,
      quotes: current.stats?.quotes || currentModels.reduce((total, model) => total + (model.pricing?.length || 0), 0),
    },
    addedModels,
    removedModels,
    priceChangedModels,
    qualityChangedModels,
    metadataChangedModels,
    addedListings: canonicalIdsForListings(addedListingIds, currentById),
    removedListings: canonicalIdsForListings(removedListingIds, previousById),
    addedProviders: difference(
      uniqueSorted((current.providers || []).map((provider) => provider.id)),
      uniqueSorted((previous.providers || []).map((provider) => provider.id)),
    ),
    removedProviders: difference(
      uniqueSorted((previous.providers || []).map((provider) => provider.id)),
      uniqueSorted((current.providers || []).map((provider) => provider.id)),
    ),
    affectedModels,
    affectedRatio,
    bulkChange: affectedModels.length >= bulkCount || affectedRatio >= bulkRatio,
    bulkThresholds: { count: bulkCount, ratio: bulkRatio },
  };
}

function delta(before, after) {
  const value = after - before;
  return value > 0 ? `+${value}` : `${value}`;
}

function markdownList(title, values, limit) {
  if (values.length === 0) return [`### ${title}（0）`, "", "无。"];
  const lines = [`### ${title}（${values.length}）`, "", ...values.slice(0, limit).map((value) => `- \`${value}\``)];
  if (values.length > limit) lines.push(`- 另有 ${values.length - limit} 条未展开。`);
  return lines;
}

export function renderChangeSummaryMarkdown(summary, { limit = DEFAULT_SUMMARY_LIMIT } = {}) {
  const lines = [
    "## 数据更新摘要",
    "",
    "自动汇总 LiteLLM、aidy-models、model-price-hub 和 ai-pricing 的最新模型、价格与 Quality 数据。",
    "",
    "| 指标 | 更新前 | 更新后 | 变化 |",
    "| --- | ---: | ---: | ---: |",
    `| 模型数（canonical） | ${summary.before.canonicalModels} | ${summary.after.canonicalModels} | ${delta(summary.before.canonicalModels, summary.after.canonicalModels)} |`,
    `| 渠道 listing | ${summary.before.listings} | ${summary.after.listings} | ${delta(summary.before.listings, summary.after.listings)} |`,
    `| 供应商 | ${summary.before.providers} | ${summary.after.providers} | ${delta(summary.before.providers, summary.after.providers)} |`,
    `| 报价记录 | ${summary.before.quotes} | ${summary.after.quotes} | ${delta(summary.before.quotes, summary.after.quotes)} |`,
    "",
    `受影响模型：${summary.affectedModels.length}（${(summary.affectedRatio * 100).toFixed(2)}%）。`,
    "",
  ];

  if (summary.bulkChange) {
    lines.push(
      `> [!WARNING]`,
      `> 本次达到大批量变动阈值（至少 ${summary.bulkThresholds.count} 个模型或 ${(summary.bulkThresholds.ratio * 100).toFixed(0)}%），已禁止自动合并，请人工检查。`,
      "",
    );
  } else {
    lines.push("> 本次未达到大批量变动阈值，校验通过后将自动合并。", "");
  }

  const sections = [
    ["新增模型", summary.addedModels],
    ["移除模型", summary.removedModels],
    ["价格变动", summary.priceChangedModels],
    ["Quality 变动", summary.qualityChangedModels],
    ["其他模型字段变动", summary.metadataChangedModels],
    ["新增供应商", summary.addedProviders],
    ["移除供应商", summary.removedProviders],
  ];
  for (const [title, values] of sections) lines.push(...markdownList(title, values, limit), "");
  lines.push(
    `每类最多展示 ${limit} 条；完整内容可在 PR 的 Files changed 中查看。`,
    "",
    "已执行：",
    "",
    "- `npm test`",
    "- `npm run generate`",
    "- `npm run validate`",
  );
  return `${lines.join("\n")}\n`;
}
