import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { ColumnPicker } from "@/components/column-picker";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, EntityText, MetricStrip, PageHeader, Pagination, PriceValue, SearchField, SortableHeader } from "@/components/ui";
import { DownloadsCell, LicenseCell, LikesCell, OpenWeightsCell, ParametersCell } from "@/components/weights-cells";
import { canonicalModels, catalog, modelMatches } from "@/lib/catalog";
import { compactNumber, formatReleaseDate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { parseModelColumns, visibleModelColumns } from "@/lib/model-columns";
import { parseModelSortKey, parseModelSortOrder, sortCanonicalModels, type ModelSortKey } from "@/lib/model-sort";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import type { CanonicalModel, Currency } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

const PAGE_SIZE = 20;
type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const many = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];

function ColumnCell({ columnId, model, currency, locale }: { columnId: string; model: CanonicalModel; currency: Currency; locale: Locale }) {
  const price = model.displayPrices[currency];
  switch (columnId) {
    case "released":
      return <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>;
    case "context":
      return <td className="mono">{compactNumber(model.contextWindow)}</td>;
    case "providers":
      return <td className="mono">{model.providerCount}</td>;
    case "input":
      return <td><PriceValue price={price} rate="textInput" currency={currency} locale={locale} /></td>;
    case "output":
      return <td><PriceValue price={price} rate="textOutput" currency={currency} locale={locale} /></td>;
    case "cacheRead":
      return <td><PriceValue price={price} rate="textInput_cacheRead" currency={currency} locale={locale} /></td>;
    case "cacheWrite":
      return <td><PriceValue price={price} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td>;
    case "openWeights":
      return <td><OpenWeightsCell weights={model.weights} openWeights={model.openWeights} locale={locale} /></td>;
    case "license":
      return <td><LicenseCell weights={model.weights} locale={locale} /></td>;
    case "downloads":
      return <td><DownloadsCell weights={model.weights} /></td>;
    case "likes":
      return <td><LikesCell weights={model.weights} /></td>;
    case "parameters":
      return <td><ParametersCell weights={model.weights} /></td>;
    default:
      return <td><div className="tag-list">{Object.entries(model.abilities).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>;
  }
}

export default async function ModelsPage({ searchParams }: { searchParams: Params }) {
  const [locale, priceCurrency] = await Promise.all([getLocale(), getCurrency()]);
  const params = await searchParams;
  const q = one(params.q);
  const ability = one(params.ability);
  const onlyPriced = one(params.priced) === "1";
  const onlyOpenWeights = one(params.weights) === "1";
  const columnIds = parseModelColumns(many(params.cols), one(params.colsSet) === "1");
  const columns = visibleModelColumns(columnIds);
  const rawSort = one(params.sort);
  const sort = parseModelSortKey(rawSort);
  const order = sort ? parseModelSortOrder(one(params.order), rawSort) : null;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const abilities = [...new Set(canonicalModels.flatMap((model) =>
    Object.entries(model.abilities).filter(([, value]) => value).map(([key]) => key),
  ))].sort();

  const filtered = canonicalModels.filter((model) =>
    modelMatches(model, q)
    && (!ability || model.abilities[ability])
    && (!onlyPriced || model.displayPrices[priceCurrency] !== null)
    && (!onlyOpenWeights || Boolean(model.weights) || model.openWeights === true),
  );
  const sorted = sortCanonicalModels(filtered, sort, order, priceCurrency);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const baseQuery = (includeSort = true) => {
    const copy = new URLSearchParams();
    if (q) copy.set("q", q);
    if (ability) copy.set("ability", ability);
    if (onlyPriced) copy.set("priced", "1");
    if (onlyOpenWeights) copy.set("weights", "1");
    copy.set("colsSet", "1");
    for (const columnId of columnIds) copy.append("cols", columnId);
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
  const directionFor = (key: ModelSortKey) => sort === key ? order : null;
  const sortLinkFor = (key: ModelSortKey) => {
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
  const weightsCount = canonicalModels.filter((model) => model.weights).length;

  return (
    <AppShell locale={locale} section={msg(locale, "models")}>
      <PageHeader title={msg(locale, "models")} description={msg(locale, "modelDescription")} />
      <AutoSubmitForm className="toolbar">
        <SearchField defaultValue={q} placeholder={msg(locale, "searchModels")} />
        <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}>
          <option value="">{msg(locale, "allAbilities")}</option>
          {abilities.map((key) => <option key={key} value={key}>{abilityMsg(locale, key)}</option>)}
        </select>
        <label className="check-control">
          <input type="checkbox" name="priced" value="1" defaultChecked={onlyPriced} />
          {msg(locale, "onlyPriced")}
        </label>
        <label className="check-control">
          <input type="checkbox" name="weights" value="1" defaultChecked={onlyOpenWeights} />
          {msg(locale, "openWeights")}
        </label>
        <ColumnPicker locale={locale} visibleColumns={columnIds} />
        {sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
        <Link href="/models" className="text-button">{msg(locale, "reset")}</Link>
      </AutoSubmitForm>
      <MetricStrip metrics={[
        { value: compactNumber(canonicalModels.length), label: msg(locale, "modelCount") },
        { value: compactNumber(catalog.models.length), label: msg(locale, "channelCount") },
        { value: compactNumber(canonicalModels.filter((model) => model.displayPrices[priceCurrency]).length), label: `${priceCurrency} ${msg(locale, "pricedModels")}` },
        { value: compactNumber(canonicalModels.filter((model) => model.providerCount > 1).length), label: msg(locale, "multiProvider") },
        { value: compactNumber(weightsCount), label: msg(locale, "weightsModels") },
      ]} />
      <div className="table-frame">
        {rows.length ? (
          <table className="data-table model-catalog-table">
            <colgroup>
              <col className="col-model" />
              {columns.map((column) => <col key={column.id} style={{ width: `${column.width}px` }} />)}
              <col className="col-chevron" />
            </colgroup>
            <thead><tr>
              <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
              {columns.map((column) => column.sortKey
                ? <SortableHeader
                    key={column.id}
                    label={msg(locale, column.labelKey)}
                    subtitle={column.currencySubtitle ? priceCurrency : undefined}
                    direction={directionFor(column.sortKey)}
                    href={sortLinkFor(column.sortKey)}
                    locale={locale}
                  />
                : <th key={column.id}>{msg(locale, column.labelKey)}</th>)}
              <th />
            </tr></thead>
            <tbody>{rows.map((model) => (
              <TableRowLink key={model.canonicalId} href={modelHref(model.canonicalId)} label={`${msg(locale, "details")}: ${model.name}`}>
                <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
                {columns.map((column) => <ColumnCell key={column.id} columnId={column.id} model={model} currency={priceCurrency} locale={locale} />)}
                <td><ChevronRight size={15} /></td>
              </TableRowLink>
            ))}</tbody>
          </table>
        ) : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
        <div className="table-footer"><span>{filtered.length} {msg(locale, "modelCount")}</span><Pagination page={current} pages={pages} href={linkFor} /></div>
      </div>
    </AppShell>
  );
}
