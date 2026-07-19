import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, MetricStrip, PageHeader, Pagination, PriceValue, SearchField } from "@/components/ui";
import { canonicalModels, catalog, modelMatches } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { getCurrency, getLocale } from "@/lib/server-i18n";

const PAGE_SIZE = 20;
type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function ModelsPage({ searchParams }: { searchParams: Params }) {
  const [locale, priceCurrency] = await Promise.all([getLocale(), getCurrency()]);
  const params = await searchParams;
  const q = one(params.q);
  const ability = one(params.ability);
  const sort = one(params.sort) || "providers";
  const page = Math.max(1, Number(one(params.page)) || 1);
  const abilities = [...new Set(canonicalModels.flatMap((model) =>
    Object.entries(model.abilities).filter(([, value]) => value).map(([key]) => key),
  ))].sort();

  const filtered = canonicalModels
    .filter((model) => modelMatches(model, q) && (!ability || model.abilities[ability]))
    .sort((a, b) => {
      const leftPrice = a.minPrices[priceCurrency];
      const rightPrice = b.minPrices[priceCurrency];
      if (Boolean(leftPrice) !== Boolean(rightPrice)) return leftPrice ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "context") return (b.contextWindow ?? 0) - (a.contextWindow ?? 0);
      if (sort === "price") {
        return (leftPrice?.rates.textInput ?? Number.POSITIVE_INFINITY) -
          (rightPrice?.rates.textInput ?? Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name);
      }
      return b.providerCount - a.providerCount || a.name.localeCompare(b.name);
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const linkFor = (next: number) => {
    const copy = new URLSearchParams();
    for (const key of ["q", "ability", "sort"] as const) {
      const value = one(params[key]);
      if (value) copy.set(key, value);
    }
    copy.set("page", String(next));
    return `/models?${copy}`;
  };
  const priceHeader = (key: "inputPrice" | "outputPrice" | "cacheReadPrice" | "cacheCreationPrice") =>
    `${priceCurrency} ${msg(locale, key)}`;

  return (
    <AppShell locale={locale} section={msg(locale, "models")}>
      <PageHeader title={msg(locale, "models")} description={msg(locale, "modelDescription")} />
      <AutoSubmitForm className="toolbar">
        <SearchField defaultValue={q} placeholder={msg(locale, "searchModels")} />
        <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}>
          <option value="">{msg(locale, "allAbilities")}</option>
          {abilities.map((key) => <option key={key} value={key}>{abilityMsg(locale, key)}</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort">
          <option value="providers">{msg(locale, "channels")}</option>
          <option value="context">{msg(locale, "context")}</option>
          <option value="price">{priceCurrency} {msg(locale, "inputPrice")}</option>
          <option value="name">A-Z</option>
        </select>
        <Link href="/models" className="text-button">{msg(locale, "reset")}</Link>
      </AutoSubmitForm>
      <MetricStrip metrics={[
        { value: compactNumber(canonicalModels.length), label: msg(locale, "modelCount") },
        { value: compactNumber(catalog.models.length), label: msg(locale, "channelCount") },
        { value: compactNumber(canonicalModels.filter((model) => model.minPrices[priceCurrency]).length), label: `${priceCurrency} ${msg(locale, "pricedModels")}` },
        { value: compactNumber(canonicalModels.filter((model) => model.providerCount > 1).length), label: msg(locale, "multiProvider") },
      ]} />
      <div className="table-frame">
        {rows.length ? (
          <table className="data-table model-price-table">
            <thead><tr>
              <th>{msg(locale, "model")}</th>
              <th>{msg(locale, "ability")}</th>
              <th>{msg(locale, "context")}</th>
              <th>{msg(locale, "channels")}</th>
              <th>{priceHeader("inputPrice")}</th>
              <th>{priceHeader("outputPrice")}</th>
              <th>{priceHeader("cacheReadPrice")}</th>
              <th>{priceHeader("cacheCreationPrice")}</th>
              <th />
            </tr></thead>
            <tbody>{rows.map((model) => {
              const price = model.minPrices[priceCurrency];
              return (
                <TableRowLink key={model.canonicalId} href={modelHref(model.canonicalId)} label={`${msg(locale, "details")}: ${model.name}`}>
                  <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}>{model.name}<small>{model.canonicalId}</small></Link></td>
                  <td><div className="tag-list">{Object.entries(model.abilities).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>
                  <td className="mono">{compactNumber(model.contextWindow)}</td>
                  <td className="mono">{model.providerCount}</td>
                  <td><PriceValue price={price} rate="textInput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textOutput" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheRead" currency={priceCurrency} locale={locale} /></td>
                  <td><PriceValue price={price} rate="textInput_cacheWrite" currency={priceCurrency} locale={locale} /></td>
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
