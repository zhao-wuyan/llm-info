import { describe, expect, test } from "vitest";
import { compareNullable, nextSortState, stableSort } from "@/lib/table-sort";

describe("shared table sorting", () => {
  test("cycles ascending, descending, and unsorted", () => {
    expect(nextSortState(null, null, "value")).toEqual({ key: "value", order: "asc" });
    expect(nextSortState("value", "asc", "value")).toEqual({ key: "value", order: "desc" });
    expect(nextSortState("value", "desc", "value")).toEqual({ key: null, order: null });
    expect(nextSortState("value", "desc", "name")).toEqual({ key: "name", order: "asc" });
  });

  test("keeps missing values last in both directions", () => {
    const values = [null, 4, 1, undefined, 7];
    expect(stableSort(values, (left, right) => compareNullable(left, right, "asc"))).toEqual([1, 4, 7, null, undefined]);
    expect(stableSort(values, (left, right) => compareNullable(left, right, "desc"))).toEqual([7, 4, 1, null, undefined]);
  });
});
