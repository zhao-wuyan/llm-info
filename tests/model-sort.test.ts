import { describe, expect, test } from "vitest";
import { canonicalModels } from "@/lib/catalog";
import { priceRate } from "@/lib/format";
import { sortCanonicalModels, type ModelSortKey } from "@/lib/model-sort";
import type { CanonicalModel } from "@/lib/types";

const numericValue = (model: CanonicalModel, key: Exclude<ModelSortKey, "name">) => {
  if (key === "context") return model.contextWindow ?? null;
  if (key === "providers") return model.providerCount;
  const rate = key === "input" ? "textInput" : key === "output" ? "textOutput" : key === "cacheRead" ? "textInput_cacheRead" : "textInput_cacheWrite";
  return priceRate(model.displayPrices.USD, rate);
};

describe("model list sorting", () => {
  test("keeps the catalog order when sorting is disabled", () => {
    const sorted = sortCanonicalModels(canonicalModels, null, null, "USD");
    expect(sorted.map((model) => model.canonicalId)).toEqual(canonicalModels.map((model) => model.canonicalId));
  });

  test.each(["context", "providers", "input", "output", "cacheRead", "cacheWrite"] as const)("sorts the complete %s dataset in both directions and keeps missing values last", (key) => {
    for (const order of ["asc", "desc"] as const) {
      const sorted = sortCanonicalModels(canonicalModels, key, order, "USD");
      const values = sorted.map((model) => numericValue(model, key));
      const present = values.filter((value): value is number => value != null);
      const expected = [...present].sort((a, b) => order === "asc" ? a - b : b - a);
      expect(present).toEqual(expected);
      expect(values.slice(present.length).every((value) => value == null)).toBe(true);
    }
  });

  test("sorts before the complete dataset is split into pages", () => {
    const sorted = sortCanonicalModels(canonicalModels, "providers", "asc", "USD");
    const firstPage = sorted.slice(0, 20);
    const secondPage = sorted.slice(20, 40);
    expect(sorted).toHaveLength(canonicalModels.length);
    expect(firstPage.at(-1)!.providerCount).toBeLessThanOrEqual(secondPage[0].providerCount);
  });
});
