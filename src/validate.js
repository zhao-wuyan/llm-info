const SUPPORTED_CURRENCIES = new Set(["USD", "CNY"]);

export function validateDatabase(database) {
  const errors = [];
  if (database?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(database?.providers)) errors.push("providers must be an array");
  if (!Array.isArray(database?.models)) errors.push("models must be an array");
  if (errors.length > 0) return errors;

  const providerIds = new Set(database.providers.map((provider) => provider.id));
  const modelIds = new Set();
  const priceIds = new Set();
  for (const model of database.models) {
    if (modelIds.has(model.id)) errors.push(`duplicate model id: ${model.id}`);
    modelIds.add(model.id);
    if (!providerIds.has(model.providerId)) errors.push(`unknown provider ${model.providerId} for ${model.id}`);
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
  return errors;
}
