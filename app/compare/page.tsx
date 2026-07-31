import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { ColumnPicker } from "@/components/column-picker";
import { EmptyState, EntityText, PageHeader, Pagination, ResetFilterLink, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels } from "@/lib/catalog";
import { compactNumber, formatPrice, formatReleaseDate, isExplicitlyFree, priceRate, releaseDateValue } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { boardById, boardLabel, boards, indexFor, type ModelIndexRecord } from "@/lib/model-index";
import { boardColumn, defaultColumnIds, parseExplicitColumns, serializeColumns, toColumnPickerOptions, type ColumnDef } from "@/lib/model-columns";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";
import { formatScore } from "@/components/model-cells";

type Params = Promise<Record<string, string | string[] | undefined>>;
type PriceMetric = "textInput" | "textOutput" | "textInput_cacheRead" | "textInput_cacheWrite";
type MetricTone = "quality" | "input" | "output" | "cache-read" | "cache-write" | "context";
type CompareModel = typeof canonicalModels[number];
type CompareRow = {
  model: CompareModel;
  releasedValue: number | null;
  contextValue: number | null;
  price: CompareModel["displayPrices"][keyof CompareModel["displayPrices"]];
  priceValues: Record<PriceMetric, number | null>;
  boardRecords: ModelIndexRecord["boards"];
};

const PAGE_SIZE = 50;

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const many = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];
const priceMetrics: PriceMetric[] = ["textInput", "textOutput", "textInput_cacheRead", "textInput_cacheWrite"];
const priceMetricTones: Record<PriceMetric, MetricTone> = {
  textInput: "input",
  textOutput: "output",
  textInput_cacheRead: "cache-read",
  textInput_cacheWrite: "cache-write",
};
const metricByColumn: Partial<Record<string, PriceMetric>> = {
  input: "textInput",
  output: "textOutput",
  cacheRead: "textInput_cacheRead",
  cacheWrite: "textInput_cacheWrite",
};

/** Compare columns: every leaderboard plus the fixed price/context metrics. */
const compareColumns: ColumnDef[] = [
  ...boards.map((board) => ({ ...boardColumn(board), defaultVisible: true })),
  { id: "input", group: "price", label: (locale) => msg(locale, "inputPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "output", group: "price", label: (locale) => msg(locale, "outputPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "cacheRead", group: "price", label: (locale) => msg(locale, "cacheReadPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "cacheWrite", group: "price", label: (locale) => msg(locale, "cacheCreationPrice"), subtitle: (currency) => currency, defaultVisible: true, sortable: true, numeric: true },
  { id: "context", group: "base", label: (locale) => msg(locale, "context"), defaultVisible: true, sortable: true, numeric: true },
  { id: "vision", group: "base", label: (locale) => abilityMsg(locale, "vision"), defaultVisible: true, sortable: false, numeric: false },
];

function maxValue(values: Array<number | null | undefined>) {
  return Math.max(0, ...values.filter((value): value is number => value != null && Number.isFinite(value)));
}

function MetricBar({ label, value, max, display, tone, annotation }: { label: string; value: number | null | undefined; max: number; display: string; tone: MetricTone; annotation?: string }) {
  const width = value == null || max <= 0 ? 0 : Math.min(100, Math.max(value > 0 ? 4 : 0, (value / max) * 100));
  const className = `comparison-bar${value == null ? " is-missing" : ""}`;
  const accessibleValue = annotation ? `${display}, ${annotation}` : display;
  return <div className={className} data-tone={tone} role="img" aria-label={`${label}: ${accessibleValue}`}>
    <span className="comparison-bar-track">
      <i aria-hidden style={{ width: `${width}%` }} />
      <span className="comparison-bar-value" aria-hidden>{annotation && <small>{annotation}</small>}<strong>{display}</strong></span>
    </span>
  </div>;
}

export default async function ComparePage({ searchParams }: { searchParams: Params }) {
  const [locale, currency, params] = await Promise.all([getLocale(), getCurrency(), searchParams]);
  const q = one(params.q).toLowerCase();
  const owner = one(params.owner);
  const board = one(params.board);
  const ability = one(params.ability);
  const requestedPage = Math.max(1, Number(one(params.page)) || 1);
  const rawSort = one(params.sort);
  const sortDisabled = rawSort === "none";
  const sortable = new Set(["name", "released", ...compareColumns.filter((column) => column.sortable).map((column) => column.id)]);
  const sort = sortDisabled ? null : sortable.has(rawSort) ? rawSort : `board:${boards[0]?.id ?? "aaindex"}`;
  const rawOrder = one(params.order);
  const order: SortOrder | null = sort ? rawOrder === "asc" || rawOrder === "desc" ? rawOrder : sort === "name" ? "asc" : "desc" : null;
  const colsParam = params.cols;
  const hasUrlColumns = colsParam !== undefined;
  const visibleColumnIds = hasUrlColumns ? parseExplicitColumns(many(colsParam).join(","), compareColumns) : defaultColumnIds(compareColumns);
  const visibleColumns = compareColumns.filter((column) => visibleColumnIds.includes(column.id));
  const compareOptions = toColumnPickerOptions(compareColumns, locale, currency);

  // 多榜单合集：任一榜单有数据即进入对比（缺失的单元格留空）。
  const ranked = canonicalModels
    .map((model) => ({ model, boardRecords: indexFor(model.canonicalId).boards }))
    .filter(({ boardRecords }) => board ? boardRecords[board] : Object.keys(boardRecords).length > 0);
  const owners = [...new Set(ranked.map(({ model }) => model.ownerId))].sort();
  const filtered = ranked.filter(({ model }) =>
    (!q || `${model.name} ${model.canonicalId}`.toLowerCase().includes(q))
    && (!owner || model.ownerId === owner)
    && (!ability || model.abilities[ability]));
  const unsortedRows: CompareRow[] = filtered.map(({ model, boardRecords }) => {
    const price = model.displayPrices[currency];
    return {
      model,
      releasedValue: releaseDateValue(model.releasedAt),
      contextValue: model.contextWindow ?? null,
      price,
      priceValues: {
        textInput: priceRate(price, "textInput"),
        textOutput: priceRate(price, "textOutput"),
        textInput_cacheRead: priceRate(price, "textInput_cacheRead"),
        textInput_cacheWrite: priceRate(price, "textInput_cacheWrite"),
      },
      boardRecords,
    };
  });
  const sortValue = (row: CompareRow) => {
    if (!sort) return null;
    if (sort.startsWith("board:")) return row.boardRecords[sort.slice(6)]?.score ?? null;
    if (sort === "released") return row.releasedValue;
    if (sort === "context") return row.contextValue;
    const metric = metricByColumn[sort];
    return metric ? row.priceValues[metric] : null;
  };
  const completeRows = sort && order ? stableSort(unsortedRows, (left, right) => sort === "name"
    ? compareNullable(left.model.name, right.model.name, order)
    : compareNullable(sortValue(left), sortValue(right), order) || left.model.name.localeCompare(right.model.name)) : unsortedRows;

  const maxima = {
    context: maxValue(completeRows.map((row) => row.contextValue)),
    ...Object.fromEntries(priceMetrics.map((metric) => [metric, maxValue(completeRows.map((row) => row.priceValues[metric]))])),
    ...Object.fromEntries(boards.map((item) => [`board:${item.id}`, maxValue(completeRows.map((row) => row.boardRecords[item.id]?.score))])),
  } as Record<string, number>;
  const pages = Math.max(1, Math.ceil(completeRows.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pages);
  const rows = completeRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const priceLabels: Record<PriceMetric, string> = {
    textInput: msg(locale, "inputPrice"),
    textOutput: msg(locale, "outputPrice"),
    textInput_cacheRead: msg(locale, "cacheReadPrice"),
    textInput_cacheWrite: msg(locale, "cacheCreationPrice"),
  };
  const serializedColumns = serializeColumns(visibleColumnIds, compareColumns);
  const baseQuery = (includeSort = true) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (owner) query.set("owner", owner);
    if (board) query.set("board", board);
    if (ability) query.set("ability", ability);
    if (serializedColumns) query.set("cols", serializedColumns);
    if (includeSort && sortDisabled) query.set("sort", "none");
    else if (includeSort && sort && order) { query.set("sort", sort); query.set("order", order); }
    return query;
  };
  const pageLinkFor = (nextPage: number) => {
    const query = baseQuery();
    query.set("page", String(nextPage));
    return `/compare?${query}`;
  };
  const directionFor = (key: string) => sort === key ? order : null;
  const sortLinkFor = (key: string) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const query = baseQuery(false);
    if (nextOrder) { query.set("sort", key); query.set("order", nextOrder); }
    else query.set("sort", "none");
    return query.size ? `/compare?${query}` : "/compare";
  };
  const resetColumnsHref = () => {
    const query = baseQuery();
    query.delete("cols");
    return query.size ? `/compare?${query}` : "/compare";
  };
  const resetFiltersHref = () => {
    const query = new URLSearchParams();
    if (serializedColumns) query.set("cols", serializedColumns);
    const defaultSort = `board:${boards[0]?.id ?? "aaindex"}`;
    query.set("sort", defaultSort);
    query.set("order", "desc");
    return `/compare?${query}`;
  };

  const cellFor = (row: CompareRow, column: ColumnDef) => {
    if (column.boardId) {
      const score = row.boardRecords[column.boardId];
      const label = boardLabel(boards.find((item) => item.id === column.boardId)!, locale);
      return <td className="comparison-cell" key={column.id} title={score ? `${score.sourceModel}${score.rank ? ` · #${score.rank}` : ""}` : undefined}>
        <MetricBar label={label} value={score?.score ?? null} max={maxima[`board:${column.boardId}`] ?? 0} display={score?.score != null ? formatScore(score.score, boardById.get(column.boardId)?.kind) : "-"} tone="quality" />
      </td>;
    }
    if (column.id === "context") {
      return <td className="comparison-cell" key={column.id}><MetricBar label={msg(locale, "context")} value={row.contextValue} max={maxima.context} display={compactNumber(row.contextValue ?? undefined)} tone="context" /></td>;
    }
    if (column.id === "vision") {
      return <td className="ability-comparison-cell" key={column.id}><span className={row.model.abilities.vision ? "tag success" : "tag"}>{msg(locale, row.model.abilities.vision ? "supported" : "unsupported")}</span></td>;
    }
    const metric = metricByColumn[column.id];
    if (!metric) return <td key={column.id}><span className="missing">-</span></td>;
    const value = row.priceValues[metric];
    return <td className="comparison-cell" key={column.id}>
      <MetricBar label={`${currency} ${priceLabels[metric]}`} value={value} max={maxima[metric] ?? 0} display={formatPrice(value, currency)} tone={priceMetricTones[metric]} annotation={value != null && isExplicitlyFree(row.price) ? msg(locale, "free") : undefined} />
    </td>;
  };

  return <AppShell locale={locale} section={msg(locale, "compare")}>
    <PageHeader title={msg(locale, "compare")} description={msg(locale, "qualityDescription")} />
    <AutoSubmitForm className="toolbar">
      <SearchField defaultValue={one(params.q)} placeholder={msg(locale, "searchModels")} />
      <select name="owner" defaultValue={owner} aria-label="Owner"><option value="">Owner</option>{owners.map((value) => <option key={value}>{value}</option>)}</select>
      <select name="board" defaultValue={board} aria-label={msg(locale, "leaderboards")}>
        <option value="">{msg(locale, "leaderboards")}</option>
        {boards.map((item) => <option key={item.id} value={item.id}>{boardLabel(item, locale)}</option>)}
      </select>
      <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}><option value="">{msg(locale, "allAbilities")}</option><option value="reasoning">{abilityMsg(locale, "reasoning")}</option><option value="toolCall">{abilityMsg(locale, "toolCall")}</option><option value="vision">{abilityMsg(locale, "vision")}</option></select>
      <ColumnPicker options={compareOptions} visible={visibleColumnIds} locale={locale} resetHref={resetColumnsHref()} storageKey="llm-info:compare:columns:v1" hasUrlColumns={hasUrlColumns} />
      {sortDisabled
        ? <input type="hidden" name="sort" value="none" />
        : sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
      <ResetFilterLink href={resetFiltersHref()} locale={locale} />
    </AutoSubmitForm>
    <div className="board-strip">{boards.map((item) => <a key={item.id} href={item.homepageUrl} target="_blank" rel="noreferrer" title={`${msg(locale, "viewSource")}: ${item.sourceName}`}>
      <span>{boardLabel(item, locale)}</span>
      <strong>{item.coverage.matched}</strong>
      <small>{item.sourceName.split(" (")[0]}</small>
    </a>)}</div>
    <div className="table-frame">
      {rows.length ? <div className="table-scroll"><table className="data-table compare-table">
        <thead><tr>
          <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
          <SortableHeader label={msg(locale, "releasedAt")} direction={directionFor("released")} href={sortLinkFor("released")} locale={locale} />
          {visibleColumns.map((column) => column.sortable
            ? <SortableHeader key={column.id} label={column.label(locale)} subtitle={column.subtitle?.(currency)} direction={directionFor(column.id)} href={sortLinkFor(column.id)} locale={locale} sourceUrl={column.sourceUrl} sourceLabel={column.sourceLabel} />
            : <th key={column.id}>{column.label(locale)}</th>)}
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.model.canonicalId}>
          <td className="entity-cell"><Link className="entity-name" href={modelHref(row.model.canonicalId)}><EntityText name={row.model.name} id={row.model.canonicalId} /></Link></td>
          <td className="mono release-date-cell">{formatReleaseDate(row.model.releasedAt)}</td>
          {visibleColumns.map((column) => cellFor(row, column))}
        </tr>)}</tbody>
      </table></div> : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
      <div className="table-footer">
        <span>{completeRows.length} / {ranked.length} {msg(locale, "mappedModels")} · {visibleColumnIds.length}/{compareColumns.length} {msg(locale, "columns")}</span>
        <Pagination page={currentPage} pages={pages} href={pageLinkFor} />
      </div>
    </div>
  </AppShell>;
}
