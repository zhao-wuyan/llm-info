import { priceRate, releaseDateValue } from "@/lib/format";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";
import type { CanonicalModel, Currency } from "@/lib/types";

export const modelSortKeys = [
  "name",
  "released",
  "context",
  "providers",
  "input",
  "output",
  "cacheRead",
  "cacheWrite",
  "license",
  "downloads",
  "likes",
  "parameters",
] as const;

export type ModelSortKey = typeof modelSortKeys[number];
export type ModelSortOrder = SortOrder;

const priceRateKeys = {
  input: "textInput",
  output: "textOutput",
  cacheRead: "textInput_cacheRead",
  cacheWrite: "textInput_cacheWrite",
} as const;

const descendingByDefault = new Set<ModelSortKey>(["released", "context", "providers", "downloads", "likes", "parameters"]);

export function parseModelSortKey(value: string): ModelSortKey | null {
  if (value === "price") return "input";
  return modelSortKeys.includes(value as ModelSortKey) ? value as ModelSortKey : null;
}

export function parseModelSortOrder(value: string, rawSort: string): ModelSortOrder | null {
  if (value === "asc" || value === "desc") return value;
  if (!rawSort) return null;
  return descendingByDefault.has(rawSort as ModelSortKey) ? "desc" : "asc";
}

function numericValue(model: CanonicalModel, key: Exclude<ModelSortKey, "name" | "license">, currency: Currency) {
  if (key === "released") return releaseDateValue(model.releasedAt);
  if (key === "context") return model.contextWindow ?? null;
  if (key === "providers") return model.providerCount;
  if (key === "downloads") return model.weights?.downloads ?? null;
  if (key === "likes") return model.weights?.likes ?? null;
  if (key === "parameters") return model.weights?.parameters ?? null;
  return priceRate(model.displayPrices[currency], priceRateKeys[key]);
}

export function sortCanonicalModels(models: readonly CanonicalModel[], key: ModelSortKey | null, order: ModelSortOrder | null, currency: Currency) {
  if (!key || !order) return [...models];
  return stableSort(models, (left, right) => {
      if (key === "name") {
        return compareNullable(left.name, right.name, order);
      }
      if (key === "license") {
        return compareNullable(left.weights?.license ?? null, right.weights?.license ?? null, order) || left.name.localeCompare(right.name);
      }
      return compareNullable(numericValue(left, key, currency), numericValue(right, key, currency), order) || left.name.localeCompare(right.name);
    });
}
