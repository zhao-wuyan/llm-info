"use client";

import { ArrowDownUp, ChevronRight, Info, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import type { Currency, Model } from "@/lib/types";
import { PriceValue } from "./ui";

export function ComparisonDialog({ locale, canonicalId, channels, providerNames }: { locale: Locale; canonicalId: string; channels: Model[]; providerNames: Record<string, string> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [ascending, setAscending] = useState(true);
  const rows = useMemo(() => channels.filter((channel) => {
    const search = `${providerNames[channel.providerId] ?? ""} ${channel.providerId}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (!onlyPriced || channel.displayPrices[currency] !== null);
  }).sort((a, b) => {
    const left = a.displayPrices[currency]?.rates.textInput ?? Number.POSITIVE_INFINITY;
    const right = b.displayPrices[currency]?.rates.textInput ?? Number.POSITIVE_INFINITY;
    return ascending ? left - right : right - left;
  }), [ascending, channels, currency, onlyPriced, providerNames, query]);
  return <>
    <button className="primary-button" onClick={() => dialog.current?.showModal()}>{msg(locale, "compareProviders")}</button>
    <dialog ref={dialog} className="modal" aria-labelledby="provider-comparison-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="modal-layout">
        <header className="modal-header"><div><h2 id="provider-comparison-title">{msg(locale, "compareProviders")}</h2><p>{canonicalId} · {channels.length} {msg(locale, "providers")}</p></div><button className="icon-button" onClick={() => dialog.current?.close()} aria-label={msg(locale, "close")} title={msg(locale, "close")}><X size={18} /></button></header>
        <div className="modal-toolbar"><label className="search-field"><span className="sr-only">{msg(locale, "searchProviders")}</span><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={msg(locale, "searchProviders")} /></label><div className="segmented" aria-label={msg(locale, "currency")}>{(["USD", "CNY"] as Currency[]).map((value) => <button key={value} className={currency === value ? "active" : ""} onClick={() => setCurrency(value)}>{value}</button>)}</div><label className="check-control"><input type="checkbox" checked={onlyPriced} onChange={(event) => setOnlyPriced(event.target.checked)} />{msg(locale, "onlyPriced")}</label><button className="secondary-button" onClick={() => setAscending((value) => !value)}><ArrowDownUp size={15} />{msg(locale, "priceOrder")}</button></div>
        <div className="modal-note"><Info size={14} />{msg(locale, "priceUnit")} · {locale === "zh" ? "仅展示原生币种报价，不做汇率换算。" : "Native currency quotes only; no FX conversion."}</div>
        <div className="modal-content"><table className="data-table"><thead><tr><th>{msg(locale, "providers")}</th><th>{msg(locale, "inputPrice")}</th><th>{msg(locale, "outputPrice")}</th><th>{msg(locale, "source")}</th><th>{msg(locale, "observedAt")}</th><th aria-label={msg(locale, "details")} /></tr></thead><tbody>{rows.map((channel) => <tr key={channel.id} tabIndex={0} role="link" onClick={() => router.push(`/providers/${encodeURIComponent(channel.providerId)}`)} onKeyDown={(event) => { if (event.key === "Enter") router.push(`/providers/${encodeURIComponent(channel.providerId)}`); }}><td className="entity-cell"><span className="entity-name">{providerNames[channel.providerId] ?? channel.providerId}<small>{channel.providerId}</small></span></td><td><PriceValue price={channel.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td><td><PriceValue price={channel.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td><td><span className="tag">{channel.displayPrices[currency]?.source ?? "-"}</span></td><td className="mono">{formatDate(channel.pricing.find((price) => price.id === channel.displayPrices[currency]?.priceId)?.observedAt)}</td><td><ChevronRight size={15} aria-hidden /></td></tr>)}</tbody></table></div>
        <footer className="modal-footer"><span>{rows.length} / {channels.length} {msg(locale, "providers")}</span><button className="primary-button" onClick={() => dialog.current?.close()}>{msg(locale, "close")}</button></footer>
      </div>
    </dialog>
  </>;
}
