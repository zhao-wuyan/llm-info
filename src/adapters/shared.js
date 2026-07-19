import { canonicalId, listingId, normalizeId, normalizeModelId } from "../ids.js";

export function createProvider({ id, name, official = false, source, sourceId, ...details }) {
  const normalizedId = normalizeId(id);
  return {
    id: normalizedId,
    name: name || normalizedId,
    official: Boolean(official),
    ...details,
    sourceRefs: [{ source, id: sourceId || normalizedId }],
  };
}

export function createModel({ providerId, ownerId, modelId, name, source, sourceId, ...metadata }) {
  const normalizedProvider = normalizeId(providerId);
  const normalizedModel = normalizeModelId(modelId, normalizedProvider);
  const normalizedOwner = normalizeId(ownerId || normalizedProvider);

  return {
    id: listingId(normalizedProvider, normalizedModel),
    providerId: normalizedProvider,
    ownerId: normalizedOwner,
    modelId: normalizedModel,
    canonicalId: canonicalId(normalizedOwner, normalizedModel),
    name: name || modelId,
    ...metadata,
    sourceRefs: [{ source, id: sourceId || String(modelId) }],
    pricing: [],
  };
}

export function createPrice({
  source,
  providerId,
  modelId,
  currency,
  unit,
  region = null,
  rates,
  quoteKey = null,
  ...details
}) {
  const normalizedRegion = region || "global";
  const variant = quoteKey ? `:${normalizeId(quoteKey)}` : "";
  return {
    id: `${source}:${listingId(providerId, modelId)}:${currency}:${unit}:${normalizedRegion}${variant}`,
    source,
    currency,
    unit,
    region,
    rates,
    ...details,
  };
}

export function numericEntries(object) {
  return Object.fromEntries(
    Object.entries(object || {}).filter(
      ([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0,
    ),
  );
}

export function explicitFree(object) {
  return object?.free === true || object?.isFree === true || object?.is_free === true;
}

export function inferFree(object, rates, ...labels) {
  if (explicitFree(object)) return true;
  const values = Object.values(rates || {}).filter((value) => typeof value === "number" && Number.isFinite(value));
  const hasFreeToken = labels.some(
    (label) => typeof label === "string" && /(?:^|[^a-z0-9])free(?:$|[^a-z0-9])/i.test(label),
  );
  return values.length > 0 && values.every((value) => value === 0) && hasFreeToken;
}
