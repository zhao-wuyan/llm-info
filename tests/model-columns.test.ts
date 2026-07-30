import { describe, expect, test } from "vitest";
import { canonicalModels } from "@/lib/catalog";
import {
  buildModelColumns, columnSortValue, defaultColumnIds, isSortableColumn, parseVisibleColumns, serializeColumns,
} from "@/lib/model-columns";
import { boards, indexFor, licenseTone, formatParameters } from "@/lib/model-index";

const columns = buildModelColumns(boards);

describe("model column registry", () => {
  test("exposes one column per leaderboard plus the open-weight dimensions", () => {
    for (const board of boards) expect(columns.some((column) => column.id === `board:${board.id}`)).toBe(true);
    for (const id of ["weights", "license", "parameters", "downloads", "likes", "lifecycle"]) {
      expect(columns.some((column) => column.id === id)).toBe(true);
    }
    expect(columns.find((column) => column.id === "lifecycle")?.defaultVisible).toBe(false);
  });

  test("falls back to the default column set for empty or unknown selections", () => {
    const defaults = defaultColumnIds(columns);
    expect(parseVisibleColumns("", columns)).toEqual(defaults);
    expect(parseVisibleColumns("does-not-exist", columns)).toEqual(defaults);
    expect(parseVisibleColumns("all", columns)).toEqual(columns.map((column) => column.id));
  });

  test("keeps requested columns in registry order and round-trips the query value", () => {
    const requested = "license,context,board:lmarena-text";
    const visible = parseVisibleColumns(requested, columns);
    expect(visible).toEqual(columns.filter((column) => requested.split(",").includes(column.id)).map((column) => column.id));
    expect(parseVisibleColumns(serializeColumns(visible, columns), columns)).toEqual(visible);
    expect(serializeColumns(defaultColumnIds(columns), columns)).toBe("");
  });

  test("marks board and open-weight columns sortable", () => {
    expect(isSortableColumn("board:aaindex", columns)).toBe(true);
    expect(isSortableColumn("downloads", columns)).toBe(true);
    expect(isSortableColumn("lifecycle", columns)).toBe(true);
    expect(isSortableColumn("ability", columns)).toBe(false);
    expect(isSortableColumn("nope", columns)).toBe(false);
  });

  test("reads sort values from the model index and returns null when a board has no score", () => {
    const scored = canonicalModels.find((model) => Object.keys(indexFor(model.canonicalId).boards).length > 0);
    expect(scored).toBeDefined();
    const boardId = Object.keys(indexFor(scored!.canonicalId).boards)[0];
    expect(columnSortValue(`board:${boardId}`, scored!, { currency: "USD" }))
      .toBe(indexFor(scored!.canonicalId).boards[boardId].score);

    const unscored = canonicalModels.find((model) => Object.keys(indexFor(model.canonicalId).boards).length === 0);
    expect(columnSortValue("board:aaindex", unscored!, { currency: "USD" })).toBeNull();
    expect(columnSortValue("providers", unscored!, { currency: "USD" })).toBe(unscored!.providerCount);
  });
});

describe("open weight facts", () => {
  test("buckets licenses by commercial friendliness", () => {
    expect(licenseTone("apache-2.0")).toBe("permissive");
    expect(licenseTone("mit")).toBe("permissive");
    expect(licenseTone("cc-by-nc-4.0")).toBe("restricted");
    expect(licenseTone("llama3.1")).toBe("custom");
    expect(licenseTone(null)).toBe("unknown");
  });

  test("formats parameter counts compactly", () => {
    expect(formatParameters(235_093_634_560)).toBe("235B");
    expect(formatParameters(7_242_000_000)).toBe("7.2B");
    expect(formatParameters(751_632_384)).toBe("752M");
    expect(formatParameters(null)).toBe("-");
  });

  test("every indexed open-weight model carries a Hugging Face repo id", () => {
    const indexed = canonicalModels.map((model) => indexFor(model.canonicalId)).filter((record) => record.openWeights);
    expect(indexed.length).toBeGreaterThan(0);
    for (const record of indexed) expect(record.openWeights?.repoId).toBeTruthy();
  });
});
