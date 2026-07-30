import { normalizeId, resolveCanonicalId } from "../ids.js";

const SCORE_BOARD_KINDS = new Set(["quality", "arena", "coding"]);

/** Strip a provider/owner prefix so matching is model-id only (供应商无关). */
export function modelPart(value) {
  const normalized = normalizeId(value);
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

function stripScoreAnnotations(value) {
  return String(value ?? "")
    .replace(/\(\s*(?:high|medium|low|xhigh)\s*\)/gi, " ")
    .replace(/\((?=[^)]*\d)(?=[^)]*(?:thinking|tokens?|budget))[^)]*\)/gi, " ")
    .replace(/[-_\s]+thinking[-_\s]+(?:token[-_\s]+)?budget[-_\s]*\d+(?:\.\d+)?[km]?(?=$|[\s/])/gi, " ")
    .replace(/[-_\s]+thinking[-_\s]+\d+(?:\.\d+)?[km]?(?:[-_\s]+tokens?)?(?=$|[\s/])/gi, " ")
    // LM Arena parquet 用连字符后缀标注推理强度，仅剥离行尾的 `-(xhigh|high|medium|low)`
    .replace(/-(?:xhigh|high|medium|low)$/i, " ");
}

/** Normalize repository identity, with score-only annotations selected by board kind. */
export function normalizeModelKey(value, kind = "identity") {
  const input = SCORE_BOARD_KINDS.has(kind) ? stripScoreAnnotations(value) : String(value ?? "");
  return modelPart(input.replace(/@[0-9A-Za-z.-]+$/, "").replace(/\+/g, "-plus-"))
    .replace(/[._:]+/g, "-")
    .replace(/\((.*?)\)/g, "-$1-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Drop trailing date/version stamps: `gpt-5.6-sol-2026-07-01` → `gpt-5-6-sol`. */
export function looseKey(value, kind = "identity") {
  const tokens = normalizeModelKey(value, kind).split("-").filter(Boolean);
  while (tokens.length > 1 && /^(?:20\d{2}|\d{4}|\d{2}|v\d+|\d{6,8})$/.test(tokens.at(-1))) tokens.pop();
  return tokens.join("-");
}

function ownerKey(value) {
  return (normalizeId(value).split("/").pop() ?? "").replace(/[._-]/g, "");
}

/** Owners are equivalent only when they differ by `.`, `_`, or `-` separators. */
export function ownersCompatible(left, right) {
  const a = ownerKey(left);
  const b = ownerKey(right);
  return Boolean(a && b && a === b);
}

function preferenceScore(model) {
  return (model.channelCount ?? 0) * 10 + (model.hasPrice ? 5 : 0) + (model.hasQuality ? 3 : 0);
}

/**
 * Build a provider-agnostic matcher over canonical models.
 * `models` items include canonical identity, completeness, and direct official evidence.
 */
export function createModelMatcher(models) {
  const indexes = new Map();

  const push = (map, key, model) => {
    if (!key) return;
    const bucket = map.get(key);
    if (!bucket) {
      map.set(key, [model]);
      return;
    }
    if (!bucket.some((candidate) => candidate.canonicalId === model.canonicalId)) bucket.push(model);
  };

  const buildIndexes = (kind) => {
    const strategy = SCORE_BOARD_KINDS.has(kind) ? kind : "identity";
    const existing = indexes.get(strategy);
    if (existing) return existing;
    const exact = new Map();
    const loose = new Map();
    const byOwner = new Map();
    for (const model of models) {
      const canonicalKey = normalizeModelKey(model.canonicalId, strategy);
      push(exact, canonicalKey, model);
      push(byOwner, `${ownerKey(model.ownerId)}::${canonicalKey}`, model);
      if (model.name) {
        const nameKey = normalizeModelKey(model.name, strategy);
        push(exact, nameKey, model);
        push(byOwner, `${ownerKey(model.ownerId)}::${nameKey}`, model);
      }
      // Only base ids (without a trailing date/version stamp) accept loose hits, so
      // `ministral-8b-2512` never absorbs the upstream `Ministral-8B-2410` snapshot.
      if (looseKey(model.canonicalId, strategy) === canonicalKey) {
        push(loose, looseKey(model.canonicalId, strategy), model);
      }
    }
    const built = { exact, loose, byOwner };
    indexes.set(strategy, built);
    return built;
  };

  const pick = (candidates) => {
    if (!candidates?.length) return null;
    if (candidates.length === 1) return candidates[0];
    return [...candidates].sort(
      (left, right) =>
        Number(Boolean(right.directOfficial)) - Number(Boolean(left.directOfficial)) ||
        preferenceScore(right) - preferenceScore(left) ||
        left.canonicalId.localeCompare(right.canonicalId),
    )[0];
  };

  const identityIndexes = buildIndexes("identity");
  return {
    size: identityIndexes.exact.size,
    /** @returns {{ canonicalId: string, confidence: "exact"|"loose", ambiguous: boolean } | null} */
    match({ id, name, organization, ownerRequired = false, allowLoose = true, kind = "identity" } = {}) {
      if (ownerRequired && !organization) return null;
      const strategy = SCORE_BOARD_KINDS.has(kind) ? kind : "identity";
      const { exact, loose, byOwner } = buildIndexes(strategy);
      const inputs = [id, name].filter(Boolean);
      const gate = (candidates) =>
        organization
          ? (candidates ?? []).filter((model) => ownersCompatible(model.ownerId, organization))
          : (candidates ?? []);
      for (const input of inputs) {
        const key = normalizeModelKey(input, strategy);
        const ownerHit = organization ? byOwner.get(`${ownerKey(organization)}::${key}`) : null;
        const hit = gate(ownerHit ?? exact.get(key));
        const chosen = pick(hit);
        if (chosen) {
          return { canonicalId: resolveCanonicalId(chosen.canonicalId), confidence: "exact", ambiguous: hit.length > 1 };
        }
      }
      if (!allowLoose) return null;
      for (const input of inputs) {
        const hit = gate(loose.get(looseKey(input, strategy)));
        const chosen = pick(hit);
        if (chosen) {
          return { canonicalId: resolveCanonicalId(chosen.canonicalId), confidence: "loose", ambiguous: hit.length > 1 };
        }
      }
      return null;
    },
  };
}

/** Reduce a generated catalog (data/models.json shape) into matcher input. */
export function canonicalIndexFromCatalog(catalog) {
  const grouped = new Map();
  const providers = new Map((catalog.providers ?? []).map((provider) => [normalizeId(provider.id), provider]));
  for (const model of catalog.models ?? []) {
    const canonicalId = resolveCanonicalId(model.canonicalId);
    const canonicalOwner = canonicalId.split("/")[0];
    const provider = providers.get(normalizeId(model.providerId));
    const directOfficial = Boolean(
      provider?.official &&
      ownersCompatible(model.providerId, canonicalOwner) &&
      ownersCompatible(model.ownerId, canonicalOwner)
    );
    const current = grouped.get(canonicalId);
    const hasPrice = Boolean(model.displayPrices?.USD || model.displayPrices?.CNY);
    if (!current) {
      grouped.set(canonicalId, {
        canonicalId,
        ownerId: model.ownerId,
        name: model.name,
        channelCount: 1,
        hasPrice,
        hasQuality: Boolean(model.quality),
        directOfficial,
      });
      continue;
    }
    current.channelCount += 1;
    current.hasPrice = current.hasPrice || hasPrice;
    current.hasQuality = current.hasQuality || Boolean(model.quality);
    current.directOfficial = current.directOfficial || directOfficial;
  }
  return [...grouped.values()];
}
