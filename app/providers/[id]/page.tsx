import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProviderModelsDialog } from "@/components/provider-models-dialog";
import { PriceValue } from "@/components/ui";
import { providerById, providerStats } from "@/lib/catalog";
import { compactNumber } from "@/lib/format";
import { msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { getCurrency, getLocale } from "@/lib/server-i18n";

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [locale, currency, { id }] = await Promise.all([getLocale(), getCurrency(), params]);
  const provider = providerById.get(decodeURIComponent(id));
  if (!provider) notFound();
  const stats = providerStats(provider);
  const initials = provider.name.slice(0, 2).toUpperCase();

  return <AppShell locale={locale} section={msg(locale, "providers")} detail={provider.name}>
    <div className="detail-header">
      <div className="identity">
        <span className="identity-mark">{initials}</span>
        <div><h1>{provider.name}</h1><p>{provider.id}</p></div>
        {provider.official && <span className="tag success">Official</span>}
      </div>
      <div className="detail-actions">
        {provider.website && <a className="secondary-button" href={provider.website} target="_blank" rel="noreferrer"><ExternalLink size={15} />Website</a>}
        <ProviderModelsDialog locale={locale} currency={currency} providerName={provider.name} providerId={provider.id} models={stats.models} />
      </div>
    </div>
    <div className="detail-metrics">
      <div><span>{msg(locale, "modelCount")}</span><strong>{stats.modelCount}</strong></div>
      <div><span>USD</span><strong>{stats.usdCount}</strong></div>
      <div><span>CNY</span><strong>{stats.cnyCount}</strong></div>
      <div><span>Quality</span><strong>{stats.qualityCount}</strong></div>
    </div>
    <div className="detail-grid">
      <div className="detail-main">
        <section className="panel">
          <header className="panel-header"><h2>{msg(locale, "modelCount")}</h2><span className="mono">{stats.models.length}</span></header>
          <div className="table-frame borderless">
            <table className="data-table provider-preview-price-table">
              <thead><tr>
                <th>{msg(locale, "model")}</th><th>{msg(locale, "context")}</th>
                <th>{currency} {msg(locale, "inputPrice")}</th><th>{currency} {msg(locale, "outputPrice")}</th>
                <th>{currency} {msg(locale, "cacheReadPrice")}</th><th>{currency} {msg(locale, "cacheCreationPrice")}</th>
              </tr></thead>
              <tbody>{stats.models.slice(0, 8).map((model) => <tr key={model.id}>
                <td><Link className="entity-name" href={modelHref(model.canonicalId)}>{model.name}<small>{model.modelId}</small></Link></td>
                <td className="mono">{compactNumber(model.contextWindow)}</td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="cacheReadInputToken" currency={currency} locale={locale} /></td>
                <td><PriceValue price={model.displayPrices[currency]} rate="cacheCreationInputToken" currency={currency} locale={locale} /></td>
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
