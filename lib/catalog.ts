import rawCatalog from "@/data/models.json";
import type { CanonicalModel, Catalog, Currency, DisplayPrice, Model, Provider } from "./types";
import { canonicalModelDisplayName, resolveCanonicalModelId } from "./model-aliases";
import { selectCanonicalDisplayPrice } from "./price-confidence";

export const catalog = rawCatalog as unknown as Catalog;
export const providerById = new Map(catalog.providers.map((provider) => [provider.id, provider]));

function completeness(model: Model) {
  return [model.description, model.contextWindow, model.abilities, model.quality, model.releasedAt].filter(Boolean).length;
}

function lowestPrice(channels: Model[], currency: Currency): DisplayPrice | null {
  return channels
    .map((model) => model.displayPrices[currency])
    .filter((price): price is DisplayPrice => price !== null)
    .sort((a, b) => (a.rates.textInput ?? Number.POSITIVE_INFINITY) - (b.rates.textInput ?? Number.POSITIVE_INFINITY))[0] ?? null;
}

const groups = new Map<string, CanonicalModel>();
for (const model of catalog.models) {
  const resolvedCanonicalId = resolveCanonicalModelId(model.canonicalId);
  const current = groups.get(resolvedCanonicalId);
  if (!current) {
    groups.set(resolvedCanonicalId, {
      canonicalId: resolvedCanonicalId,
      name: model.name,
      ownerId: model.ownerId,
      description: model.description,
      family: model.family,
      releasedAt: model.releasedAt,
      knowledgeCutoff: model.knowledgeCutoff,
      openWeights: model.openWeights,
      abilities: model.abilities ?? {},
      contextWindow: model.contextWindow,
      maxOutput: model.maxOutput,
      modalities: model.modalities,
      quality: model.quality,
      channels: [model],
      providerCount: 1,
      displayPrices: { USD: null, CNY: null },
      minPrices: { USD: null, CNY: null },
      sourceRefs: [...model.sourceRefs],
    });
    continue;
  }
  current.channels.push(model);
  current.providerCount = new Set(current.channels.map((item) => item.providerId)).size;
  current.sourceRefs = [...new Map([...current.sourceRefs, ...model.sourceRefs].map((ref) => [`${ref.source}:${ref.id}`, ref])).values()];
  if (completeness(model) > completeness(current.channels[0])) {
    Object.assign(current, {
      name: model.name, description: model.description, family: model.family, releasedAt: model.releasedAt,
      knowledgeCutoff: model.knowledgeCutoff, openWeights: model.openWeights, abilities: model.abilities ?? current.abilities,
      contextWindow: model.contextWindow, maxOutput: model.maxOutput, modalities: model.modalities, quality: model.quality ?? current.quality,
    });
  }
}
for (const group of groups.values()) {
  group.name = canonicalModelDisplayName(group.canonicalId) ?? group.name;
  group.minPrices = { USD: lowestPrice(group.channels, "USD"), CNY: lowestPrice(group.channels, "CNY") };
  group.displayPrices = {
    USD: selectCanonicalDisplayPrice(group.channels, providerById, "USD", catalog.generatedAt),
    CNY: selectCanonicalDisplayPrice(group.channels, providerById, "CNY", catalog.generatedAt),
  };
}

export const canonicalModels = [...groups.values()];
export const modelByCanonicalId = groups;

export function providerStats(provider: Provider) {
  const models = catalog.models.filter((model) => model.providerId === provider.id);
  return {
    models,
    modelCount: new Set(models.map((model) => resolveCanonicalModelId(model.canonicalId))).size,
    usdCount: models.filter((model) => model.displayPrices.USD).length,
    cnyCount: models.filter((model) => model.displayPrices.CNY).length,
    qualityCount: new Set(models.filter((model) => model.quality).map((model) => resolveCanonicalModelId(model.canonicalId))).size,
  };
}

export function modelMatches(model: CanonicalModel, query: string) {
  const value = query.trim().toLowerCase();
  return !value || [model.name, model.canonicalId, model.ownerId, model.family].some((item) => item?.toLowerCase().includes(value));
}
