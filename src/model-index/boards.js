import { numberOrNull, parseFlatYamlList } from "./parse.js";

/**
 * Board adapters turn a raw upstream payload into `{ entries, unmapped }`.
 * Every entry is provider-agnostic: it only carries a model id / display name / owner hint,
 * and the matcher maps it onto a canonicalId later.
 */

/**
 * 适配 LM Arena 官方 HuggingFace 数据集 parquet 行为榜单条目。
 * 同一模型在源数据里按 category（overall/expert/coding/...）多行存在，
 * 这里只保留 `category === "overall"`，避免同一 board 写入重复且 rank 冲突的记录。
 * `rank` 与 `vote_count` 在 vision parquet 里是 BigInt，统一转 Number 归一。
 */
export function adaptLmArenaParquet(rows, { boardId }) {
  const entries = [];
  for (const row of rows) {
    if (row.category !== "overall") continue;
    const rawRating = numberOrNull(row.rating);
    if (!row.model_name || rawRating === null) continue;
    // 旧 CSV 镜像是整数 Elo，新 parquet 是长小数；统一取整，保持 score 与 arenaScore 一致
    const score = Math.round(rawRating);
    const votes = numberOrNull(row.vote_count);
    const lower = Number(row.rating_lower ?? NaN);
    const upper = Number(row.rating_upper ?? NaN);
    const ci = Number.isFinite(lower) && Number.isFinite(upper) ? `${Math.round(lower)}-${Math.round(upper)}` : null;
    entries.push({
      boardId,
      sourceModel: row.model_name,
      organization: row.organization || null,
      score,
      rank: numberOrNull(row.rank),
      metrics: {
        arenaScore: score,
        votes,
        confidenceInterval: ci,
      },
      sourceLicense: row.license || null,
      sourceUrl: null,
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
