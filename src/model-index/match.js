import { normalizeId, resolveCanonicalId } from "../ids.js";

const NOISE_TOKENS = [
  "chat", "instruct", "it", "preview", "latest", "exp", "experimental", "thinking",
  "hf", "gguf", "awq", "fp8", "int8", "int4", "bf16", "base",
];

/** Strip a provider/owner prefix so matching is model-id only (供应商无关). */
export function modelPart(value) {
  const normalized = normalizeId(value);
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

/** Collapse punctuation and noise suffixes so `Qwen3.7-Max` ≈ `qwen3-7-max`. */
export function matchKey(value) {
  // Normalization drops `+` and `@`, so handle both before normalizing:
  // `Command R+` !== `Command R`, and `gpt-4o-mini@2024-07-18` is a pinned revision.
  const base = modelPart(String(value ?? "").replace(/@[0-9A-Za-z.-]+$/, "").replace(/\+/g, "-plus-"))
    .replace(/[._:]+/g, "-")
    .replace(/\((.*?)\)/g, "-$1-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const tokens = base.split("-").filter(Boolean);
  while (tokens.length > 1 && NOISE_TOKENS.includes(tokens.at(-1))) tokens.pop();
  return tokens.join("-");
}

/** Drop trailing date/version stamps: `gpt-5.6-sol-2026-07-01` → `gpt-5-6-sol`. */
export function looseKey(value) {
  const tokens = matchKey(value).split("-").filter(Boolean);
  while (tokens.length > 1 && /^(?:20\d{2}|\d{4}|\d{2}|v\d+|\d{6,8})$/.test(tokens.at(-1))) tokens.pop();
  return tokens.join("-");
}

/** `deepseek-ai` ≈ `deepseek`, `Qwen` ≈ `qwen`, `accounts/fireworks/models` ≉ `qwen`. */
export function ownersCompatible(left, right) {
  const a = normalizeId(left).split("/").pop() ?? "";
  const b = normalizeId(right).split("/").pop() ?? "";
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

function preferenceScore(model) {
  return (model.channelCount ?? 0) * 10 + (model.hasPrice ? 5 : 0) + (model.hasQuality ? 3 : 0);
}

/**
 * Build a provider-agnostic matcher over canonical models.
 * `models` items: { canonicalId, ownerId, name, channelCount, hasPrice, hasQuality }
 */
export function createModelMatcher(models) {
  const exact = new Map();
  const loose = new Map();
  const byOwner = new Map();

  const push = (map, key, model) => {
    if (!key) return;
    const bucket = map.get(key);
    if (bucket) bucket.push(model);
    else map.set(key, [model]);
  };

  for (const model of models) {
    push(exact, matchKey(model.canonicalId), model);
    if (model.name) push(exact, matchKey(model.name), model);
    // Only base ids (without a trailing date/version stamp) accept loose hits, so
    // `ministral-8b-2512` never absorbs the upstream `Ministral-8B-2410` snapshot.
    if (looseKey(model.canonicalId) === matchKey(model.canonicalId)) push(loose, looseKey(model.canonicalId), model);
    push(byOwner, `${normalizeId(model.ownerId)}::${matchKey(model.canonicalId)}`, model);
  }

  const pick = (candidates, ownerHint) => {
    if (!candidates?.length) return null;
    if (candidates.length === 1) return candidates[0];
    const owner = normalizeId(ownerHint || "");
    const owned = owner ? candidates.filter((model) => normalizeId(model.ownerId) === owner) : [];
    const pool = owned.length ? owned : candidates;
    return [...pool].sort(
      (left, right) => preferenceScore(right) - preferenceScore(left) || left.canonicalId.localeCompare(right.canonicalId),
    )[0];
  };

  return {
    size: exact.size,
    /** @returns {{ canonicalId: string, confidence: "exact"|"loose", ambiguous: boolean } | null} */
    match({ id, name, organization, ownerRequired = false, allowLoose = true } = {}) {
      const inputs = [id, name].filter(Boolean);
      const gate = (candidates) => {
        if (!ownerRequired) return candidates;
        if (!organization) return [];
        return (candidates ?? []).filter((model) => ownersCompatible(model.ownerId, organization));
      };
      for (const input of inputs) {
        const owner = organization ? `${normalizeId(organization)}::${matchKey(input)}` : null;
        const ownerHit = owner ? byOwner.get(owner) : null;
        const hit = gate(ownerHit ?? exact.get(matchKey(input)));
        const chosen = pick(hit, organization);
        if (chosen) {
          return { canonicalId: resolveCanonicalId(chosen.canonicalId), confidence: "exact", ambiguous: hit.length > 1 };
        }
      }
      if (!allowLoose) return null;
      for (const input of inputs) {
        const hit = gate(loose.get(looseKey(input)));
        const chosen = pick(hit, organization);
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
  for (const model of catalog.models ?? []) {
    const canonicalId = resolveCanonicalId(model.canonicalId);
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
      });
      continue;
    }
    current.channelCount += 1;
    current.hasPrice = current.hasPrice || hasPrice;
    current.hasQuality = current.hasQuality || Boolean(model.quality);
  }
  return [...grouped.values()];
}
