import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { TableRowLink } from "@/components/table-row-link";
import { EmptyState, EntityText, MetricStrip, PageHeader, Pagination, SearchField, SortableHeader } from "@/components/ui";
import { catalog, providerStats } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

const PAGE_SIZE = 20;
const sortKeys = ["name", "models", "usd", "cny", "quality"] as const;
type ProviderSortKey = typeof sortKeys[number];
type Params = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function ProvidersPage({ searchParams }: { searchParams: Params }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const q = one(params.q).toLowerCase();
  const kind = one(params.kind);
  const currency = one(params.currency);
  const rawSort = one(params.sort);
  const sort = sortKeys.includes(rawSort as ProviderSortKey) ? rawSort as ProviderSortKey : null;
  const rawOrder = one(params.order);
  const order: SortOrder | null = sort ? rawOrder === "asc" || rawOrder === "desc" ? rawOrder : sort === "models" ? "desc" : "asc" : null;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const filtered = catalog.providers
    .map((provider) => ({ provider, stats: providerStats(provider) }))
    .filter(({ provider, stats }) => (!q || `${provider.name} ${provider.id}`.toLowerCase().includes(q)) && (!kind || (kind === "official" ? provider.official : provider.featured)) && (!currency || (currency === "USD" ? stats.usdCount : stats.cnyCount)));
  const enriched = sort && order ? stableSort(filtered, (left, right) => {
    if (sort === "name") return compareNullable(left.provider.name, right.provider.name, order);
    const leftValue = sort === "models" ? left.stats.modelCount : sort === "usd" ? left.stats.usdCount : sort === "cny" ? left.stats.cnyCount : left.stats.qualityCount;
    const rightValue = sort === "models" ? right.stats.modelCount : sort === "usd" ? right.stats.usdCount : sort === "cny" ? right.stats.cnyCount : right.stats.qualityCount;
    return compareNullable(leftValue, rightValue, order) || left.provider.name.localeCompare(right.provider.name);
  }) : filtered;
  const pages = Math.max(1, Math.ceil(enriched.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = enriched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const baseQuery = (includeSort = true) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (kind) query.set("kind", kind);
    if (currency) query.set("currency", currency);
    if (includeSort && sort && order) { query.set("sort", sort); query.set("order", order); }
    return query;
  };
  const linkFor = (next: number) => { const query = baseQuery(); query.set("page", String(next)); return `/providers?${query}`; };
  const directionFor = (key: ProviderSortKey) => sort === key ? order : null;
  const sortLinkFor = (key: ProviderSortKey) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const query = baseQuery(false);
    if (nextOrder) { query.set("sort", key); query.set("order", nextOrder); }
    return query.size ? `/providers?${query}` : "/providers";
  };

  return <AppShell locale={locale} section={msg(locale, "providers")}>
    <PageHeader title={msg(locale, "providers")} description={msg(locale, "providerDescription")} />
    <AutoSubmitForm className="toolbar">
      <SearchField defaultValue={one(params.q)} placeholder={msg(locale, "searchProviders")} />
      <select name="kind" defaultValue={kind} aria-label="Provider type"><option value="">{locale === "zh" ? "全部类型" : "All types"}</option><option value="official">{msg(locale, "officialProviders")}</option><option value="featured">{msg(locale, "featuredProviders")}</option></select>
      <select name="currency" defaultValue={currency} aria-label={msg(locale, "currency")}><option value="">{msg(locale, "allCurrencies")}</option><option>USD</option><option>CNY</option></select>
      {sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
      <Link href="/providers" className="text-button">{msg(locale, "reset")}</Link>
    </AutoSubmitForm>
    <MetricStrip metrics={[{ value: catalog.providers.length, label: msg(locale, "providerCount") }, { value: catalog.providers.filter((provider) => provider.official).length, label: msg(locale, "officialProviders") }, { value: catalog.providers.filter((provider) => provider.enabled !== false).length, label: msg(locale, "enabledProviders") }, { value: catalog.providers.filter((provider) => provider.featured).length, label: msg(locale, "featuredProviders") }]} />
    <div className="table-frame">{rows.length ? <table className="data-table provider-catalog-table"><thead><tr>
      <SortableHeader label={msg(locale, "providers")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
      <th>API</th>
      <SortableHeader label={msg(locale, "modelCount")} direction={directionFor("models")} href={sortLinkFor("models")} locale={locale} />
      <SortableHeader label="USD" direction={directionFor("usd")} href={sortLinkFor("usd")} locale={locale} />
      <SortableHeader label="CNY" direction={directionFor("cny")} href={sortLinkFor("cny")} locale={locale} />
      <SortableHeader label="Quality" direction={directionFor("quality")} href={sortLinkFor("quality")} locale={locale} />
      <th aria-label={msg(locale, "details")} />
    </tr></thead><tbody>{rows.map(({ provider, stats }) => <TableRowLink key={provider.id} href={`/providers/${encodeURIComponent(provider.id)}`} label={`${msg(locale, "details")}: ${provider.name}`}><td className="entity-cell"><Link className="entity-name" href={`/providers/${encodeURIComponent(provider.id)}`}><EntityText name={provider.name} id={provider.id} /></Link></td><td><div className="tag-list">{provider.official && <span className="tag success">Official</span>}{provider.api && <span className="tag">{provider.api}</span>}</div></td><td className="mono">{stats.modelCount}</td><td className="mono">{stats.usdCount}</td><td className="mono">{stats.cnyCount}</td><td className="mono">{stats.qualityCount}</td><td><ChevronRight size={15} /></td></TableRowLink>)}</tbody></table> : <EmptyState>{msg(locale, "noResults")}</EmptyState>}<div className="table-footer"><span>{compactNumber(enriched.length)} {msg(locale, "providers")}</span><Pagination page={current} pages={pages} href={linkFor} /></div></div>
  </AppShell>;
}
