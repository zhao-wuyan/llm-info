import { HUB_CHANNEL_ALIASES, HUB_PROVIDER_ALIASES } from "../config.js";
import { createModel, createPrice, createProvider, numericEntries } from "./shared.js";

function resolveChannel(entry) {
  if (entry.channel === "official") {
    return HUB_PROVIDER_ALIASES[entry.provider] || entry.provider;
  }
  return HUB_CHANNEL_ALIASES[entry.channel] || entry.channel;
}

export function adaptPriceHub(data) {
  if (!data || !Array.isArray(data.entries)) {
    throw new Error("model-price-hub: expected an entries array");
  }

  const providersById = new Map();
  const modelsById = new Map();

  for (const entry of data.entries) {
    const providerId = resolveChannel(entry);
    if (!providersById.has(providerId)) {
      providersById.set(
        providerId,
        createProvider({
          id: providerId,
          name: entry.channel === "official" ? entry.provider : entry.channel,
          official: entry.channel === "official",
          source: "model-price-hub",
          sourceId: entry.channel,
        }),
      );
    }

    const sourceModelId = entry.model || entry.canonical_model;
    const modelCandidate = createModel({
      providerId,
      ownerId: entry.provider,
      modelId: sourceModelId,
      name: sourceModelId,
      source: "model-price-hub",
      sourceId: `${entry.provider}/${entry.channel}/${sourceModelId}`,
      contextWindow: entry.context_window,
      maxOutput: entry.max_output,
    });
    const model = modelsById.get(modelCandidate.id) || modelCandidate;
    const rates = numericEntries({
      textInput: entry.input_per_1m,
      textOutput: entry.output_per_1m,
      textInput_cacheRead: entry.cached_input_per_1m,
      textInput_cacheWrite: entry.cache_write_per_1m,
    });
    if (Object.keys(rates).length > 0) {
      const price = createPrice({
        source: "model-price-hub",
        providerId,
        modelId: sourceModelId,
        currency: entry.currency,
        unit: "millionTokens",
        region: entry.region,
        quoteKey: `${entry.source || "unknown"}-${entry.provenance || "unknown"}-${entry.via_vision ? "vision" : "direct"}`,
        rates,
        sourceUrl: entry.source_url,
        observedAt: entry.scraped_at || data.generated_at || null,
        official: Boolean(entry.official),
        provenance: entry.provenance,
        viaVision: Boolean(entry.via_vision),
      });
      if (!model.pricing.some((existing) => existing.id === price.id)) model.pricing.push(price);
    }
    modelsById.set(model.id, model);
  }

  return {
    providers: [...providersById.values()],
    models: [...modelsById.values()],
    meta: { recordCount: data.entries.length, observedAt: data.generated_at || data.data_date || null },
  };
}
