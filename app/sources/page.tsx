import { ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { EmptyState, EntityText, MetricStrip, PageHeader, SearchField, SortableHeader } from "@/components/ui";
import { catalog } from "@/lib/catalog";
import { compactNumber, formatDate } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

type Params = Promise<Record<string, string | string[] | undefined>>;
type SourceSortKey = "name" | "records";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function SourcesPage({ searchParams }: { searchParams: Params }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const q = one(params.q).toLowerCase();
  const role = one(params.role);
  const license = one(params.license);
  const rawSort = one(params.sort);
  const sort: SourceSortKey | null = rawSort === "name" || rawSort === "records" ? rawSort : null;
  const rawOrder = one(params.order);
  const order: SortOrder | null = sort ? rawOrder === "desc" ? "desc" : "asc" : null;
  const filtered = catalog.sources.filter((source) => (!q || `${source.name} ${source.id} ${source.role}`.toLowerCase().includes(q)) && (!role || source.role === role) && (!license || (license === "missing" ? source.license === "NOASSERTION" : source.license !== "NOASSERTION")));
  const rows = sort && order ? stableSort(filtered, (left, right) => compareNullable(sort === "name" ? left.name : left.recordCount, sort === "name" ? right.name : right.recordCount, order)) : filtered;
  const roles = [...new Set(catalog.sources.map((source) => source.role))];
  const total = catalog.sources.reduce((sum, source) => sum + source.recordCount, 0);
  const baseQuery = (includeSort = true) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (role) query.set("role", role);
    if (license) query.set("license", license);
    if (includeSort && sort && order) { query.set("sort", sort); query.set("order", order); }
    return query;
  };
  const directionFor = (key: SourceSortKey) => sort === key ? order : null;
  const sortLinkFor = (key: SourceSortKey) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const query = baseQuery(false);
    if (nextOrder) { query.set("sort", key); query.set("order", nextOrder); }
    return query.size ? `/sources?${query}` : "/sources";
  };

  return <AppShell locale={locale} section={msg(locale, "sources")}><PageHeader title={msg(locale, "sources")} description={msg(locale, "sourceDescription")} /><AutoSubmitForm className="toolbar"><SearchField defaultValue={one(params.q)} placeholder={msg(locale, "searchSources")} /><select name="role" defaultValue={role} aria-label={msg(locale, "roleCoverage")}><option value="">{msg(locale, "allRoles")}</option>{roles.map((value) => <option key={value}>{value}</option>)}</select><select name="license" defaultValue={license} aria-label={msg(locale, "license")}><option value="">{msg(locale, "allLicenses")}</option><option value="known">SPDX</option><option value="missing">NOASSERTION</option></select>{sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}<Link href="/sources" className="text-button">{msg(locale, "reset")}</Link></AutoSubmitForm><MetricStrip metrics={[{ value: catalog.sources.length, label: msg(locale, "sources") }, { value: compactNumber(total), label: msg(locale, "records") }, { value: catalog.sources.filter((source) => source.license !== "NOASSERTION").length, label: "SPDX License" }, { value: catalog.sources.filter((source) => source.license === "NOASSERTION").length, label: "NOASSERTION" }]} /><div className="table-frame">{rows.length ? <table className="data-table source-table"><thead><tr><SortableHeader label={msg(locale, "source")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} /><th>{msg(locale, "roleCoverage")}</th><SortableHeader label={msg(locale, "records")} direction={directionFor("records")} href={sortLinkFor("records")} locale={locale} /><th>{msg(locale, "license")}</th><th>{msg(locale, "observedAt")}</th><th>{msg(locale, "repository")}</th></tr></thead><tbody>{rows.map((source) => <tr key={source.id}><td className="entity-cell"><span className="entity-name"><EntityText name={source.name} id={source.id} /></span></td><td><span className="tag">{source.role}</span></td><td className="mono">{compactNumber(source.recordCount)}</td><td>{source.license === "NOASSERTION" ? <span className="tag warning"><ShieldQuestion size={13} />{source.licenseLabel ?? source.license}</span> : <a className="tag success" href={source.licenseUrl ?? source.repository} target="_blank" rel="noreferrer"><ShieldCheck size={13} />{source.licenseLabel ?? source.license}</a>}</td><td className="mono">{formatDate(source.observedAt)}</td><td><a className="source-link" href={source.repository} target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a></td></tr>)}</tbody></table> : <EmptyState>{msg(locale, "noResults")}</EmptyState>}<div className="table-footer"><span>{rows.length} / {catalog.sources.length} {msg(locale, "sources")}</span></div></div></AppShell>;
}
