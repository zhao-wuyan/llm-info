import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, EntityText, MetricStrip, PageHeader, Pagination, PriceValue, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels, catalog, modelMatches } from "@/lib/catalog";
import { compactNumber, deprecationDayDistance, formatReleaseDate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { isRecentOpenWeights } from "@/lib/lifecycle";
import type { Lifecycle } from "@/lib/types";
import { modelHref } from "@/lib/links";
import { parseModelSortKey, parseModelSortOrder, sortCanonicalModels, type ModelSortKey } from "@/lib/model-sort";
import { getCurrency, getLocale } from "@/lib/server-i18n";

const PAGE_SIZE = 20;
type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function ModelsPage({ searchParams }: { searchParams: Params }) {
  const [locale, priceCurrency] = await Promise.all([getLocale(), getCurrency()]);
  const params = await searchParams;
  const q = one(params.q);
  const ability = one(params.ability);
  const onlyPriced = one(params.priced) === "1";
  const onlyActive = one(params.active) === "1";
  const recentOpen = one(params["recent-open"]) === "1";
  const showDeprecation = one(params["col-deprecation"]) === "1";
  const snapshot = new Date(catalog.generatedAt);
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
    && (!onlyActive || model.lifecycle.status === "active")
    && (!recentOpen || isRecentOpenWeights(model, snapshot)),
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
    if (onlyActive) copy.set("active", "1");
    if (recentOpen) copy.set("recent-open", "1");
    if (showDeprecation) copy.set("col-deprecation", "1");
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
  const lifecycleCell = (lifecycle: Lifecycle) => {
    if (!lifecycle.deprecationDate) return <td className="mono"><span className="missing">-</span></td>;
    const days = deprecationDayDistance(lifecycle.deprecationDate, snapshot);
    const relative = days === null ? "" : days >= 0 ? `${days} ${msg(locale, "deprecatingIn")}` : `${-days} ${msg(locale, "deprecatedDaysAgo")}`;
    return <td className="mono"><span className={`tag${lifecycle.status === "sunset" ? " warning" : ""}`} title={relative}>{lifecycle.deprecationDate}</span></td>;
  };
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
          <input type="checkbox" name="active" value="1" defaultChecked={onlyActive} />
          {msg(locale, "onlyActive")}
        </label>
        <label className="check-control">
          <input type="checkbox" name="recent-open" value="1" defaultChecked={recentOpen} />
          {msg(locale, "recentOpenWeights")}
        </label>
        <details className="column-customizer">
          <summary className="text-button">{msg(locale, "customColumns")}</summary>
          <div className="column-customizer-panel">
            <label className="check-control">
              <input type="checkbox" name="col-deprecation" value="1" defaultChecked={showDeprecation} />
              {msg(locale, "deprecationDate")}
            </label>
          </div>
        </details>
        {sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
        <Link href="/models" className="text-button">{msg(locale, "reset")}</Link>
      </AutoSubmitForm>
      <MetricStrip metrics={[
        { value: compactNumber(canonicalModels.length), label: msg(locale, "modelCount") },
        { value: compactNumber(catalog.models.length), label: msg(locale, "channelCount") },
        { value: compactNumber(canonicalModels.filter((model) => model.displayPrices[priceCurrency]).length), label: `${priceCurrency} ${msg(locale, "pricedModels")}` },
        { value: compactNumber(canonicalModels.filter((model) => model.providerCount > 1).length), label: msg(locale, "multiProvider") },
      ]} />
      <div className="table-frame">
        {rows.length ? (
          <table className={`data-table model-price-table${showDeprecation ? " with-deprecation" : ""}`}>
            <thead><tr>
              <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
              <SortableHeader label={msg(locale, "releasedAt")} direction={directionFor("released")} href={sortLinkFor("released")} locale={locale} />
              <SortableHeader label={msg(locale, "context")} direction={directionFor("context")} href={sortLinkFor("context")} locale={locale} />
              <SortableHeader label={msg(locale, "channels")} direction={directionFor("providers")} href={sortLinkFor("providers")} locale={locale} />
              <SortableHeader label={msg(locale, "inputPrice")} subtitle={priceCurrency} direction={directionFor("input")} href={sortLinkFor("input")} locale={locale} />
              <SortableHeader label={msg(locale, "outputPrice")} subtitle={priceCurrency} direction={directionFor("output")} href={sortLinkFor("output")} locale={locale} />
              <SortableHeader label={msg(locale, "cacheReadPrice")} subtitle={priceCurrency} direction={directionFor("cacheRead")} href={sortLinkFor("cacheRead")} locale={locale} />
              <SortableHeader label={msg(locale, "cacheCreationPrice")} subtitle={priceCurrency} direction={directionFor("cacheWrite")} href={sortLinkFor("cacheWrite")} locale={locale} />
              <th>{msg(locale, "ability")}</th>
              {showDeprecation && <th>{msg(locale, "deprecationDate")}</th>}
              <th />
            </tr></thead>
            <tbody>{rows.map((model) => {
              const price = model.displayPrices[priceCurrency];
              return (
                <TableRowLink key={model.canonicalId} href={modelHref(model.canonicalId)} label={`${msg(locale, "details")}: ${model.name}`}>
                  <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
                  <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>
                  <td className="mono">{compactNumber(model.contextWindow)}</td>
                  <td className="mono">{model.providerCount}</td>
                  <td><PriceValue price={price} rate="textInput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textOutput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheRead" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheWrite" currency={priceCurrency} locale={locale} /></td>
                  <td><div className="tag-list">{Object.entries(model.abilities).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>
                  {showDeprecation && lifecycleCell(model.lifecycle)}
                  <td><ChevronRight size={15} /></td>
                </TableRowLink>
              );
            })}</tbody>
          </table>
        ) : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
        <div className="table-footer"><span>{filtered.length} {msg(locale, "modelCount")}</span><Pagination page={current} pages={pages} href={linkFor} /></div>
      </div>
    </AppShell>
  );
}
