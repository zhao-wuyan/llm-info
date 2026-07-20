const SUPPORTED_CURRENCIES = new Set(["USD", "CNY"]);

export function validateDatabase(database) {
  const errors = [];
  if (database?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(database?.providers)) errors.push("providers must be an array");
  if (!Array.isArray(database?.models)) errors.push("models must be an array");
  if (!Array.isArray(database?.sources)) errors.push("sources must be an array");
  if (!Array.isArray(database?.modelAliases)) errors.push("modelAliases must be an array");
  if (!Array.isArray(database?.modelAliasCandidates)) errors.push("modelAliasCandidates must be an array");
  if (errors.length > 0) return errors;

  for (const source of database.sources) {
    if (!/^[0-9a-f]{40}$/i.test(source.revision || "")) errors.push(`invalid source revision: ${source.id}`);
    if (!/^[0-9a-f]{64}$/i.test(source.contentSha256 || "")) errors.push(`invalid source content hash: ${source.id}`);
    if (typeof source.commitVerified !== "boolean") errors.push(`missing commit verification status: ${source.id}`);
    if (!source.commitVerificationReason) errors.push(`missing commit verification reason: ${source.id}`);
  }

  const aliasIds = new Set();
  for (const alias of database.modelAliases) {
    if (!alias?.alias || !alias?.canonicalId || alias.alias === alias.canonicalId) {
      errors.push(`invalid model alias: ${JSON.stringify(alias)}`);
      continue;
    }
    if (aliasIds.has(alias.alias)) errors.push(`duplicate model alias: ${alias.alias}`);
    aliasIds.add(alias.alias);
    if (!Number.isFinite(alias.confidence) || alias.confidence < 0 || alias.confidence > 1) {
      errors.push(`invalid model alias confidence: ${alias.alias}`);
    }
  }
  for (const candidate of database.modelAliasCandidates) {
    if (!candidate?.alias || !candidate?.canonicalId || candidate.kind !== "candidate") {
      errors.push(`invalid model alias candidate: ${JSON.stringify(candidate)}`);
    }
  }

  const providerIds = new Set(database.providers.map((provider) => provider.id));
  const modelIds = new Set();
  const priceIds = new Set();
  for (const model of database.models) {
    if (modelIds.has(model.id)) errors.push(`duplicate model id: ${model.id}`);
    modelIds.add(model.id);
    if (!providerIds.has(model.providerId)) errors.push(`unknown provider ${model.providerId} for ${model.id}`);
    if (
      model.quality &&
      (model.quality.source !== "ai-pricing" ||
        typeof model.quality.aaIndex !== "number" ||
        !Number.isFinite(model.quality.aaIndex) ||
        model.quality.aaIndex < 0)
    ) {
      errors.push(`invalid quality evidence for ${model.id}`);
    }
    for (const price of model.pricing || []) {
      if (priceIds.has(price.id)) errors.push(`duplicate price id: ${price.id}`);
      priceIds.add(price.id);
      if (!SUPPORTED_CURRENCIES.has(price.currency)) errors.push(`unsupported currency ${price.currency} in ${price.id}`);
      if (!price.rates || Object.values(price.rates).some((value) => typeof value !== "number" || value < 0)) {
        errors.push(`invalid rates in ${price.id}`);
      }
    }
  }

  for (const currency of SUPPORTED_CURRENCIES) {
    for (const model of database.models) {
      const displayPrice = model.displayPrices?.[currency];
      if (displayPrice && !priceIds.has(displayPrice.priceId)) {
        errors.push(`display price ${displayPrice.priceId} does not reference a quote`);
      }
    }
  }
  for (const aliasId of aliasIds) {
    if (database.models.some((model) => model.canonicalId === aliasId)) {
      errors.push(`applied model alias remains as canonicalId: ${aliasId}`);
    }
  }
  return errors;
}
