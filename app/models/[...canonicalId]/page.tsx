import { Check, ExternalLink, X } from "lucide-react";
import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ComparisonDialog } from "@/components/comparison-dialog";
import { DetailHeader, DetailMetrics } from "@/components/detail";
import { formatScore } from "@/components/model-cells";
import { EntityText, PriceValue, SortableHeader } from "@/components/ui";
import { catalog, modelByCanonicalId, providerById } from "@/lib/catalog";
import { compactNumber, deprecationDayDistance, formatDate, priceRate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { boardById, boardLabel, formatParameters, indexFor, licenseTone } from "@/lib/model-index";
import { resolveCanonicalModelId } from "@/lib/model-aliases";
import { priceMetric } from "@/lib/price-metrics";
import { one } from "@/lib/search-params";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { createSortLinks } from "@/lib/sort-links";
import type { LifecycleStatus } from "@/lib/types";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";

type ChannelSortKey = "provider" | "input" | "output" | "cacheRead" | "cacheWrite";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ModelDetailPage({ params, searchParams }: { params: Promise<{ canonicalId: string[] }>; searchParams: SearchParams }) {
  const [locale, currency, { canonicalId }, queryParams] = await Promise.all([getLocale(), getCurrency(), params, searchParams]);
  const id = canonicalId.map(decodeURIComponent).join("/");
  const resolvedId = resolveCanonicalModelId(id);
  if (resolvedId !== id) redirect(modelHref(resolvedId));
  const model = modelByCanonicalId.get(resolvedId);
  if (!model) notFound();
  const indexRecord = indexFor(model.canonicalId);
  const openWeights = indexRecord.openWeights;
  const boardScores = Object.entries(indexRecord.boards)
    .map(([boardId, score]) => ({ board: boardById.get(boardId), score }))
    .filter((entry): entry is { board: NonNullable<ReturnType<typeof boardById.get>>; score: typeof entry.score } => Boolean(entry.board))
    .sort((left, right) => left.board.id.localeCompare(right.board.id));
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
  const snapshot = new Date(catalog.generatedAt);
  const lifecycleLabel = (status: LifecycleStatus) => msg(locale, status === "active" ? "lifecycleActive" : status === "deprecated" ? "lifecycleDeprecated" : "lifecycleSunset");
  const lifecycleTitle = model.lifecycle.deprecationDate ? (() => {
    const days = deprecationDayDistance(model.lifecycle.deprecationDate, snapshot);
    return days === null ? model.lifecycle.deprecationDate : days >= 0 ? `${model.lifecycle.deprecationDate} · ${days} ${msg(locale, "deprecatingIn")}` : `${model.lifecycle.deprecationDate} · ${-days} ${msg(locale, "deprecatedDaysAgo")}`;
  })() : undefined;
  const { directionFor, sortLinkFor } = createSortLinks({ basePath: `/models/${model.canonicalId.split("/").map(encodeURIComponent).join("/")}`, sort, order });

  return <AppShell locale={locale} section={msg(locale, "models")} detail={model.name}>
    <DetailHeader
      initials={initials}
      title={model.name}
      subtitle={model.canonicalId}
      tags={<>{(openWeights || model.openWeights) && <span className="tag success" title={openWeights?.repoId}>{msg(locale, "openWeightsLabel")}</span>}{openWeights?.license && <span className={`tag license-${licenseTone(openWeights.license)}`}>{openWeights.license}</span>}{model.lifecycle.status !== "active" && <span className={`tag${model.lifecycle.status === "sunset" ? " warning" : ""}`} title={lifecycleTitle}>{lifecycleLabel(model.lifecycle.status)}</span>}</>}
      actions={<><Link className="secondary-button" href="/models">{msg(locale, "back")}</Link><ComparisonDialog locale={locale} canonicalId={model.canonicalId} channels={model.channels} providerNames={providerNames} /></>}
    />
    <DetailMetrics metrics={[{ label: msg(locale, "context"), value: compactNumber(model.contextWindow) }, { label: "Max output", value: compactNumber(model.maxOutput) }, { label: msg(locale, "channels"), value: model.providerCount }, { label: msg(locale, "qualityEvidence"), value: model.quality?.aaIndex ?? "-" }]} />
    <div className="detail-grid"><div className="detail-main">
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "modelAbilities")}</h2><span className="mono">{model.family ?? model.ownerId}</span></header><div className="panel-body ability-grid">{Object.entries(model.abilities).map(([key, enabled]) => <div className="ability-item" key={key}><span>{abilityMsg(locale, key)}</span>{enabled ? <Check className="yes" size={15} /> : <X className="no" size={15} />}</div>)}</div></section>
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "pricingOverview")}</h2><span className="mono">{msg(locale, "priceUnit")}</span></header><div className="table-frame borderless"><table className="data-table"><thead><tr><th>{msg(locale, "currency")}</th><th>{msg(locale, "inputPrice")}</th><th>{msg(locale, "outputPrice")}</th><th>{msg(locale, "cacheReadPrice")}</th><th>{msg(locale, "cacheCreationPrice")}</th><th>{msg(locale, "source")}</th></tr></thead><tbody>{(["USD", "CNY"] as const).map((priceCurrency) => {
        const price = model.displayPrices[priceCurrency];
        return <tr key={priceCurrency}><td className="mono">{priceCurrency}</td><td><PriceValue price={price} rate="textInput" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textOutput" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textInput_cacheRead" currency={priceCurrency} locale={locale} /></td><td><PriceValue price={price} rate="textInput_cacheWrite" currency={priceCurrency} locale={locale} /></td><td><div className="tag-list">{price ? <><span className="tag">{providerById.get(price.providerId)?.name ?? price.providerId}</span><span className="tag">{price.source}</span><span className="tag" title={`${msg(locale, "confidence")}: ${price.confidence.score}`}>{price.confidence.score}%</span></> : <span className="tag">-</span>}</div></td></tr>;
      })}</tbody></table></div></section>
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "providerPreview")}</h2><span className="mono">{currency} · {model.channels.length}</span></header><div className="table-frame borderless"><table className="data-table model-channel-table"><thead><tr><SortableHeader label={msg(locale, "providers")} direction={directionFor("provider")} href={sortLinkFor("provider")} locale={locale} /><SortableHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} href={sortLinkFor("input")} locale={locale} /><SortableHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} href={sortLinkFor("output")} locale={locale} /><SortableHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} href={sortLinkFor("cacheRead")} locale={locale} /><SortableHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} href={sortLinkFor("cacheWrite")} locale={locale} /><th>{msg(locale, "source")}</th></tr></thead><tbody>{channels.slice(0, 6).map((channel) => <tr key={channel.id}><td><Link className="entity-name" href={`/providers/${encodeURIComponent(channel.providerId)}`}><EntityText name={providerNames[channel.providerId]} id={channel.providerId} /></Link></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td><td><div className="tag-list">{channel.sourceRefs.slice(0, 2).map((ref) => <span className="tag" key={`${ref.source}:${ref.id}`}>{ref.source}</span>)}</div></td></tr>)}</tbody></table></div></section>
    </div><aside className="detail-side">
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "leaderboards")}</h2><span className="mono">{boardScores.length}</span></header><div className="panel-body">{boardScores.length
        ? <dl className="definition-list">{boardScores.map(({ board, score }) => <Fragment key={board.id}>
          <dt><a href={board.homepageUrl} target="_blank" rel="noreferrer" title={`${msg(locale, "viewSource")}: ${board.sourceName}`}>{boardLabel(board, locale)} <ExternalLink size={11} aria-hidden /></a></dt>
          <dd title={`${score.sourceModel}${score.match === "loose" ? ` · ${msg(locale, "looseMatch")}` : ""}`}>
            <strong>{score.score != null ? formatScore(score.score, board.kind) : "-"}</strong>
            {score.rank != null && <small className="mono"> #{score.rank}</small>}
            {typeof score.metrics.votes === "number" && <small className="mono"> · {compactNumber(score.metrics.votes)} {msg(locale, "votes")}</small>}
          </dd>
        </Fragment>)}</dl>
        : <p className="missing">{msg(locale, "noBoardData")}</p>}</div></section>
      {openWeights && <section className="panel"><header className="panel-header"><h2>{msg(locale, "openWeightsSection")}</h2><a className="mono" href={`https://huggingface.co/${openWeights.repoId}`} target="_blank" rel="noreferrer">Hugging Face <ExternalLink size={11} aria-hidden /></a></header><div className="panel-body"><dl className="definition-list">
        <dt>{msg(locale, "modelLicense")}</dt><dd><a className={`tag license-${licenseTone(openWeights.license)}`} href={openWeights.licenseUrl ?? `https://huggingface.co/${openWeights.repoId}`} target="_blank" rel="noreferrer">{openWeights.license ?? msg(locale, "unknown")}</a></dd>
        <dt>{msg(locale, "parameters")}</dt><dd className="mono">{formatParameters(openWeights.parameters)}</dd>
        <dt>{msg(locale, "hfDownloads")}</dt><dd className="mono">{compactNumber(openWeights.popularity.downloads30d ?? undefined)}</dd>
        <dt>{msg(locale, "hfLikes")}</dt><dd className="mono">{compactNumber(openWeights.popularity.likes ?? undefined)}</dd>
        <dt>{msg(locale, "gated")}</dt><dd>{msg(locale, openWeights.gated ? "supported" : "unsupported")}</dd>
        <dt>{msg(locale, "observedAt")}</dt><dd>{formatDate(openWeights.lastModified)}</dd>
      </dl></div></section>}
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "details")}</h2></header><div className="panel-body"><dl className="definition-list"><dt>Owner</dt><dd>{model.ownerId}</dd><dt>Released</dt><dd>{model.releasedAt ?? "-"}</dd><dt>Knowledge cutoff</dt><dd>{model.knowledgeCutoff ?? "-"}</dd><dt>{msg(locale, "lifecycle")}</dt><dd title={lifecycleTitle}>{model.lifecycle.deprecationDate ? `${lifecycleLabel(model.lifecycle.status)} · ${model.lifecycle.deprecationDate}` : lifecycleLabel(model.lifecycle.status)}</dd><dt>Input</dt><dd>{model.modalities?.input?.join(", ") ?? "-"}</dd><dt>Output</dt><dd>{model.modalities?.output?.join(", ") ?? "-"}</dd></dl></div></section>
      {model.quality && <section className="panel panel-muted"><header className="panel-header"><h2>{msg(locale, "qualityEvidence")}</h2></header><div className="panel-body"><dl className="definition-list"><dt>AAIndex</dt><dd>{model.quality.aaIndex}</dd><dt>{msg(locale, "source")}</dt><dd>{model.quality.source}</dd><dt>Source model</dt><dd>{model.quality.sourceModel}</dd><dt>Revision</dt><dd className="mono">{model.quality.revision.slice(0, 8)}</dd><dt>{msg(locale, "observedAt")}</dt><dd>{formatDate(model.quality.observedAt)}</dd></dl></div></section>}
      <section className="panel"><header className="panel-header"><h2>{msg(locale, "traceability")}</h2></header><div className="panel-body"><div className="source-stack">{model.sourceRefs.map((ref) => <div key={`${ref.source}:${ref.id}`}><span className="tag">{ref.source}</span><code>{ref.id}</code></div>)}</div></div></section>
    </aside></div>
  </AppShell>;
}
