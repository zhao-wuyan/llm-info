import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { ColumnPicker } from "@/components/column-picker";
import { EmptyState, EntityText, PageHeader, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels, catalog } from "@/lib/catalog";
import { compactNumber, formatPrice, formatReleaseDate, isExplicitlyFree, priceRate, releaseDateValue } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { boardLabel, boards, indexFor } from "@/lib/model-index";
import { boardColumn, parseVisibleColumns, serializeColumns, type ColumnDef } from "@/lib/model-columns";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

type Params = Promise<Record<string, string | string[] | undefined>>;
type PriceMetric = "textInput" | "textOutput" | "textInput_cacheRead" | "textInput_cacheWrite";
type MetricTone = "quality" | "input" | "output" | "cache-read" | "cache-write" | "context";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const many = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];
const priceMetrics: PriceMetric[] = ["textInput", "textOutput", "textInput_cacheRead", "textInput_cacheWrite"];
const priceMetricTones: Record<PriceMetric, MetricTone> = {
  textInput: "input",
  textOutput: "output",
  textInput_cacheRead: "cache-read",
  textInput_cacheWrite: "cache-write",
};
const priceSortKeys: Record<PriceMetric, string> = {
  textInput: "input", textOutput: "output", textInput_cacheRead: "cacheRead", textInput_cacheWrite: "cacheWrite",
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
  const rawSort = one(params.sort);
  const sortDisabled = rawSort === "none";
  const sortable = new Set(["name", "released", ...compareColumns.filter((column) => column.sortable).map((column) => column.id)]);
  const sort = sortDisabled ? null : sortable.has(rawSort) ? rawSort : `board:${boards[0]?.id ?? "aaindex"}`;
  const rawOrder = one(params.order);
  const order: SortOrder | null = sort ? rawOrder === "asc" || rawOrder === "desc" ? rawOrder : sort === "name" ? "asc" : "desc" : null;
  const visibleColumnIds = parseVisibleColumns(many(params.cols).join(","), compareColumns);
  const visibleColumns = compareColumns.filter((column) => visibleColumnIds.includes(column.id));

  // 多榜单合集：任一榜单有数据即进入对比（缺失的单元格留空）。
  const ranked = canonicalModels.filter((model) => {
    const record = indexFor(model.canonicalId);
    return board ? record.boards[board] : Object.keys(record.boards).length > 0;
  });
  const owners = [...new Set(ranked.map((model) => model.ownerId))].sort();
  const filtered = ranked.filter((model) =>
    (!q || `${model.name} ${model.canonicalId}`.toLowerCase().includes(q))
    && (!owner || model.ownerId === owner)
    && (!ability || model.abilities[ability]));

  const priceValue = (model: typeof canonicalModels[number], metric: PriceMetric) => priceRate(model.displayPrices[currency], metric);
  const scoreOf = (model: typeof canonicalModels[number], boardId: string) => indexFor(model.canonicalId).boards[boardId]?.score ?? null;
  const sortValue = (model: typeof canonicalModels[number]) => {
    if (!sort) return null;
    if (sort.startsWith("board:")) return scoreOf(model, sort.slice(6));
    if (sort === "released") return releaseDateValue(model.releasedAt);
    if (sort === "context") return model.contextWindow ?? null;
    const metric = (Object.entries(priceSortKeys).find(([, key]) => key === sort)?.[0] ?? null) as PriceMetric | null;
    return metric ? priceValue(model, metric) : null;
  };
  const rows = sort && order ? stableSort(filtered, (left, right) => sort === "name"
    ? compareNullable(left.name, right.name, order)
    : compareNullable(sortValue(left), sortValue(right), order) || left.name.localeCompare(right.name)) : filtered;

  const maxima = {
    context: maxValue(rows.map((model) => model.contextWindow)),
    ...Object.fromEntries(priceMetrics.map((metric) => [metric, maxValue(rows.map((model) => priceValue(model, metric)))])),
    ...Object.fromEntries(boards.map((item) => [`board:${item.id}`, maxValue(rows.map((model) => scoreOf(model, item.id)))])),
  } as Record<string, number>;
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

  const cellFor = (model: typeof canonicalModels[number], column: ColumnDef) => {
    if (column.boardId) {
      const score = indexFor(model.canonicalId).boards[column.boardId];
      const label = `${boardLabel(boards.find((item) => item.id === column.boardId)!, locale)}`;
      return <td className="comparison-cell" key={column.id} title={score ? `${score.sourceModel}${score.rank ? ` · #${score.rank}` : ""}` : undefined}>
        <MetricBar label={label} value={score?.score ?? null} max={maxima[`board:${column.boardId}`] ?? 0} display={score?.score != null ? String(score.score) : "-"} tone="quality" />
      </td>;
    }
    if (column.id === "context") {
      return <td className="comparison-cell" key={column.id}><MetricBar label={msg(locale, "context")} value={model.contextWindow} max={maxima.context} display={compactNumber(model.contextWindow)} tone="context" /></td>;
    }
    if (column.id === "vision") {
      return <td className="ability-comparison-cell" key={column.id}><span className={model.abilities.vision ? "tag success" : "tag"}>{msg(locale, model.abilities.vision ? "supported" : "unsupported")}</span></td>;
    }
    const metric = (Object.entries(priceSortKeys).find(([, key]) => key === column.id)?.[0] ?? null) as PriceMetric | null;
    if (!metric) return <td key={column.id}><span className="missing">-</span></td>;
    const value = priceValue(model, metric);
    const price = model.displayPrices[currency];
    return <td className="comparison-cell" key={column.id}>
      <MetricBar label={`${currency} ${priceLabels[metric]}`} value={value} max={maxima[metric] ?? 0} display={formatPrice(value, currency)} tone={priceMetricTones[metric]} annotation={value != null && isExplicitlyFree(price) ? msg(locale, "free") : undefined} />
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
      <ColumnPicker columns={compareColumns} visible={visibleColumnIds} locale={locale} currency={currency} resetHref={resetColumnsHref()} />
      {sortDisabled
        ? <input type="hidden" name="sort" value="none" />
        : sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
      <Link href="/compare" className="text-button">{msg(locale, "reset")}</Link>
    </AutoSubmitForm>
    <div className="evidence-banner">
      <div><strong>{msg(locale, "leaderboardEvidence")}</strong><span>{boards.length} {msg(locale, "boardsCount")} · {catalog.sources.find((source) => source.id === "ai-pricing")?.revision?.slice(0, 8) ?? "-"}</span></div>
      <span>{currency} · {msg(locale, "priceUnit")}</span>
      <span>{rows.length} / {ranked.length} {msg(locale, "mappedModels")}</span>
    </div>
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
        <tbody>{rows.map((model) => <tr key={model.canonicalId}>
          <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
          <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>
          {visibleColumns.map((column) => cellFor(model, column))}
        </tr>)}</tbody>
      </table></div> : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
      <div className="table-footer"><span>{rows.length} / {ranked.length} {msg(locale, "mappedModels")} · {visibleColumnIds.length}/{compareColumns.length} {msg(locale, "columns")}</span></div>
    </div>
  </AppShell>;
}
