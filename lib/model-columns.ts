import type { MessageKey } from "@/lib/i18n";
import type { ModelSortKey } from "@/lib/model-sort";

export interface ModelColumn {
  id: string;
  labelKey: MessageKey;
  sortKey: ModelSortKey | null;
  /** 价格列需要在表头附带当前币种 */
  currencySubtitle?: boolean;
  width: number;
  defaultVisible: boolean;
}

/** 模型目录可选列；`model` 名称列与末尾的详情箭头列固定显示。 */
export const modelColumns: readonly ModelColumn[] = [
  { id: "released", labelKey: "releasedAt", sortKey: "released", width: 112, defaultVisible: true },
  { id: "context", labelKey: "context", sortKey: "context", width: 90, defaultVisible: true },
  { id: "providers", labelKey: "channels", sortKey: "providers", width: 90, defaultVisible: true },
  { id: "input", labelKey: "inputPrice", sortKey: "input", currencySubtitle: true, width: 130, defaultVisible: true },
  { id: "output", labelKey: "outputPrice", sortKey: "output", currencySubtitle: true, width: 130, defaultVisible: true },
  { id: "cacheRead", labelKey: "cacheReadPrice", sortKey: "cacheRead", currencySubtitle: true, width: 130, defaultVisible: true },
  { id: "cacheWrite", labelKey: "cacheCreationPrice", sortKey: "cacheWrite", currencySubtitle: true, width: 130, defaultVisible: true },
  { id: "openWeights", labelKey: "openWeights", sortKey: null, width: 190, defaultVisible: true },
  { id: "license", labelKey: "modelLicense", sortKey: "license", width: 140, defaultVisible: true },
  { id: "downloads", labelKey: "downloads", sortKey: "downloads", width: 110, defaultVisible: true },
  { id: "likes", labelKey: "likes", sortKey: "likes", width: 100, defaultVisible: false },
  { id: "parameters", labelKey: "parameters", sortKey: "parameters", width: 110, defaultVisible: false },
  { id: "abilities", labelKey: "ability", sortKey: null, width: 170, defaultVisible: true },
];

export const modelColumnIds = modelColumns.map((column) => column.id);
export const defaultModelColumnIds = modelColumns.filter((column) => column.defaultVisible).map((column) => column.id);

/**
 * 解析用户自定义列。`explicit` 为 false（URL 未携带列配置）时回落到默认列，
 * 为 true 时允许用户把可选列全部隐藏。
 */
export function parseModelColumns(values: readonly string[], explicit: boolean): string[] {
  if (!explicit) return [...defaultModelColumnIds];
  const selected = new Set(values);
  return modelColumnIds.filter((id) => selected.has(id));
}

export function visibleModelColumns(ids: readonly string[]): ModelColumn[] {
  const selected = new Set(ids);
  return modelColumns.filter((column) => selected.has(column.id));
}
