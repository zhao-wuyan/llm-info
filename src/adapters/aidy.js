import { createModel, createPrice, createProvider, numericEntries } from "./shared.js";

function inferOwner(providerId, provider, modelId) {
  if (provider?.official) return providerId;
  if (String(modelId).includes("/")) return String(modelId).split("/", 1)[0];
  return providerId;
}

export function adaptAidy(data) {
  if (!data || typeof data.providers !== "object" || typeof data.models !== "object") {
    throw new Error("aidy-models: expected providers and models objects");
  }

  const generatedAt = data._meta?.generatedAt || null;
  const providers = Object.entries(data.providers).map(([providerId, provider]) =>
    createProvider({
      id: providerId,
      name: provider.name,
      official: provider.official,
      source: "aidy-models",
      sourceId: providerId,
      baseUrl: provider.baseUrl,
      website: provider.url,
      documentation: provider.doc,
    }),
  );

  const models = [];
  for (const [providerId, sourceModels] of Object.entries(data.models)) {
    const provider = data.providers[providerId];
    for (const sourceModel of sourceModels) {
      const ownerId = inferOwner(providerId, provider, sourceModel.id);
      const model = createModel({
        providerId,
        ownerId,
        modelId: sourceModel.id,
        name: sourceModel.name,
        source: "aidy-models",
        sourceId: `${providerId}/${sourceModel.id}`,
        type: sourceModel.type,
        family: sourceModel.family,
        releasedAt: sourceModel.releasedAt,
        knowledgeCutoff: sourceModel.knowledge,
        openWeights: sourceModel.openWeights,
        deprecated: sourceModel.deprecated,
        abilities: sourceModel.abilities,
        contextWindow: sourceModel.contextWindow,
        maxOutput: sourceModel.maxOutput,
        modalities: sourceModel.modalities,
      });

      if (sourceModel.pricing) {
        const rates = numericEntries(sourceModel.pricing.basePricing);
        if (Object.keys(rates).length > 0) {
          model.pricing.push(
            createPrice({
              source: "aidy-models",
              providerId,
              modelId: sourceModel.id,
              currency: sourceModel.pricing.currency,
              unit: sourceModel.pricing.unit,
              region: sourceModel.pricing.currency === "CNY" ? "cn" : null,
              rates,
              adjustments: sourceModel.pricing.adjustments,
              observedAt: generatedAt,
              official: Boolean(provider?.official),
            }),
          );
        }
      }
      models.push(model);
    }
  }

  return {
    providers,
    models,
    meta: { recordCount: models.length, observedAt: generatedAt },
  };
}
