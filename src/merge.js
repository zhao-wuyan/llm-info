import { SCHEMA_VERSION, SOURCE_CONFIG } from "./config.js";
import { createAliasResolver, discoverModelAliases, explicitModelAliases } from "./model-alias-discovery.js";

function definedEntries(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function mergeSourceRefs(current, incoming) {
  const refs = new Map();
  for (const ref of [...(current || []), ...(incoming || [])]) refs.set(`${ref.source}:${ref.id}`, ref);
  return [...refs.values()].sort((a, b) => `${a.source}:${a.id}`.localeCompare(`${b.source}:${b.id}`));
}

function providerSourceScore(provider) {
  const priority = { "aidy-models": 300, "model-price-hub": 200, litellm: 100 };
  return Math.max(0, ...(provider.sourceRefs || []).map((ref) => priority[ref.source] || 0));
}

function mergeProvider(current, incoming) {
  if (!current) return incoming;
  const [preferred, fallback] =
    providerSourceScore(incoming) > providerSourceScore(current) ? [incoming, current] : [current, incoming];
  return {
    ...definedEntries(fallback),
    ...definedEntries(preferred),
    official: current.official || incoming.official,
    sourceRefs: mergeSourceRefs(current.sourceRefs, incoming.sourceRefs),
  };
}

function mergeModel(current, incoming) {
  if (!current) return incoming;
  const pricing = new Map(current.pricing.map((price) => [price.id, price]));
  for (const price of incoming.pricing) pricing.set(price.id, price);
  return {
    ...current,
    ...definedEntries(incoming),
    sourceRefs: mergeSourceRefs(current.sourceRefs, incoming.sourceRefs),
    pricing: [...pricing.values()],
  };
}

function priceScore(price, currency) {
  const sourcePriority =
    currency === "CNY"
      ? { "aidy-models": 300, "model-price-hub": 200, litellm: 100 }
      : { litellm: 300, "aidy-models": 200, "model-price-hub": 100 };
  const regionBonus =
    (currency === "CNY" && price.region === "cn") || (currency === "USD" && price.region === "intl") ? 20 : 0;
  const provenanceBonus = price.provenance === "scraped" ? 3 : price.provenance === "stale" ? -3 : 0;
  return (
    (sourcePriority[price.source] || 0) +
    regionBonus +
    (price.official ? 5 : 0) +
    provenanceBonus +
    (price.viaVision ? -1 : 0)
  );
}

export function selectDisplayPrice(pricing, currency) {
  const candidates = pricing
    .filter(
      (price) =>
        price.currency === currency &&
        price.unit === "millionTokens" &&
        (typeof price.rates.textInput === "number" || typeof price.rates.textOutput === "number"),
    )
    .sort((a, b) => priceScore(b, currency) - priceScore(a, currency) || a.id.localeCompare(b.id));
  if (candidates.length === 0) return null;
  const selected = candidates[0];
  return {
    priceId: selected.id,
    source: selected.source,
    region: selected.region,
    unit: selected.unit,
    rates: selected.rates,
    ...(selected.free === true ? { free: true } : {}),
  };
}

export function mergeCatalogs(catalogs, generatedAt = new Date().toISOString()) {
  const providers = new Map();
  const models = new Map();
  const qualityRecords = [];

  for (const catalog of catalogs) {
    for (const provider of catalog.providers) providers.set(provider.id, mergeProvider(providers.get(provider.id), provider));
    for (const model of catalog.models) models.set(model.id, mergeModel(models.get(model.id), model));
    qualityRecords.push(...(catalog.qualities || []));
  }

  const discoveredAliases = discoverModelAliases([...models.values()], [...providers.values()]);
  const modelAliases = [...explicitModelAliases(), ...discoveredAliases.automatic];
  const resolveDiscoveredAlias = createAliasResolver(discoveredAliases.automatic);
  const qualities = new Map(
    qualityRecords.map((quality) => {
      const canonicalId = resolveDiscoveredAlias(quality.canonicalId);
      return [canonicalId, { ...quality, canonicalId }];
    }),
  );

  const mergedModels = [...models.values()]
    .map((model) => {
      const canonicalId = resolveDiscoveredAlias(model.canonicalId);
      const quality = qualities.get(canonicalId);
      const { canonicalId: _canonicalId, ...qualityEvidence } = quality || {};
      return {
        ...model,
        canonicalId,
        ...(quality
          ? {
              quality: qualityEvidence,
              sourceRefs: mergeSourceRefs(model.sourceRefs, [{ source: quality.source, id: quality.sourceModel }]),
            }
          : {}),
        pricing: [...model.pricing].sort((a, b) => a.id.localeCompare(b.id)),
        displayPrices: {
          USD: selectDisplayPrice(model.pricing, "USD"),
          CNY: selectDisplayPrice(model.pricing, "CNY"),
        },
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const matchedQualityIds = new Set(mergedModels.filter((model) => model.quality).map((model) => model.canonicalId));
  const sourceUnmappedCount = catalogs.reduce((count, catalog) => count + (catalog.meta?.unmappedCount || 0), 0);

  const sourceList = catalogs.map((catalog) => ({
    ...SOURCE_CONFIG[catalog.configKey],
    ...catalog.meta,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    sources: sourceList,
    stats: {
      providers: providers.size,
      models: mergedModels.length,
      quotes: mergedModels.reduce((count, model) => count + model.pricing.length, 0),
      usdModels: mergedModels.filter((model) => model.displayPrices.USD).length,
      cnyModels: mergedModels.filter((model) => model.displayPrices.CNY).length,
      dualCurrencyModels: mergedModels.filter((model) => model.displayPrices.USD && model.displayPrices.CNY).length,
      qualityModels: matchedQualityIds.size,
      qualityListings: mergedModels.filter((model) => model.quality).length,
      unmatchedQualityModels:
        sourceUnmappedCount + [...qualities.keys()].filter((canonicalId) => !matchedQualityIds.has(canonicalId)).length,
      automaticModelAliases: discoveredAliases.automatic.length,
      modelAliasCandidates: discoveredAliases.candidates.length,
    },
    modelAliases,
    modelAliasCandidates: discoveredAliases.candidates,
    providers: [...providers.values()].sort((a, b) => a.id.localeCompare(b.id)),
    models: mergedModels,
  };
}
