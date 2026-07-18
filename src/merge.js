import { SCHEMA_VERSION, SOURCE_CONFIG } from "./config.js";

function definedEntries(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function mergeSourceRefs(current, incoming) {
  const refs = new Map();
  for (const ref of [...(current || []), ...(incoming || [])]) refs.set(`${ref.source}:${ref.id}`, ref);
  return [...refs.values()].sort((a, b) => `${a.source}:${a.id}`.localeCompare(`${b.source}:${b.id}`));
}

function mergeProvider(current, incoming) {
  if (!current) return incoming;
  return {
    ...current,
    ...definedEntries(incoming),
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
  };
}

export function mergeCatalogs(catalogs, generatedAt = new Date().toISOString()) {
  const providers = new Map();
  const models = new Map();

  for (const catalog of catalogs) {
    for (const provider of catalog.providers) providers.set(provider.id, mergeProvider(providers.get(provider.id), provider));
    for (const model of catalog.models) models.set(model.id, mergeModel(models.get(model.id), model));
  }

  const mergedModels = [...models.values()]
    .map((model) => ({
      ...model,
      pricing: [...model.pricing].sort((a, b) => a.id.localeCompare(b.id)),
      displayPrices: {
        USD: selectDisplayPrice(model.pricing, "USD"),
        CNY: selectDisplayPrice(model.pricing, "CNY"),
      },
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

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
    },
    providers: [...providers.values()].sort((a, b) => a.id.localeCompare(b.id)),
    models: mergedModels,
  };
}
