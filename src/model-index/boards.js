import { numberOrNull, parseCsv, parseFlatYamlList } from "./parse.js";

/**
 * Board adapters turn a raw upstream payload into `{ entries, unmapped }`.
 * Every entry is provider-agnostic: it only carries a model id / display name / owner hint,
 * and the matcher maps it onto a canonicalId later.
 */

export function adaptLmArenaCsv(text, { boardId }) {
  const rows = parseCsv(text);
  const entries = [];
  for (const row of rows) {
    const score = numberOrNull(row.arena_score);
    if (!row.model || score === null) continue;
    entries.push({
      boardId,
      sourceModel: row.model,
      organization: row.organization || null,
      score,
      rank: numberOrNull(row.rank),
      metrics: {
        arenaScore: score,
        votes: numberOrNull(row.votes),
        confidenceInterval: row["95_pct_ci"] || null,
        styleControlRank: numberOrNull(row.rank_stylectrl),
      },
      sourceLicense: row.license || null,
      sourceUrl: row.url || null,
    });
  }
  return { entries };
}

export function adaptAiderPolyglot(text, { boardId }) {
  const records = parseFlatYamlList(text);
  const best = new Map();
  for (const record of records) {
    const score = numberOrNull(record.pass_rate_2 ?? record.pass_rate_1);
    if (!record.model || score === null) continue;
    const key = String(record.model);
    const previous = best.get(key);
    if (previous && previous.score >= score) continue;
    best.set(key, {
      boardId,
      sourceModel: key,
      organization: null,
      score,
      rank: null,
      metrics: {
        passRate: score,
        wellFormed: numberOrNull(record.percent_cases_well_formed),
        testCases: numberOrNull(record.test_cases),
        editFormat: record.edit_format ?? null,
      },
    });
  }
  const entries = [...best.values()].sort((left, right) => right.score - left.score);
  entries.forEach((entry, index) => { entry.rank = index + 1; });
  return { entries };
}

/** Aggregate Hugging Face Hub repositories into open-weight facts + a popularity board. */
const DERIVATIVE_REPO = /(?:gguf|awq|gptq|mlx|exl2|bnb|nf4|-(?:int|fp)[48]\b|-[48]bit|quantized|imatrix|-abliterated|-uncensored)/i;

export function adaptHuggingFace(repositories, { boardId }) {
  const entries = [];
  for (const repository of repositories) {
    if (DERIVATIVE_REPO.test(String(repository.id))) continue;
    const parameters = repository.safetensors?.total ?? null;
    const license = repository.cardData?.license ?? licenseFromTags(repository.tags);
    entries.push({
      boardId,
      sourceModel: repository.id,
      organization: repository.author ?? String(repository.id).split("/")[0],
      score: repository.downloads ?? null,
      rank: null,
      metrics: {
        downloads30d: repository.downloads ?? null,
        downloadsAllTime: repository.downloadsAllTime ?? null,
        likes: repository.likes ?? null,
        trendingScore: repository.trendingScore ?? null,
      },
      facts: {
        repoId: repository.id,
        license: license ?? null,
        licenseUrl: repository.cardData?.license_link ?? null,
        parameters,
        gated: Boolean(repository.gated),
        lastModified: repository.lastModified ?? null,
        createdAt: repository.createdAt ?? null,
      },
      sourceUrl: `https://huggingface.co/${repository.id}`,
    });
  }
  entries.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  entries.forEach((entry, index) => { entry.rank = index + 1; });
  return { entries };
}

function licenseFromTags(tags) {
  const tag = (tags ?? []).find((value) => typeof value === "string" && value.startsWith("license:"));
  return tag ? tag.slice("license:".length) : null;
}

/** AAIndex already lives in data/models.json — project it as a board instead of duplicating it. */
export function adaptAaIndexFromCatalog(catalog, { boardId }) {
  const seen = new Map();
  for (const model of catalog.models ?? []) {
    if (!model.quality) continue;
    if (seen.has(model.canonicalId)) continue;
    seen.set(model.canonicalId, {
      boardId,
      sourceModel: model.quality.sourceModel,
      organization: model.quality.sourceDeveloper ?? model.ownerId,
      score: model.quality.aaIndex,
      rank: null,
      metrics: { aaIndex: model.quality.aaIndex },
    });
  }
  const entries = [...seen.values()].sort((left, right) => right.score - left.score);
  entries.forEach((entry, index) => { entry.rank = index + 1; });
  return { entries };
}
