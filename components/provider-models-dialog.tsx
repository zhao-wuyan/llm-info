"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { compactNumber, formatReleaseDate, priceRate, releaseDateValue } from "@/lib/format";
import { abilityMsg, msg, type Locale } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { priceMetric } from "@/lib/price-metrics";
import { compareNullable, nextSortState, stableSort, type SortOrder } from "@/lib/table-sort";
import type { Currency, Model } from "@/lib/types";
import { ModalShell } from "./modal-shell";
import { TableRowLink } from "./table-row-link";
import { EntityText, PriceValue, SortableButtonHeader } from "./ui";

const PAGE_SIZE = 10;
type DialogSortKey = "name" | "released" | "context" | "input" | "output" | "cacheRead" | "cacheWrite";

interface ProviderModelsDialogProps {
  locale: Locale;
  currency: Currency;
  providerName: string;
  providerId: string;
  models: Model[];
}

export function ProviderModelsDialog({ locale, currency, providerName, providerId, models }: ProviderModelsDialogProps) {
  const [query, setQuery] = useState("");
  const [ability, setAbility] = useState("");
  const [context, setContext] = useState("");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [sort, setSort] = useState<DialogSortKey | null>(null);
  const [order, setOrder] = useState<SortOrder | null>(null);
  const [page, setPage] = useState(1);
  const abilities = [...new Set(models.flatMap((model) => Object.entries(model.abilities ?? {}).filter(([, value]) => value).map(([key]) => key)))].sort();
  const filtered = useMemo(() => {
    const matching = models.filter((model) => {
      const matchesQuery = `${model.name} ${model.modelId} ${model.canonicalId}`.toLowerCase().includes(query.toLowerCase());
      const matchesAbility = !ability || model.abilities?.[ability] === true;
      const matchesContext = !context || (context === "large" ? (model.contextWindow ?? 0) >= 128000 : (model.contextWindow ?? 0) < 128000);
      const matchesPrice = !onlyPriced || model.displayPrices[currency] !== null;
      return matchesQuery && matchesAbility && matchesContext && matchesPrice;
    });
    if (!sort || !order) return matching;
    return stableSort(matching, (left, right) => {
      if (sort === "name") return compareNullable(left.name, right.name, order);
      if (sort === "released") return compareNullable(releaseDateValue(left.releasedAt), releaseDateValue(right.releasedAt), order) || left.name.localeCompare(right.name);
      if (sort === "context") return compareNullable(left.contextWindow, right.contextWindow, order) || left.name.localeCompare(right.name);
      return compareNullable(priceRate(left.displayPrices[currency], priceMetric[sort]), priceRate(right.displayPrices[currency], priceMetric[sort]), order) || left.name.localeCompare(right.name);
    });
  }, [ability, context, currency, models, onlyPriced, order, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const directionFor = (key: DialogSortKey) => sort === key ? order : null;
  const toggleSort = (key: DialogSortKey) => {
    const next = nextSortState(sort, order, key);
    setSort(next.key); setOrder(next.order); resetPage();
  };

  return <ModalShell triggerLabel={msg(locale, "allProviderModels")} triggerClassName="secondary-button" title={providerName} subtitle={`${providerId} · ${models.length} ${msg(locale, "models")}`} closeLabel={msg(locale, "close")}>
    {() => <>
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
        <label className="check-control">
          <input type="checkbox" checked={onlyPriced} onChange={(event) => { setOnlyPriced(event.target.checked); resetPage(); }} />
          {msg(locale, "onlyPriced")}
        </label>
      </div>
      <div className="modal-content">
        <table className="data-table provider-model-table">
          <thead><tr>
            <SortableButtonHeader label={msg(locale, "model")} direction={directionFor("name")} onSort={() => toggleSort("name")} locale={locale} />
            <SortableButtonHeader label={msg(locale, "releasedAt")} direction={directionFor("released")} onSort={() => toggleSort("released")} locale={locale} />
            <SortableButtonHeader label={msg(locale, "context")} direction={directionFor("context")} onSort={() => toggleSort("context")} locale={locale} />
            <SortableButtonHeader label={msg(locale, "inputPrice")} subtitle={currency} direction={directionFor("input")} onSort={() => toggleSort("input")} locale={locale} /><SortableButtonHeader label={msg(locale, "outputPrice")} subtitle={currency} direction={directionFor("output")} onSort={() => toggleSort("output")} locale={locale} />
            <SortableButtonHeader label={msg(locale, "cacheReadPrice")} subtitle={currency} direction={directionFor("cacheRead")} onSort={() => toggleSort("cacheRead")} locale={locale} /><SortableButtonHeader label={msg(locale, "cacheCreationPrice")} subtitle={currency} direction={directionFor("cacheWrite")} onSort={() => toggleSort("cacheWrite")} locale={locale} />
            <th>{msg(locale, "ability")}</th>
            <th aria-label={msg(locale, "details")} />
          </tr></thead>
          <tbody>{rows.map((model) => <TableRowLink key={model.id} href={modelHref(model.canonicalId)} label={model.name}>
            <td className="entity-cell"><span className="entity-name"><EntityText name={model.name} id={model.modelId} /></span></td>
            <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>
            <td className="mono">{compactNumber(model.contextWindow)}</td>
            <td><PriceValue price={model.displayPrices[currency]} rate="textInput" currency={currency} locale={locale} /></td>
            <td><PriceValue price={model.displayPrices[currency]} rate="textOutput" currency={currency} locale={locale} /></td>
            <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheRead" currency={currency} locale={locale} /></td>
            <td><PriceValue price={model.displayPrices[currency]} rate="textInput_cacheWrite" currency={currency} locale={locale} /></td>
            <td><div className="tag-list">{Object.entries(model.abilities ?? {}).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>
            <td><ChevronRight size={15} aria-hidden /></td>
          </TableRowLink>)}</tbody>
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
    </>}
  </ModalShell>;
}
