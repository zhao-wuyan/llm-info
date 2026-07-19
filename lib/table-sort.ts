export type SortOrder = "asc" | "desc";

export function nextSortState<Key extends string>(currentKey: Key | null, currentOrder: SortOrder | null, key: Key) {
  if (currentKey !== key || currentOrder === null) return { key, order: "asc" as const };
  if (currentOrder === "asc") return { key, order: "desc" as const };
  return { key: null, order: null };
}

export function compareNullable(left: number | string | null | undefined, right: number | string | null | undefined, order: SortOrder) {
  if (left == null || right == null) {
    if (left == null && right == null) return 0;
    return left == null ? 1 : -1;
  }
  const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
  return order === "asc" ? result : -result;
}

export function stableSort<T>(items: readonly T[], compare: (left: T, right: T) => number) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compare(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}
