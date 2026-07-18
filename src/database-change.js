function withoutVolatileMetadata(database) {
  const comparable = structuredClone(database);
  comparable.generatedAt = null;

  for (const source of comparable.sources || []) {
    source.observedAt = null;
    if ("revision" in source) source.revision = null;
    if ("licenseCheckedAt" in source) source.licenseCheckedAt = null;
  }
  for (const model of comparable.models || []) {
    for (const price of model.pricing || []) price.observedAt = null;
    if (model.quality) {
      model.quality.observedAt = null;
      model.quality.revision = null;
    }
  }
  return comparable;
}

export function hasMeaningfulChanges(previous, current) {
  return JSON.stringify(withoutVolatileMetadata(previous)) !== JSON.stringify(withoutVolatileMetadata(current));
}
