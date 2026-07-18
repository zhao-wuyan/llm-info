import { createModel, createPrice, createProvider, numericEntries } from "./shared.js";

const TOKEN_RATE_MAP = {
  input_cost_per_token: "textInput",
  output_cost_per_token: "textOutput",
  cache_read_input_token_cost: "textInput_cacheRead",
  cache_creation_input_token_cost: "textInput_cacheWrite",
};

const UNIT_MAPPINGS = [
  {
    unit: "millionTokens",
    fields: TOKEN_RATE_MAP,
    multiplier: 1_000_000,
  },
  {
    unit: "image",
    fields: { input_cost_per_image: "imageInput", output_cost_per_image: "imageOutput" },
    multiplier: 1,
  },
  {
    unit: "second",
    fields: { input_cost_per_second: "mediaInput", output_cost_per_second: "mediaOutput" },
    multiplier: 1,
  },
  {
    unit: "millionCharacters",
    fields: { input_cost_per_character: "textInput", output_cost_per_character: "textOutput" },
    multiplier: 1_000_000,
  },
];

function extractRates(sourceModel, mapping) {
  const rates = {};
  for (const [sourceKey, targetKey] of Object.entries(mapping.fields)) {
    const value = sourceModel[sourceKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      rates[targetKey] = value * mapping.multiplier;
    }
  }
  return rates;
}

function rawCostFields(sourceModel) {
  return numericEntries(
    Object.fromEntries(Object.entries(sourceModel).filter(([key]) => key.includes("cost"))),
  );
}

export function adaptLiteLlm(data, fetchedAt) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("LiteLLM: expected an object keyed by model id");
  }

  const providersById = new Map();
  const models = [];

  for (const [sourceId, sourceModel] of Object.entries(data)) {
    if (sourceId === "sample_spec" || !sourceModel || typeof sourceModel !== "object") continue;
    const providerId = sourceModel.litellm_provider || "unknown";
    if (!providersById.has(providerId)) {
      providersById.set(
        providerId,
        createProvider({ id: providerId, name: providerId, source: "litellm", sourceId: providerId }),
      );
    }

    const model = createModel({
      providerId,
      ownerId: providerId,
      modelId: sourceId,
      name: sourceModel.model_name || sourceId,
      source: "litellm",
      sourceId,
      type: sourceModel.mode,
      contextWindow: sourceModel.max_input_tokens || sourceModel.max_tokens,
      maxOutput: sourceModel.max_output_tokens,
      modalities: {
        input: sourceModel.supported_modalities,
        output: sourceModel.supported_output_modalities,
      },
    });

    const sourceRates = rawCostFields(sourceModel);
    for (const mapping of UNIT_MAPPINGS) {
      const rates = extractRates(sourceModel, mapping);
      if (Object.keys(rates).length === 0) continue;
      model.pricing.push(
        createPrice({
          source: "litellm",
          providerId,
          modelId: sourceId,
          currency: "USD",
          unit: mapping.unit,
          rates,
          sourceRates,
          observedAt: fetchedAt,
          official: false,
        }),
      );
    }
    models.push(model);
  }

  return {
    providers: [...providersById.values()],
    models,
    meta: { recordCount: models.length, observedAt: fetchedAt },
  };
}
