import modelAliases from "./model-aliases.json" with { type: "json" };

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
  return resolveCanonicalId(`${normalizeId(ownerId)}/${normalizeModelId(modelId, ownerId)}`);
}

export function resolveCanonicalId(value) {
  let resolved = normalizeId(value);
  const visited = new Set();
  while (modelAliases[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    const alias = modelAliases[resolved];
    resolved = typeof alias === "string" ? alias : alias.canonicalId;
  }
  return resolved;
}
