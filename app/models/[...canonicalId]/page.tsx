import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ComparisonDialog } from "@/components/comparison-dialog";
import { EntityText, PriceValue, SortableHeader } from "@/components/ui";
import { modelByCanonicalId, providerById } from "@/lib/catalog";
import { compactNumber, formatDate, priceRate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { resolveCanonicalModelId } from "@/lib/model-aliases";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

type ChannelSortKey = "provider" | "input" | "output" | "cacheRead" | "cacheWrite";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const priceMetric = { input: "textInput", output: "textOutput", cacheRead: "textInput_cacheRead", cacheWrite: "textInput_cacheWrite" } as const;

export default async function ModelDetailPage({ params, searchParams }: { params: Promise<{ canonicalId: string[] }>; searchParams: SearchParams }) {
  const [locale, currency, { canonicalId }, queryParams] = await Promise.all([getLocale(), getCurrency(), params, searchParams]);
  const id = canonicalId.map(decodeURIComponent).join("/");
  const resolvedId = resolveCanonicalModelId(id);
  if (resolvedId !== id) redirect(modelHref(resolvedId));
  const model = modelByCanonicalId.get(resolvedId);
  if (!model) notFound();
  const providerNames = Object.fromEntries(model.channels.map((channel) => [channel.providerId, providerById.get(channel.providerId)?.name ?? channel.providerId]));
  const initials = model.ownerId.slice(0, 2).toUpperCase();
  const rawSort = one(queryParams.sort);
  const sortKeys: ChannelSortKey[] = ["provider", "input", "output", "cacheRead", "cacheWrite"];
  const sort: ChannelSortKey | null = sortKeys.includes(rawSort as ChannelSortKey) ? rawSort as ChannelSortKey : null;
  const rawOrder = one(queryParams.order);
  const order: SortOrder | null = sort ? rawOrder === "desc" ? "desc" : "asc" : null;
  const channels = sort && order ? stableSort(model.channels, (left, right) => {
    if (sort === "provider") return compareNullable(providerNames[left.providerId], providerNames[right.providerId], order);
    return compareNullable(priceRate(left.displayPrices[currency], priceMetric[sort]), priceRate(right.displayPrices[currency], priceMetric[sort]), order) || providerNames[left.providerId].localeCompare(providerNames[right.providerId]);
  }) : model.channels;
  const directionFor = (key: ChannelSortKey) => sort === key ? order : null;
  const sortLinkFor = (key: ChannelSortKey) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const base = `/models/${model.canonicalId.split("/").map(encodeURIComponent).join("/")}`;
    return nextOrder ? `${base}?sort=${key}&order=${nextOrder}` : base;
  };

  return <AppShell locale={locale} section={msg(locale, "models")} detail={model.name}>
    <div className="detail-header">
      <div className="identity"><span className="identity-mark">{initials}</span><div><h1>{model.name}</h1><p>{model.canonicalId}</p></div>{model.openWeights && <span className="tag success">Open weights</span>}</div>
      <div className="detail-actions"><Link className="secondary-button" href="/models">{msg(locale, "back")}</Link><ComparisonDialog locale={locale} canonicalId={model.canonicalId} channels={model.channels} providerNames={providerNames} /></div>
    </div>
    <div className="detail-metrics"><div><span>{msg(locale, "context")}</span><strong>{compactNumber(model.contextWindow)}</strong></div><div><span>Max output</span><strong>{compactNumber(model.maxOutput)}</strong></div><div><span>{msg(locale, "channels")}</span><strong>{model.providerCount}</strong></div><div><span>{msg(locale, "qualityEvidence")}</span><strong>{model.quality?.aaIndex ?? "-"}</strong></div></div>
    <div className="detail-grid"><div className="detail-main">
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "modelAbilities")}</h2><span className="mono">{model.family ?? model.ownerId}</span></header><div className="panel-body ability-grid">{Object.entries(model.abilities).map(([key, enabled]) => <div className="ability-item" key={key}><span>{abilityMsg(locale, key)}</span>{enabled ? <Check className="yes" size={15} /> : <X className="no" size={15} />}</div>)}</div></section>
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "pricingOverview")}</h2><span className="mono">{msg(locale, "priceUnit")}</span></header><div className="table-frame borderless"><table className="data-table"><thead><tr><th>{msg(locale, "currency")}</th><th>{msg(locale, "inputPrice")}</th><th>{msg(locale, "outputPrice")}</th><th>{msg(locale, "cacheReadPrice")}</th><th>{msg(locale, "cacheCreationPrice")}</th><th>{msg(locale, "source")}</th></tr></thead><tbody>{(["USD", "CNY"] as const).map((priceCurrency) => {
        const price = model.displayPrices[priceCurrency];
        return <tr key={priceCurrency}><td className="mono">{priceCurrency}</td><td><PriceValue price={price} rate="textInput" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textOutput" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textInput_cacheRead" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textInput_cacheWrite" currency={priceCurrency} locale={locale} /></td><td><div className="tag-list">{price ? <><span className="tag">{providerById.get(price.providerId)?.name ?? price.providerId}</span><span className="tag">{price.source}</span><span className="tag" title={`${msg(locale, "confidence")}: ${price.confidence.score}`}>{price.confidence.score}%</span></> : <span className="tag">-</span>}</div></td></tr>;
      })}</tbody></table></div></section>
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "providerPreview")}</h2><span className="mono">{currency} · {model.channels.length}</span></header><div className="table-frame borderless"><table className="data-table model-channel-table"><thead><tr><SortableHeader label={msg(locale, "providers")} direction={directionFor("provider")} href={sortLinkFor("provider")} locale={locale} /><SortableHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} href={sortLinkFor("input")} locale={locale} /><SortableHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} href={sortLinkFor("output")} locale={locale} /><SortableHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} href={sortLinkFor("cacheRead")} locale={locale} /><SortableHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} href={sortLinkFor("cacheWrite")} locale={locale} /><th>{msg(locale, "source")}</th></tr></thead><tbody>{channels.slice(0, 6).map((channel) => <tr key={channel.id}><td><Link className="entity-name" href={`/providers/${encodeURIComponent(channel.providerId)}`}><EntityText name={providerNames[channel.providerId]} id={channel.providerId} /></Link></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td><td><div className="tag-list">{channel.sourceRefs.slice(0, 2).map((ref) => <span className="tag" key={`${ref.source}:${ref.id}`}>{ref.source}</span>)}</div></td></tr>)}</tbody></table></div></section>
    </div><aside className="detail-side">
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "details")}</h2></header><div className="panel-body"><dl className="definition-list"><dt>Owner</dt><dd>{model.ownerId}</dd><dt>Released</dt><dd>{model.releasedAt ?? "-"}</dd><dt>Knowledge cutoff</dt><dd>{model.knowledgeCutoff ?? "-"}</dd><dt>Input</dt><dd>{model.modalities?.input?.join(", ") ?? "-"}</dd><dt>Output</dt><dd>{model.modalities?.output?.join(", ") ?? "-"}</dd></dl></div></section>
      {model.quality && <section className="panel panel-muted"><header className="panel-header"><h2>{msg(locale, "qualityEvidence")}</h2></header><div className="panel-body"><dl className="definition-list"><dt>AAIndex</dt><dd>{model.quality.aaIndex}</dd><dt>{msg(locale, "source")}</dt><dd>{model.quality.source}</dd><dt>Source model</dt><dd>{model.quality.sourceModel}</dd><dt>Revision</dt><dd className="mono">{model.quality.revision.slice(0, 8)}</dd><dt>{msg(locale, "observedAt")}</dt><dd>{formatDate(model.quality.observedAt)}</dd></dl></div></section>}
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "traceability")}</h2></header><div className="panel-body"><div className="source-stack">{model.sourceRefs.map((ref) => <div key={`${ref.source}:${ref.id}`}><span className="tag">{ref.source}</span><code>{ref.id}</code></div>)}</div></div></section>
    </aside></div>
  </AppShell>;
}
