export function normalizeId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._:/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

export function normalizeModelId(value, providerId) {
  const modelId = normalizeId(value);
  const prefix = `${normalizeId(providerId)}/`;
  return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId;
}

export function listingId(providerId, modelId) {
  return `${normalizeId(providerId)}/${normalizeModelId(modelId, providerId)}`;
}

export function canonicalId(ownerId, modelId) {
  return `${normalizeId(ownerId)}/${normalizeModelId(modelId, ownerId)}`;
}
