"use client";

import { ChevronRight, Info, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { formatDate, priceRate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import { compareNullable, nextSortState, stableSort, type SortOrder } from "@/lib/table-sort";
import type { Currency, Model } from "@/lib/types";
import { EntityText, PriceValue, SortableButtonHeader } from "./ui";

type ComparisonSortKey = "provider" | "input" | "output" | "cacheRead" | "cacheWrite";
const priceMetric = { input: "textInput", output: "textOutput", cacheRead: "textInput_cacheRead", cacheWrite: "textInput_cacheWrite" } as const;

export function ComparisonDialog({ locale, canonicalId, channels, providerNames }: { locale: Locale; canonicalId: string; channels: Model[]; providerNames: Record<string, string> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
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
  return <>
    <button className="primary-button" onClick={() => dialog.current?.showModal()}>{msg(locale, "compareProviders")}</button>
    <dialog ref={dialog} className="modal" aria-labelledby="provider-comparison-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="modal-layout">
        <header className="modal-header"><div><h2 id="provider-comparison-title">{msg(locale, "compareProviders")}</h2><p>{canonicalId} · {channels.length} {msg(locale, "providers")}</p></div><button className="icon-button" onClick={() => dialog.current?.close()} aria-label={msg(locale, "close")} title={msg(locale, "close")}><X size={18} /></button></header>
        <div className="modal-toolbar"><label className="search-field"><span className="sr-only">{msg(locale, "searchProviders")}</span><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={msg(locale, "searchProviders")} /></label><div className="segmented" aria-label={msg(locale, "currency")}>{(["USD", "CNY"] as Currency[]).map((value) => <button key={value} className={currency === value ? "active" : ""} onClick={() => setCurrency(value)}>{value}</button>)}</div><label className="check-control"><input type="checkbox" checked={onlyPriced} onChange={(event) => setOnlyPriced(event.target.checked)} />{msg(locale, "onlyPriced")}</label></div>
        <div className="modal-note"><Info size={14} />{msg(locale, "priceUnit")} · {locale === "zh" ? "仅展示原生币种报价，不做汇率换算。" : "Native currency quotes only; no FX conversion."}</div>
        <div className="modal-content"><table className="data-table comparison-provider-table"><thead><tr><SortableButtonHeader label={msg(locale, "providers")} direction={directionFor("provider")} onSort={() => toggleSort("provider")} locale={locale} /><SortableButtonHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} onSort={() => toggleSort("input")} locale={locale} /><SortableButtonHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} onSort={() => toggleSort("output")} locale={locale} /><SortableButtonHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} onSort={() => toggleSort("cacheRead")} locale={locale} /><SortableButtonHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} onSort={() => toggleSort("cacheWrite")} locale={locale} /><th>{msg(locale, "source")}</th><th>{msg(locale, "observedAt")}</th><th aria-label={msg(locale, "details")} /></tr></thead><tbody>{rows.map((channel) => <tr key={channel.id} tabIndex={0} role="link" onClick={() => router.push(`/providers/${encodeURIComponent(channel.providerId)}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/providers/${encodeURIComponent(channel.providerId)}`); }}><td className="entity-cell"><span className="entity-name"><EntityText name={providerNames[channel.providerId] ?? channel.providerId} id={channel.providerId} /></span></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td><td><span className="tag">{channel.displayPrices[currency]?.source ?? "-"}</span></td><td className="mono">{formatDate(channel.pricing.find((price) => price.id === channel.displayPrices[currency]?.priceId)?.observedAt)}</td><td><ChevronRight size={15} aria-hidden /></td></tr>)}</tbody></table></div>
        <footer className="modal-footer"><span>{rows.length} / {channels.length} {msg(locale, "providers")}</span><button className="primary-button" onClick={() => dialog.current?.close()}>{msg(locale, "close")}</button></footer>
      </div>
    </dialog>
  </>;
}
