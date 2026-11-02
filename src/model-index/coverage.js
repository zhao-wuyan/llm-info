const NAME_LIMIT = 10;
const NAME_LENGTH = 120;

function namesPreview(names) {
  const unique = [...new Set(names.filter((name) => typeof name === "string" && name.length > 0))];
  const shown = unique.slice(0, NAME_LIMIT).map((name) => JSON.stringify(name.slice(0, NAME_LENGTH)));
  if (unique.length > NAME_LIMIT) shown.push(`… (+${unique.length - NAME_LIMIT} names)`);
  return shown.length ? `; unmapped: ${shown.join(", ")}` : "";
}

/** 覆盖不足只告警；结构与数据有效性由 validateModelIndex 负责。 */
export function modelIndexCoverageWarnings(index, catalog) {
  const warnings = [];
  for (const board of index.boards ?? []) {
    const { entries, matched, unmatched } = board.coverage ?? {};
    if (matched === 0 || unmatched > 0) {
      warnings.push(`${board.name || board.id} (${board.id}) coverage: ${matched}/${entries} matched, ${unmatched} unmatched${namesPreview(index.unmapped?.[board.id] ?? [])}`);
    }
  }
  const sources = (catalog.sources ?? []).filter((source) => source.id === "ai-pricing");
  const names = sources.flatMap((source) => source.unmappedModels ?? []);
  const count = Math.max(catalog.stats?.unmatchedQualityModels ?? 0, names.length, ...sources.map((source) => source.unmappedCount ?? 0));
  if (count > 0) warnings.push(`Quality coverage: ${count} unmatched models${namesPreview(names)}`);
  return warnings;
}
