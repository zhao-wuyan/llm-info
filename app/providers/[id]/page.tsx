import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DetailHeader, DetailMetrics } from "@/components/detail";
import { ProviderModelsDialog } from "@/components/provider-models-dialog";
import { EntityText, PriceValue, SortableHeader } from "@/components/ui";
import { providerById, providerStats } from "@/lib/catalog";
import { compactNumber, formatReleaseDate, priceRate, releaseDateValue } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { priceMetric } from "@/lib/price-metrics";
import { one } from "@/lib/search-params";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { createSortLinks } from "@/lib/sort-links";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

type PreviewSortKey = "name" | "released" | "context" | "input" | "output" | "cacheRead" | "cacheWrite";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProviderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const [locale, currency, { id }, queryParams] = await Promise.all([getLocale(), getCurrency(), params, searchParams]);
  const provider = providerById.get(decodeURIComponent(id));
  if (!provider) notFound();
  const stats = providerStats(provider);
  const initials = provider.name.slice(0, 2).toUpperCase();
  const rawSort = one(queryParams.sort);
  const sortKeys: PreviewSortKey[] = ["name", "released", "context", "input", "output", "cacheRead", "cacheWrite"];
  const sort = sortKeys.includes(rawSort as PreviewSortKey) ? rawSort as PreviewSortKey : null;
  const rawOrder = one(queryParams.order);
  const order: SortOrder | null = sort ? rawOrder === "desc" ? "desc" : "asc" : null;
  const previewModels = sort && order ? stableSort(stats.models, (left, right) => {
    if (sort === "name") return compareNullable(left.name, right.name, order);
    if (sort === "released") return compareNullable(releaseDateValue(left.releasedAt), releaseDateValue(right.releasedAt), order) || left.name.localeCompare(right.name);
    if (sort === "context") return compareNullable(left.contextWindow, right.contextWindow, order) || left.name.localeCompare(right.name);
    return compareNullable(priceRate(left.displayPrices[currency], priceMetric[sort]), priceRate(right.displayPrices[currency], priceMetric[sort]), order) || left.name.localeCompare(right.name);
  }) : stats.models;
  const { directionFor, sortLinkFor } = createSortLinks({ basePath: `/providers/${encodeURIComponent(provider.id)}`, sort, order });

  return <AppShell locale={locale} section={msg(locale, "providers")} detail={provider.name}>
    <DetailHeader
      initials={initials}
      title={provider.name}
      subtitle={provider.id}
      tags={provider.official && <span className="tag success">Official</span>}
      actions={<>
        {provider.website && <a className="secondary-button" href={provider.website} target="_blank" rel="noreferrer"><ExternalLink size={15} />Website</a>}
        <ProviderModelsDialog locale={locale} currency={currency} providerName={provider.name} providerId={provider.id} models={stats.models} />
      </>}
    />
    <DetailMetrics metrics={[
      { label: msg(locale, "modelCount"), value: stats.modelCount },
      { label: "USD", value: stats.usdCount },
      { label: "CNY", value: stats.cnyCount },
      { label: "Quality", value: stats.qualityCount },
    ]} />
    <div className="detail-grid">
      <div className="detail-main">
        <section className="panel">
          <header className="panel-header"><h2>{msg(locale, "modelCount")}</h2><span className="mono">{stats.models.length}</span></header>
          <div className="table-frame borderless">
            <table className="data-table provider-preview-price-table">
              <thead><tr>
                <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
                <SortableHeader label={msg(locale, "releasedAt")} direction={directionFor("released")} href={sortLinkFor("released")} locale={locale} />
                <SortableHeader label={msg(locale, "context")} direction={directionFor("context")} href={sortLinkFor("context")} locale={locale} />
                <SortableHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} href={sortLinkFor("input")} locale={locale} />
                <SortableHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} href={sortLinkFor("output")} locale={locale} />
                <SortableHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} href={sortLinkFor("cacheRead")} locale={locale} />
                <SortableHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} href={sortLinkFor("cacheWrite")} locale={locale} />
              </tr></thead>
              <tbody>{previewModels.slice(0, 8).map((model) => <tr key={model.id}>
                <td><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.modelId} /></Link></td>
                <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>
                <td className="mono">{compactNumber(model.contextWindow)}</td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <header className="panel-header"><h2>{msg(locale, "apiDetails")}</h2></header>
          <div className="panel-body"><dl className="definition-list">
            <dt>API</dt><dd>{provider.api ?? "-"}</dd>
            <dt>Base URL</dt><dd className="mono">{provider.baseUrl ?? "-"}</dd>
            <dt>Documentation</dt><dd>{provider.documentation ? <a href={provider.documentation} target="_blank" rel="noreferrer">{provider.documentation}</a> : "-"}</dd>
            <dt>API key</dt><dd>{provider.apiKeyUrl ? <a href={provider.apiKeyUrl} target="_blank" rel="noreferrer">{provider.apiKeyUrl}</a> : "-"}</dd>
          </dl></div>
        </section>
      </div>
      <aside className="detail-side">
        <section className="panel">
          <header className="panel-header"><h2>{msg(locale, "details")}</h2></header>
          <div className="panel-body">
            <p className="description-copy">{provider.description ?? "-"}</p>
            <dl className="definition-list">
              <dt>Official</dt><dd>{provider.official ? "true" : "false"}</dd>
              <dt>Featured</dt><dd>{provider.featured ? "true" : "false"}</dd>
              <dt>Enabled</dt><dd>{provider.enabled === false ? "false" : "true"}</dd>
            </dl>
          </div>
        </section>
        <section className="panel panel-muted">
          <header className="panel-header"><h2>{msg(locale, "source")}</h2></header>
          <div className="panel-body source-stack">{provider.sourceRefs.map((ref) => <div key={`${ref.source}:${ref.id}`}><span className="tag">{ref.source}</span><code>{ref.id}</code></div>)}</div>
        </section>
      </aside>
    </div>
  </AppShell>;
}
