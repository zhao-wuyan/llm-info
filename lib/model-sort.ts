import { priceRate } from "@/lib/format";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";
import type { CanonicalModel, Currency } from "@/lib/types";

export const modelSortKeys = ["name", "context", "providers", "input", "output", "cacheRead", "cacheWrite"] as const;

export type ModelSortKey = typeof modelSortKeys[number];
export type ModelSortOrder = SortOrder;

const priceRateKeys = {
  input: "textInput",
  output: "textOutput",
  cacheRead: "textInput_cacheRead",
  cacheWrite: "textInput_cacheWrite",
} as const;

export function parseModelSortKey(value: string): ModelSortKey | null {
  if (value === "price") return "input";
  return modelSortKeys.includes(value as ModelSortKey) ? value as ModelSortKey : null;
}

export function parseModelSortOrder(value: string, rawSort: string): ModelSortOrder | null {
  if (value === "asc" || value === "desc") return value;
  if (!rawSort) return null;
  return rawSort === "context" || rawSort === "providers" ? "desc" : "asc";
}

function numericValue(model: CanonicalModel, key: Exclude<ModelSortKey, "name">, currency: Currency) {
  if (key === "context") return model.contextWindow ?? null;
  if (key === "providers") return model.providerCount;
  return priceRate(model.minPrices[currency], priceRateKeys[key]);
}

export function sortCanonicalModels(models: readonly CanonicalModel[], key: ModelSortKey | null, order: ModelSortOrder | null, currency: Currency) {
  if (!key || !order) return [...models];
  return stableSort(models, (left, right) => {
      if (key === "name") {
        return compareNullable(left.name, right.name, order);
      }
      return compareNullable(numericValue(left, key, currency), numericValue(right, key, currency), order) || left.name.localeCompare(right.name);
    });
}
