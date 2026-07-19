import explicitAliases from "./model-aliases.json" with { type: "json" };

function aliasTarget(alias) {
  return typeof alias === "string" ? alias : alias.canonicalId;
}

function separatorKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[._-]/g, "-");
}

function compactKey(value) {
  return separatorKey(value).replace(/-/g, "");
}

function splitCanonicalId(value) {
  const [owner, ...modelParts] = String(value ?? "").split("/");
  return { owner, modelId: modelParts.join("/") };
}

function automaticAliasKey(value) {
  const { owner, modelId } = splitCanonicalId(value);
  return `${compactKey(owner)}/${separatorKey(modelId)}`;
}

function resolveFromMap(value, aliases) {
  let resolved = value;
  const visited = new Set();
  while (aliases.has(resolved) && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = aliases.get(resolved);
  }
  return resolved;
}

function modelEvidence(canonicalId, models, providers) {
  const listings = models.filter((model) => model.canonicalId === canonicalId);
  const sourceIds = new Set(listings.flatMap((model) => (model.sourceRefs || []).map((ref) => ref.source)));
  const providerIds = new Set(listings.map((model) => model.providerId));
  const officialListings = listings.filter((model) => {
    const provider = providers.get(model.providerId);
    return provider?.official && compactKey(model.providerId) === compactKey(model.ownerId);
  }).length;
  const officialQuotes = listings.reduce(
    (count, model) =>
      count +
      (model.pricing || []).filter(
        (price) => price.official && compactKey(model.providerId) === compactKey(model.ownerId),
      ).length,
    0,
  );

  return {
    canonicalId,
    officialListings,
    officialQuotes,
    sourceCount: sourceIds.size,
    providerCount: providerIds.size,
    listingCount: listings.length,
  };
}

function compareEvidence(left, right) {
  return (
    right.officialListings - left.officialListings ||
    right.officialQuotes - left.officialQuotes ||
    right.sourceCount - left.sourceCount ||
    right.providerCount - left.providerCount ||
    right.listingCount - left.listingCount ||
    left.canonicalId.localeCompare(right.canonicalId)
  );
}

function evidenceSummary(evidence) {
  return {
    officialListings: evidence.officialListings,
    officialQuotes: evidence.officialQuotes,
    sourceCount: evidence.sourceCount,
    providerCount: evidence.providerCount,
    listingCount: evidence.listingCount,
  };
}

export function explicitModelAliases() {
  return Object.entries(explicitAliases)
    .map(([alias, value]) => ({
      alias,
      canonicalId: aliasTarget(value),
      kind: "explicit",
      confidence: 1,
      reason: "curated-alias",
    }))
    .sort((left, right) => left.alias.localeCompare(right.alias));
}

export function discoverModelAliases(models, providerList = []) {
  const providers = new Map(providerList.map((provider) => [provider.id, provider]));
  const canonicalIds = [...new Set(models.map((model) => model.canonicalId))];
  const evidence = new Map(canonicalIds.map((id) => [id, modelEvidence(id, models, providers)]));
  const separatorGroups = new Map();

  for (const canonicalId of canonicalIds) {
    const key = automaticAliasKey(canonicalId);
    if (!separatorGroups.has(key)) separatorGroups.set(key, []);
    separatorGroups.get(key).push(canonicalId);
  }

  const automatic = [];
  for (const ids of separatorGroups.values()) {
    if (ids.length < 2) continue;
    const ranked = ids.map((id) => evidence.get(id)).sort(compareEvidence);
    const target = ranked[0];
    for (const alias of ranked.slice(1)) {
      automatic.push({
        alias: alias.canonicalId,
        canonicalId: target.canonicalId,
        kind: "automatic",
        confidence: 1,
        reason: "separator-equivalent",
        evidence: {
          alias: evidenceSummary(alias),
          target: evidenceSummary(target),
        },
      });
    }
  }

  return {
    automatic: automatic.sort((left, right) => left.alias.localeCompare(right.alias)),
    candidates: [],
  };
}

export function createAliasResolver(aliases) {
  const aliasMap = new Map(aliases.map((alias) => [alias.alias, alias.canonicalId]));
  return (canonicalId) => resolveFromMap(canonicalId, aliasMap);
}
