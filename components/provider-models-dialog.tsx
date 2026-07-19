"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { compactNumber, priceRate } from "@/lib/format";
import { abilityMsg, msg, type Locale } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { compareNullable, nextSortState, stableSort, type SortOrder } from "@/lib/table-sort";
import type { Currency, Model } from "@/lib/types";
import { EntityText, PriceValue, SortableButtonHeader } from "./ui";

const PAGE_SIZE = 10;
type DialogSortKey = "name" | "context" | "input" | "output" | "cacheRead" | "cacheWrite";
const priceMetric = { input: "textInput", output: "textOutput", cacheRead: "textInput_cacheRead", cacheWrite: "textInput_cacheWrite" } as const;

interface ProviderModelsDialogProps {
  locale: Locale;
  currency: Currency;
  providerName: string;
  providerId: string;
  models: Model[];
}

export function ProviderModelsDialog({ locale, currency, providerName, providerId, models }: ProviderModelsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [ability, setAbility] = useState("");
  const [context, setContext] = useState("");
  const [sort, setSort] = useState<DialogSortKey | null>(null);
  const [order, setOrder] = useState<SortOrder | null>(null);
  const [page, setPage] = useState(1);
  const abilities = [...new Set(models.flatMap((model) => Object.entries(model.abilities ?? {}).filter(([, value]) => value).map(([key]) => key)))].sort();
  const filtered = useMemo(() => {
    const matching = models.filter((model) => {
    const matchesQuery = `${model.name} ${model.modelId} ${model.canonicalId}`.toLowerCase().includes(query.toLowerCase());
    const matchesAbility = !ability || model.abilities?.[ability] === true;
    const matchesContext = !context || (context === "large" ? (model.contextWindow ?? 0) >= 128000 : (model.contextWindow ?? 0) < 128000);
      return matchesQuery && matchesAbility && matchesContext;
    });
    if (!sort || !order) return matching;
    return stableSort(matching, (left, right) => {
      if (sort === "name") return compareNullable(left.name, right.name, order);
      if (sort === "context") return compareNullable(left.contextWindow, right.contextWindow, order) || left.name.localeCompare(right.name);
      return compareNullable(priceRate(left.displayPrices[currency], priceMetric[sort]), priceRate(right.displayPrices[currency], priceMetric[sort]), order) || left.name.localeCompare(right.name);
    });
  }, [ability, context, currency, models, order, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const directionFor = (key: DialogSortKey) => sort === key ? order : null;
  const toggleSort = (key: DialogSortKey) => {
    const next = nextSortState(sort, order, key);
    setSort(next.key); setOrder(next.order); resetPage();
  };

  return <>
    <button className="secondary-button" onClick={() => dialog.current?.showModal()}>{msg(locale, "allProviderModels")}</button>
    <dialog ref={dialog} className="modal">
      <div className="modal-layout">
        <header className="modal-header">
          <div><h2>{providerName}</h2><p>{providerId} · {models.length} {msg(locale, "models")}</p></div>
          <button className="icon-button" onClick={() => dialog.current?.close()} aria-label={msg(locale, "close")} title={msg(locale, "close")}><X size={18} /></button>
        </header>
        <div className="modal-toolbar">
          <label className="search-field">
            <span className="sr-only">{msg(locale, "searchModels")}</span><Search size={16} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder={msg(locale, "searchModels")} />
          </label>
          <select aria-label={msg(locale, "ability")} value={ability} onChange={(event) => { setAbility(event.target.value); resetPage(); }}>
            <option value="">{msg(locale, "allAbilities")}</option>
            {abilities.map((key) => <option key={key} value={key}>{abilityMsg(locale, key)}</option>)}
          </select>
          <select aria-label={msg(locale, "context")} value={context} onChange={(event) => { setContext(event.target.value); resetPage(); }}>
            <option value="">{msg(locale, "context")}</option><option value="large">≥128K</option><option value="small">&lt;128K</option>
          </select>
        </div>
        <div className="modal-content">
          <table className="data-table provider-model-table">
            <thead><tr>
              <SortableButtonHeader label={msg(locale, "model")} direction={directionFor("name")} onSort={() => toggleSort("name")} locale={locale} /><th>{msg(locale, "ability")}</th><SortableButtonHeader label={msg(locale, "context")} direction={directionFor("context")} onSort={() => toggleSort("context")} locale={locale} />
              <SortableButtonHeader label={`${currency} ${msg(locale, "inputPrice")}`} direction={directionFor("input")} onSort={() => toggleSort("input")} locale={locale} /><SortableButtonHeader label={`${currency} ${msg(locale, "outputPrice")}`} direction={directionFor("output")} onSort={() => toggleSort("output")} locale={locale} />
              <SortableButtonHeader label={`${currency} ${msg(locale, "cacheReadPrice")}`} direction={directionFor("cacheRead")} onSort={() => toggleSort("cacheRead")} locale={locale} /><SortableButtonHeader label={`${currency} ${msg(locale, "cacheCreationPrice")}`} direction={directionFor("cacheWrite")} onSort={() => toggleSort("cacheWrite")} locale={locale} />
              <th aria-label={msg(locale, "details")} />
            </tr></thead>
            <tbody>{rows.map((model) => <tr key={model.id} role="link" tabIndex={0} onClick={() => router.push(modelHref(model.canonicalId))} onKeyDown={(event) => { if (event.key === "Enter") router.push(modelHref(model.canonicalId)); }}>
              <td className="entity-cell"><span className="entity-name"><EntityText name={model.name} id={model.modelId} /></span></td>
              <td><div className="tag-list">{Object.entries(model.abilities ?? {}).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>
              <td className="mono">{compactNumber(model.contextWindow)}</td>
              <td><PriceValue price={model.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td>
              <td><PriceValue price={model.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td>
              <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td>
              <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td>
              <td><ChevronRight size={15} aria-hidden /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <footer className="modal-footer">
          <span>{filtered.length} {msg(locale, "models")}</span>
          <div className="pagination">
            <button className="icon-button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label={locale === "zh" ? "上一页" : "Previous page"}><ChevronLeft size={15} /></button>
            <span>{currentPage} / {pages}</span>
            <button className="icon-button" disabled={currentPage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} aria-label={locale === "zh" ? "下一页" : "Next page"}><ChevronRight size={15} /></button>
          </div>
        </footer>
      </div>
    </dialog>
  </>;
}
