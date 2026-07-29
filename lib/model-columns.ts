import { priceRate, releaseDateValue } from "./format";
import type { BoardMeta } from "./model-index";
import { boardLabel, indexFor } from "./model-index";
import type { Locale } from "./i18n";
import { msg, type MessageKey } from "./i18n";
import type { CanonicalModel, Currency } from "./types";

export type ColumnGroup = "base" | "price" | "open" | "board";

export interface ColumnDef {
  id: string;
  group: ColumnGroup;
  label: (locale: Locale) => string;
  subtitle?: (currency: Currency) => string;
  defaultVisible: boolean;
  sortable: boolean;
  numeric: boolean;
  /** Optional external evidence link rendered on the table header. */
  sourceUrl?: string;
  sourceLabel?: string;
  boardId?: string;
}

const literal = (value: string) => () => value;
const translated = (key: MessageKey) => (locale: Locale) => msg(locale, key);

const BASE_COLUMNS: ColumnDef[] = [
  { id: "released", group: "base", label: translated("releasedAt"), defaultVisible: true, sortable: true, numeric: true },
  { id: "context", group: "base", label: translated("context"), defaultVisible: true, sortable: true, numeric: true },
  { id: "maxOutput", group: "base", label: translated("maxOutput"), defaultVisible: false, sortable: true, numeric: true },
  { id: "providers", group: "base", label: translated("channels"), defaultVisible: true, sortable: true, numeric: true },
  { id: "input", group: "price", label: translated("inputPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "output", group: "price", label: translated("outputPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "cacheRead", group: "price", label: translated("cacheReadPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "cacheWrite", group: "price", label: translated("cacheCreationPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "weights", group: "open", label: translated("weights"), defaultVisible: true, sortable: true, numeric: false, sourceUrl: "https://huggingface.co/models", sourceLabel: "Hugging Face Hub" },
  { id: "license", group: "open", label: translated("modelLicense"), defaultVisible: true, sortable: true, numeric: false, sourceUrl: "https://huggingface.co/docs/hub/repositories-licenses", sourceLabel: "Hugging Face Hub" },
  { id: "parameters", group: "open", label: translated("parameters"), defaultVisible: false, sortable: true, numeric: true },
  { id: "downloads", group: "open", label: translated("hfDownloads"), defaultVisible: false, sortable: true, numeric: true, sourceUrl: "https://huggingface.co/models?sort=downloads", sourceLabel: "Hugging Face Hub" },
  { id: "likes", group: "open", label: translated("hfLikes"), defaultVisible: false, sortable: true, numeric: true, sourceUrl: "https://huggingface.co/models?sort=likes", sourceLabel: "Hugging Face Hub" },
  { id: "ability", group: "base", label: translated("ability"), defaultVisible: true, sortable: false, numeric: false },
];

const DEFAULT_VISIBLE_BOARDS = new Set(["aaindex", "lmarena-text"]);

export function boardColumn(board: BoardMeta): ColumnDef {
  return {
    id: `board:${board.id}`,
    group: "board",
    label: (locale) => boardLabel(board, locale),
    subtitle: () => board.name,
    defaultVisible: DEFAULT_VISIBLE_BOARDS.has(board.id),
    sortable: true,
    numeric: true,
    sourceUrl: board.homepageUrl,
    sourceLabel: board.sourceName,
    boardId: board.id,
  };
}

export function buildModelColumns(boards: readonly BoardMeta[]): ColumnDef[] {
  const boardColumns = boards.map(boardColumn);
  const abilityIndex = BASE_COLUMNS.findIndex((column) => column.id === "ability");
  return [...BASE_COLUMNS.slice(0, abilityIndex), ...boardColumns, ...BASE_COLUMNS.slice(abilityIndex)];
}

export function defaultColumnIds(columns: readonly ColumnDef[]) {
  return columns.filter((column) => column.defaultVisible).map((column) => column.id);
}

/**
 * Parse the `cols` query parameter.
 * Empty → defaults, `all` → everything, otherwise the requested subset in registry order.
 */
export function parseVisibleColumns(value: string, columns: readonly ColumnDef[]) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return defaultColumnIds(columns);
  if (trimmed === "all") return columns.map((column) => column.id);
  const requested = new Set(trimmed.split(",").map((item) => item.trim()).filter(Boolean));
  const resolved = columns.filter((column) => requested.has(column.id)).map((column) => column.id);
  return resolved.length ? resolved : defaultColumnIds(columns);
}

export function serializeColumns(ids: readonly string[], columns: readonly ColumnDef[]) {
  const defaults = defaultColumnIds(columns);
  const ordered = columns.filter((column) => ids.includes(column.id)).map((column) => column.id);
  if (ordered.length === defaults.length && ordered.every((id, index) => id === defaults[index])) return "";
  return ordered.join(",");
}

export interface ColumnContext {
  currency: Currency;
}

const priceKeys: Record<string, string> = {
  input: "textInput",
  output: "textOutput",
  cacheRead: "textInput_cacheRead",
  cacheWrite: "textInput_cacheWrite",
};

/** Sort value for any registry column; `null` sinks to the bottom of the table. */
export function columnSortValue(columnId: string, model: CanonicalModel, { currency }: ColumnContext): number | string | null {
  if (columnId.startsWith("board:")) return indexFor(model.canonicalId).boards[columnId.slice(6)]?.score ?? null;
  if (priceKeys[columnId]) return priceRate(model.displayPrices[currency], priceKeys[columnId]);
  const facts = indexFor(model.canonicalId).openWeights;
  switch (columnId) {
    case "released": return releaseDateValue(model.releasedAt);
    case "context": return model.contextWindow ?? null;
    case "maxOutput": return model.maxOutput ?? null;
    case "providers": return model.providerCount;
    case "name": return model.name;
    case "weights": return facts ? 1 : model.openWeights ? 0.5 : 0;
    case "license": return facts?.license ?? null;
    case "parameters": return facts?.parameters ?? null;
    case "downloads": return facts?.popularity.downloads30d ?? null;
    case "likes": return facts?.popularity.likes ?? null;
    default: return null;
  }
}

export function isSortableColumn(columnId: string, columns: readonly ColumnDef[]) {
  return columnId === "name" || columns.some((column) => column.id === columnId && column.sortable);
}
