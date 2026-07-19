import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, EntityText, MetricStrip, PageHeader, Pagination, PriceValue, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels, catalog, modelMatches } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
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
  const rawSort = one(params.sort);
  const sort = parseModelSortKey(rawSort);
  const order = sort ? parseModelSortOrder(one(params.order), rawSort) : null;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const abilities = [...new Set(canonicalModels.flatMap((model) =>
    Object.entries(model.abilities).filter(([, value]) => value).map(([key]) => key),
  ))].sort();

  const filtered = canonicalModels.filter((model) => modelMatches(model, q) && (!ability || model.abilities[ability]));
  const sorted = sortCanonicalModels(filtered, sort, order, priceCurrency);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const baseQuery = (includeSort = true) => {
    const copy = new URLSearchParams();
    if (q) copy.set("q", q);
    if (ability) copy.set("ability", ability);
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

  return (
    <AppShell locale={locale} section={msg(locale, "models")}>
      <PageHeader title={msg(locale, "models")} description={msg(locale, "modelDescription")} />
      <AutoSubmitForm className="toolbar">
        <SearchField defaultValue={q} placeholder={msg(locale, "searchModels")} />
        <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}>
          <option value="">{msg(locale, "allAbilities")}</option>
          {abilities.map((key) => <option key={key} value={key}>{abilityMsg(locale, key)}</option>)}
        </select>
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
          <table className="data-table model-price-table">
            <thead><tr>
              <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
              <SortableHeader label={msg(locale, "context")} direction={directionFor("context")} href={sortLinkFor("context")} locale={locale} />
              <SortableHeader label={msg(locale, "channels")} direction={directionFor("providers")} href={sortLinkFor("providers")} locale={locale} />
              <SortableHeader label={msg(locale, "inputPrice")} subtitle={priceCurrency} direction={directionFor("input")} href={sortLinkFor("input")} locale={locale} />
              <SortableHeader label={msg(locale, "outputPrice")} subtitle={priceCurrency} direction={directionFor("output")} href={sortLinkFor("output")} locale={locale} />
              <SortableHeader label={msg(locale, "cacheReadPrice")} subtitle={priceCurrency} direction={directionFor("cacheRead")} href={sortLinkFor("cacheRead")} locale={locale} />
              <SortableHeader label={msg(locale, "cacheCreationPrice")} subtitle={priceCurrency} direction={directionFor("cacheWrite")} href={sortLinkFor("cacheWrite")} locale={locale} />
              <th>{msg(locale, "ability")}</th>
              <th />
            </tr></thead>
            <tbody>{rows.map((model) => {
              const price = model.displayPrices[priceCurrency];
              return (
                <TableRowLink key={model.canonicalId} href={modelHref(model.canonicalId)} label={`${msg(locale, "details")}: ${model.name}`}>
                  <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
                  <td className="mono">{compactNumber(model.contextWindow)}</td>
                  <td className="mono">{model.providerCount}</td>
                  <td><PriceValue price={price} rate="textInput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textOutput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheRead" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheWrite" currency={priceCurrency} locale={locale} /></td>
                  <td><div className="tag-list">{Object.entries(model.abilities).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>
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
