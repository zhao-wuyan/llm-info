import { canonicalIndexFromCatalog, createModelMatcher } from "./match.js";

export const MODEL_INDEX_SCHEMA_VERSION = 1;

/**
 * Merge every board's provider-agnostic entries onto canonicalIds.
 * `boards`: [{ config, entries, provenance }]
 */
export function buildModelIndex({ catalog, boards, generatedAt }) {
  const matcher = createModelMatcher(canonicalIndexFromCatalog(catalog));
  const models = new Map();
  const boardMeta = [];
  const unmapped = {};

  for (const board of boards) {
    const { config, entries, provenance = {} } = board;
    let matched = 0;
    const missing = [];
    for (const entry of entries) {
      const hit = matcher.match({
        id: entry.sourceModel,
        name: entry.sourceModel,
        organization: entry.organization,
        ...(config.match ?? {}),
      });
      if (!hit) {
        missing.push(entry.sourceModel);
        continue;
      }
      const record = models.get(hit.canonicalId) ?? { boards: {} };
      if (record.boards[config.id] && record.boards[config.id].score >= (entry.score ?? -Infinity)) {
        models.set(hit.canonicalId, record);
        continue;
      }
      record.boards[config.id] = {
        score: entry.score ?? null,
        rank: entry.rank ?? null,
        metrics: entry.metrics ?? {},
        sourceModel: entry.sourceModel,
        sourceUrl: entry.sourceUrl ?? null,
        match: hit.confidence,
      };
      if (entry.facts) {
        record.openWeights = {
          ...record.openWeights,
          ...entry.facts,
          popularity: {
            downloads30d: entry.metrics?.downloads30d ?? null,
            downloadsAllTime: entry.metrics?.downloadsAllTime ?? null,
            likes: entry.metrics?.likes ?? null,
            trendingScore: entry.metrics?.trendingScore ?? null,
          },
        };
      }
      models.set(hit.canonicalId, record);
      matched += 1;
    }
    boardMeta.push({
      ...config,
      ...provenance,
      coverage: { entries: entries.length, matched, unmatched: missing.length },
    });
    if (missing.length) unmapped[config.id] = missing.slice(0, 200);
  }

  const sortedModels = Object.fromEntries([...models.entries()].sort(([left], [right]) => left.localeCompare(right)));
  return {
    schemaVersion: MODEL_INDEX_SCHEMA_VERSION,
    generatedAt,
    catalogGeneratedAt: catalog.generatedAt ?? null,
    boards: boardMeta,
    models: sortedModels,
    unmapped,
    stats: {
      boards: boardMeta.length,
      indexedModels: Object.keys(sortedModels).length,
      openWeightModels: Object.values(sortedModels).filter((model) => model.openWeights).length,
      boardScores: Object.values(sortedModels).reduce((total, model) => total + Object.keys(model.boards).length, 0),
    },
  };
}

export function validateModelIndex(index) {
  const errors = [];
  if (index?.schemaVersion !== MODEL_INDEX_SCHEMA_VERSION) errors.push("schemaVersion must be 1");
  if (!Array.isArray(index?.boards) || index.boards.length === 0) errors.push("boards must be a non-empty array");
  if (!index?.models || typeof index.models !== "object") errors.push("models must be an object");
  if (errors.length) return errors;

  const boardIds = new Set();
  for (const board of index.boards) {
    if (!board.id || boardIds.has(board.id)) errors.push(`invalid or duplicate board id: ${board.id}`);
    boardIds.add(board.id);
    if (!board.name || !board.homepageUrl) errors.push(`board ${board.id} is missing name or homepageUrl`);
    if (!["higher", "lower"].includes(board.direction)) errors.push(`board ${board.id} has an invalid direction`);
    if (board.coverage?.matched === 0) errors.push(`board ${board.id} matched zero models`);
  }
  for (const [canonicalId, record] of Object.entries(index.models)) {
    for (const [boardId, score] of Object.entries(record.boards ?? {})) {
      if (!boardIds.has(boardId)) errors.push(`${canonicalId} references unknown board ${boardId}`);
      if (score.score != null && !Number.isFinite(score.score)) errors.push(`${canonicalId}/${boardId} has a non-numeric score`);
    }
    if (record.openWeights && !record.openWeights.repoId) errors.push(`${canonicalId} open-weight facts are missing repoId`);
  }
  return errors;
}
