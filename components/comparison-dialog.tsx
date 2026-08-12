"use client";

import { ChevronRight, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, priceRate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import { priceMetric } from "@/lib/price-metrics";
import { compareNullable, nextSortState, stableSort, type SortOrder } from "@/lib/table-sort";
import type { Currency, Model } from "@/lib/types";
import { ModalShell } from "./modal-shell";
import { TableRowLink } from "./table-row-link";
import { EntityText, PriceValue, SortableButtonHeader } from "./ui";

type ComparisonSortKey = "provider" | "input" | "output" | "cacheRead" | "cacheWrite";

export function ComparisonDialog({ locale, canonicalId, channels, providerNames }: { locale: Locale; canonicalId: string; channels: Model[]; providerNames: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [sort, setSort] = useState<ComparisonSortKey | null>(null);
  const [order, setOrder] = useState<SortOrder | null>(null);
  const rows = useMemo(() => {
    const matching = channels.filter((channel) => {
    const search = `${providerNames[channel.providerId] ?? ""} ${channel.providerId}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (!onlyPriced || channel.displayPrices[currency] !== null);
    });
    if (!sort || !order) return matching;
    return stableSort(matching, (left, right) => {
      if (sort === "provider") return compareNullable(providerNames[left.providerId] ?? left.providerId, providerNames[right.providerId] ?? right.providerId, order);
      return compareNullable(priceRate(left.displayPrices[currency], priceMetric[sort]), priceRate(right.displayPrices[currency], priceMetric[sort]), order) || (providerNames[left.providerId] ?? left.providerId).localeCompare(providerNames[right.providerId] ?? right.providerId);
    });
  }, [channels, currency, onlyPriced, order, providerNames, query, sort]);
  const directionFor = (key: ComparisonSortKey) => sort === key ? order : null;
  const toggleSort = (key: ComparisonSortKey) => { const next = nextSortState(sort, order, key); setSort(next.key); setOrder(next.order); };
  return <ModalShell triggerLabel={msg(locale, "compareProviders")} triggerClassName="primary-button" title={msg(locale, "compareProviders")} subtitle={`${canonicalId} · ${channels.length} ${msg(locale, "providers")}`} closeLabel={msg(locale, "close")}>
    {({ close }) => <>
      <div className="modal-toolbar"><label className="search-field"><span className="sr-only">{msg(locale, "searchProviders")}</span><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={msg(locale, "searchProviders")} /></label><div className="segmented" aria-label={msg(locale, "currency")}>{(["USD", "CNY"] as Currency[]).map((value) => <button key={value} className={currency === value ? "active" : ""} onClick={() => setCurrency(value)}>{value}</button>)}</div><label className="check-control"><input type="checkbox" checked={onlyPriced} onChange={(event) => setOnlyPriced(event.target.checked)} />{msg(locale, "onlyPriced")}</label></div>
      <div className="modal-note"><Info size={14} />{msg(locale, "priceUnit")} · {locale === "zh" ? "仅展示原生币种报价，不做汇率换算。" : "Native currency quotes only; no FX conversion."}</div>
      <div className="modal-content"><table className="data-table comparison-provider-table"><thead><tr><SortableButtonHeader label={msg(locale, "providers")} direction={directionFor("provider")} onSort={() => toggleSort("provider")} locale={locale} /><SortableButtonHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} onSort={() => toggleSort("input")} locale={locale} /><SortableButtonHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} onSort={() => toggleSort("output")} locale={locale} /><SortableButtonHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} onSort={() => toggleSort("cacheRead")} locale={locale} /><SortableButtonHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} onSort={() => toggleSort("cacheWrite")} locale={locale} /><th>{msg(locale, "source")}</th><th>{msg(locale, "observedAt")}</th><th aria-label={msg(locale, "details")} /></tr></thead><tbody>{rows.map((channel) => <TableRowLink key={channel.id} href={`/providers/${encodeURIComponent(channel.providerId)}`} label={providerNames[channel.providerId] ?? channel.providerId}><td className="entity-cell"><span className="entity-name"><EntityText name={providerNames[channel.providerId] ?? channel.providerId} id={channel.providerId} /></span></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td><td><span className="tag">{channel.displayPrices[currency]?.source ?? "-"}</span></td><td className="mono">{formatDate(channel.pricing.find((price) => price.id === channel.displayPrices[currency]?.priceId)?.observedAt)}</td><td><ChevronRight size={15} aria-hidden /></td></TableRowLink>)}</tbody></table></div>
      <footer className="modal-footer"><span>{rows.length} / {channels.length} {msg(locale, "providers")}</span><button className="primary-button" onClick={close}>{msg(locale, "close")}</button></footer>
    </>}
  </ModalShell>;
}
