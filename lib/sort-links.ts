import type { SortOrder } from "./table-sort";

/**
 * 服务端页面共享的三态排序链接构造器（null→asc→desc→null）。
 * URL 生成结果与各页面原内联实现逐字节一致（e2e 锁定 URL 参数语义）：
 * - baseQuery 缺省时等价于原详情页的无参数拼接；
 * - onClear 吸收 compare 页清除态写入 sort=none 的差异。
 */
export function createSortLinks<K extends string>({ basePath, sort, order, baseQuery, onClear }: { basePath: string; sort: K | null; order: SortOrder | null; baseQuery?: (includeSort?: boolean) => URLSearchParams; onClear?: (query: URLSearchParams) => void }): { directionFor: (key: K) => SortOrder | null; sortLinkFor: (key: K) => string } {
  const directionFor = (key: K) => sort === key ? order : null;
  const sortLinkFor = (key: K) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const query = baseQuery ? baseQuery(false) : new URLSearchParams();
    if (nextOrder) {
      query.set("sort", key);
      query.set("order", nextOrder);
    } else onClear?.(query);
    return query.size ? `${basePath}?${query}` : basePath;
  };
  return { directionFor, sortLinkFor };
}
