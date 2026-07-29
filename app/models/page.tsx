import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { ColumnPicker } from "@/components/column-picker";
import { ModelCell } from "@/components/model-cells";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, EntityText, MetricStrip, PageHeader, Pagination, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels, catalog, modelMatches } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { buildModelColumns, columnSortValue, isSortableColumn, parseVisibleColumns, serializeColumns } from "@/lib/model-columns";
import { boards, indexedModelCount, indexFor } from "@/lib/model-index";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort } from "@/lib/table-sort";

const PAGE_SIZE = 20;
type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const many = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];

const columns = buildModelColumns(boards);

export default async function ModelsPage({ searchParams }: { searchParams: Params }) {
  const [locale, priceCurrency] = await Promise.all([getLocale(), getCurrency()]);
  const params = await searchParams;
  const q = one(params.q);
  const ability = one(params.ability);
  const onlyPriced = one(params.priced) === "1";
  const weights = one(params.weights);
  const rawSort = one(params.sort);
  const sort = isSortableColumn(rawSort, columns) ? rawSort : null;
  const numericDefaultOrder = (key: string) => key === "name" || key === "license" ? "asc" : "desc";
  const explicitOrder = one(params.order);
  const order = sort ? (explicitOrder === "asc" || explicitOrder === "desc" ? explicitOrder : numericDefaultOrder(sort)) : null;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const requestedColumns = many(params.cols).join(",");
  const visibleColumnIds = parseVisibleColumns(requestedColumns, columns);
  const visibleColumns = columns.filter((column) => visibleColumnIds.includes(column.id));
  const abilities = [...new Set(canonicalModels.flatMap((model) =>
    Object.entries(model.abilities).filter(([, value]) => value).map(([key]) => key),
  ))].sort();

  const isOpenWeight = (canonicalId: string, fallback?: boolean) => Boolean(indexFor(canonicalId).openWeights) || Boolean(fallback);
  const filtered = canonicalModels.filter((model) =>
    modelMatches(model, q)
    && (!ability || model.abilities[ability])
    && (!onlyPriced || model.displayPrices[priceCurrency] !== null)
    && (!weights
      || (weights === "open" ? isOpenWeight(model.canonicalId, model.openWeights) : !isOpenWeight(model.canonicalId, model.openWeights))),
  );
  const sorted = sort && order
    ? stableSort(filtered, (left, right) => sort === "name"
      ? compareNullable(left.name, right.name, order)
      : compareNullable(
        columnSortValue(sort, left, { currency: priceCurrency }),
        columnSortValue(sort, right, { currency: priceCurrency }),
        order,
      ) || left.name.localeCompare(right.name))
    : [...filtered];

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const serializedColumns = serializeColumns(visibleColumnIds, columns);
  const baseQuery = (includeSort = true) => {
    const copy = new URLSearchParams();
    if (q) copy.set("q", q);
    if (ability) copy.set("ability", ability);
    if (onlyPriced) copy.set("priced", "1");
    if (weights) copy.set("weights", weights);
    if (serializedColumns) copy.set("cols", serializedColumns);
    if (includeSort && sort && order) {
      copy.set("sort", sort);
      copy.set("order", order);
    }
    return copy;
  };
  const linkFor = (next: number) => {
    const copy = baseQuery();
    copy.set("page", String(next));
    return `/models?${copy}`;
  };
  const directionFor = (key: string) => sort === key ? order : null;
  const sortLinkFor = (key: string) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const copy = baseQuery(false);
    if (nextOrder) {
      copy.set("sort", key);
      copy.set("order", nextOrder);
    }
    const query = copy.toString();
    return query ? `/models?${query}` : "/models";
  };
  const resetColumnsHref = () => {
    const copy = baseQuery();
    copy.delete("cols");
    const query = copy.toString();
    return query ? `/models?${query}` : "/models";
  };

  return (
    <AppShell locale={locale} section={msg(locale, "models")}>
      <PageHeader title={msg(locale, "models")} description={msg(locale, "modelDescription")} />
      <AutoSubmitForm className="toolbar">
        <SearchField defaultValue={q} placeholder={msg(locale, "searchModels")} />
        <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}>
          <option value="">{msg(locale, "allAbilities")}</option>
          {abilities.map((key) => <option key={key} value={key}>{abilityMsg(locale, key)}</option>)}
        </select>
        <select name="weights" defaultValue={weights} aria-label={msg(locale, "weights")}>
          <option value="">{msg(locale, "weights")}</option>
          <option value="open">{msg(locale, "openWeightsLabel")}</option>
          <option value="closed">{msg(locale, "closedWeights")}</option>
        </select>
        <label className="check-control">
          <input type="checkbox" name="priced" value="1" defaultChecked={onlyPriced} />
          {msg(locale, "onlyPriced")}
        </label>
        <ColumnPicker columns={columns} visible={visibleColumnIds} locale={locale} currency={priceCurrency} resetHref={resetColumnsHref()} />
        {sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
        <Link href="/models" className="text-button">{msg(locale, "reset")}</Link>
      </AutoSubmitForm>
      <MetricStrip metrics={[
        { value: compactNumber(canonicalModels.length), label: msg(locale, "modelCount") },
        { value: compactNumber(catalog.models.length), label: msg(locale, "channelCount") },
        { value: compactNumber(canonicalModels.filter((model) => indexFor(model.canonicalId).openWeights).length), label: msg(locale, "openWeightsLabel") },
        { value: compactNumber(indexedModelCount), label: msg(locale, "boardCoverage") },
      ]} />
      <div className="table-frame">
        {rows.length ? (
          <div className="table-scroll">
            <table className="data-table model-price-table">
              <thead><tr>
                <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
                {visibleColumns.map((column) => column.sortable
                  ? <SortableHeader
                    key={column.id}
                    label={column.label(locale)}
                    subtitle={column.subtitle?.(priceCurrency)}
                    direction={directionFor(column.id)}
                    href={sortLinkFor(column.id)}
                    locale={locale}
                    sourceUrl={column.sourceUrl}
                    sourceLabel={column.sourceLabel}
                  />
                  : <th key={column.id}>{column.label(locale)}</th>)}
                <th />
              </tr></thead>
              <tbody>{rows.map((model) => (
                <TableRowLink key={model.canonicalId} href={modelHref(model.canonicalId)} label={`${msg(locale, "details")}: ${model.name}`}>
                  <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
                  {visibleColumns.map((column) => <ModelCell key={column.id} column={column} model={model} locale={locale} currency={priceCurrency} />)}
                  <td><ChevronRight size={15} /></td>
                </TableRowLink>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
        <div className="table-footer">
          <span>{filtered.length} {msg(locale, "modelCount")} · {visibleColumnIds.length}/{columns.length} {msg(locale, "columns")}</span>
          <Pagination page={current} pages={pages} href={linkFor} />
        </div>
      </div>
    </AppShell>
  );
}
