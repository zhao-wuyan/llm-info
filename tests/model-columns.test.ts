import { describe, expect, it } from "vitest";
import { canonicalModels } from "@/lib/catalog";
import {
  defaultModelColumnIds,
  modelColumnIds,
  modelColumns,
  parseModelColumns,
  visibleModelColumns,
} from "@/lib/model-columns";
import { sortCanonicalModels } from "@/lib/model-sort";

describe("model list column customization", () => {
  it("falls back to the default columns when the URL carries no configuration", () => {
    expect(parseModelColumns([], false)).toEqual(defaultModelColumnIds);
    expect(parseModelColumns(["license"], false)).toEqual(defaultModelColumnIds);
  });

  it("honors an explicit selection, including hiding every optional column", () => {
    expect(parseModelColumns(["license", "downloads"], true)).toEqual(["license", "downloads"]);
    expect(parseModelColumns([], true)).toEqual([]);
    expect(parseModelColumns(["unknown-column"], true)).toEqual([]);
  });

  it("keeps the declared column order regardless of the URL order", () => {
    expect(parseModelColumns(["abilities", "released"], true)).toEqual(["released", "abilities"]);
    expect(visibleModelColumns(["downloads", "context"]).map((column) => column.id)).toEqual(["context", "downloads"]);
  });

  it("exposes open weights, license, and popularity columns with sortable keys", () => {
    expect(modelColumnIds).toContain("openWeights");
    expect(modelColumns.find((column) => column.id === "license")?.sortKey).toBe("license");
    expect(modelColumns.find((column) => column.id === "downloads")?.sortKey).toBe("downloads");
    expect(modelColumns.find((column) => column.id === "likes")?.sortKey).toBe("likes");
    expect(modelColumns.find((column) => column.id === "openWeights")?.sortKey).toBeNull();
  });
});

describe("open weights evidence in the catalog", () => {
  const withWeights = canonicalModels.filter((model) => model.weights);

  it("links every weights record to a Hugging Face repository", () => {
    expect(withWeights.length).toBeGreaterThan(0);
    expect(withWeights.every((model) => model.weights?.repoUrl === `https://huggingface.co/${model.weights?.repoId}`)).toBe(true);
    expect(withWeights.every((model) => model.openWeights === true)).toBe(true);
    expect(withWeights.every((model) => model.sourceRefs.some((ref) => ref.source === "huggingface"))).toBe(true);
  });

  it("normalizes licenses into SPDX, custom, or unknown", () => {
    expect(withWeights.every((model) => ["spdx", "custom", "unknown"].includes(model.weights!.licenseType))).toBe(true);
    expect(withWeights.filter((model) => model.weights!.licenseType === "spdx").length).toBeGreaterThan(0);
    expect(withWeights.every((model) => (model.weights!.licenseType === "unknown") === (model.weights!.license === null))).toBe(true);
  });

  it("sorts popularity and license columns with missing values last", () => {
    for (const key of ["downloads", "likes", "parameters"] as const) {
      const values = sortCanonicalModels(canonicalModels, key, "desc", "USD").map((model) => model.weights?.[key] ?? null);
      const present = values.filter((value): value is number => value != null);
      expect(present).toEqual([...present].sort((left, right) => right - left));
      expect(values.slice(present.length).every((value) => value == null)).toBe(true);
    }

    const licenses = sortCanonicalModels(canonicalModels, "license", "asc", "USD").map((model) => model.weights?.license ?? null);
    const presentLicenses = licenses.filter((value): value is string => value != null);
    expect(presentLicenses).toEqual([...presentLicenses].sort((left, right) => left.localeCompare(right)));
    expect(licenses.slice(presentLicenses.length).every((value) => value == null)).toBe(true);
  });
});
