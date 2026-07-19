import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { EmptyState, EntityText, PageHeader, SearchField, SortableHeader } from "@/components/ui";
import { canonicalModels, catalog } from "@/lib/catalog";
import { compactNumber, formatPrice, isExplicitlyFree, priceRate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { getCurrency, getLocale } from "@/lib/server-i18n";
import { compareNullable, stableSort, type SortOrder } from "@/lib/table-sort";
import type { Currency } from "@/lib/types";

type Params = Promise<Record<string, string | string[] | undefined>>;
type PriceMetric = "textInput" | "textOutput" | "textInput_cacheRead" | "textInput_cacheWrite";
type MetricTone = "quality" | "input" | "output" | "cache-read" | "cache-write" | "context";
type CompareSortKey = "name" | "quality" | "input" | "output" | "cacheRead" | "cacheWrite" | "context";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const priceMetrics: PriceMetric[] = ["textInput", "textOutput", "textInput_cacheRead", "textInput_cacheWrite"];
const priceSortMetrics: Record<Exclude<CompareSortKey, "name" | "quality" | "context">, PriceMetric> = {
  input: "textInput", output: "textOutput", cacheRead: "textInput_cacheRead", cacheWrite: "textInput_cacheWrite",
};
const priceMetricTones: Record<PriceMetric, MetricTone> = {
  textInput: "input",
  textOutput: "output",
  textInput_cacheRead: "cache-read",
  textInput_cacheWrite: "cache-write",
};

function maxValue(values: Array<number | null | undefined>) {
  return Math.max(0, ...values.filter((value): value is number => value != null && Number.isFinite(value)));
}

function MetricBar({ label, value, max, display, tone, annotation }: { label: string; value: number | null | undefined; max: number; display: string; tone: MetricTone; annotation?: string }) {
  const width = value == null || max <= 0 ? 0 : Math.min(100, Math.max(value > 0 ? 4 : 0, (value / max) * 100));
  const className = `comparison-bar${value == null ? " is-missing" : ""}`;
  const accessibleValue = annotation ? `${display}, ${annotation}` : display;
  return <div className={className} data-tone={tone} role="img" aria-label={`${label}: ${accessibleValue}`}>
    <span className="comparison-bar-track">
      <i aria-hidden style={{ width: `${width}%` }} />
      <span className="comparison-bar-value" aria-hidden>{annotation && <small>{annotation}</small>}<strong>{display}</strong></span>
    </span>
  </div>;
}

export default async function ComparePage({ searchParams }: { searchParams: Params }) {
  const [locale, currency, params] = await Promise.all([getLocale(), getCurrency(), searchParams]);
  const q = one(params.q).toLowerCase();
  const owner = one(params.owner);
  const rawSort = one(params.sort);
  const sortKeys: CompareSortKey[] = ["name", "quality", "input", "output", "cacheRead", "cacheWrite", "context"];
  const sortDisabled = rawSort === "none";
  const sort = sortDisabled ? null : sortKeys.includes(rawSort as CompareSortKey) ? rawSort as CompareSortKey : "quality";
  const rawOrder = one(params.order);
  const order: SortOrder | null = sort ? rawOrder === "asc" || rawOrder === "desc" ? rawOrder : sort === "quality" ? "desc" : "asc" : null;
  const ability = one(params.ability);
  const quality = canonicalModels.filter((model) => model.quality);
  const owners = [...new Set(quality.map((model) => model.ownerId))].sort();
  const filtered = quality.filter((model) => (!q || `${model.name} ${model.canonicalId}`.toLowerCase().includes(q)) && (!owner || model.ownerId === owner) && (!ability || model.abilities[ability]));
  const rows = sort && order ? stableSort(filtered, (left, right) => {
    if (sort === "name") return compareNullable(left.name, right.name, order);
    if (sort === "quality") return compareNullable(left.quality?.aaIndex, right.quality?.aaIndex, order) || left.name.localeCompare(right.name);
    if (sort === "context") return compareNullable(left.contextWindow, right.contextWindow, order) || left.name.localeCompare(right.name);
    const metric = priceSortMetrics[sort];
    return compareNullable(priceRate(left.displayPrices[currency], metric), priceRate(right.displayPrices[currency], metric), order) || left.name.localeCompare(right.name);
  }) : filtered;
  const revision = catalog.sources.find((source) => source.id === "ai-pricing")?.revision;
  const maxima = {
    quality: maxValue(rows.map((model) => model.quality?.aaIndex)),
    context: maxValue(rows.map((model) => model.contextWindow)),
    textInput: maxValue(rows.map((model) => priceRate(model.displayPrices[currency], "textInput"))),
    textOutput: maxValue(rows.map((model) => priceRate(model.displayPrices[currency], "textOutput"))),
    textInput_cacheRead: maxValue(rows.map((model) => priceRate(model.displayPrices[currency], "textInput_cacheRead"))),
    textInput_cacheWrite: maxValue(rows.map((model) => priceRate(model.displayPrices[currency], "textInput_cacheWrite"))),
  } satisfies Record<"quality" | "context" | PriceMetric, number>;
  const priceLabels: Record<PriceMetric, string> = {
    textInput: msg(locale, "inputPrice"),
    textOutput: msg(locale, "outputPrice"),
    textInput_cacheRead: msg(locale, "cacheReadPrice"),
    textInput_cacheWrite: msg(locale, "cacheCreationPrice"),
  };
  const sortKeyForMetric: Record<PriceMetric, Exclude<CompareSortKey, "name" | "quality" | "context">> = {
    textInput: "input", textOutput: "output", textInput_cacheRead: "cacheRead", textInput_cacheWrite: "cacheWrite",
  };
  const baseQuery = (includeSort = true) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (owner) query.set("owner", owner);
    if (ability) query.set("ability", ability);
    if (includeSort && sortDisabled) query.set("sort", "none");
    else if (includeSort && sort && order) { query.set("sort", sort); query.set("order", order); }
    return query;
  };
  const directionFor = (key: CompareSortKey) => sort === key ? order : null;
  const sortLinkFor = (key: CompareSortKey) => {
    const direction = directionFor(key);
    const nextOrder = direction === null ? "asc" : direction === "asc" ? "desc" : null;
    const query = baseQuery(false);
    if (nextOrder) { query.set("sort", key); query.set("order", nextOrder); }
    else query.set("sort", "none");
    return query.size ? `/compare?${query}` : "/compare";
  };

  return <AppShell locale={locale} section={msg(locale, "compare")}>
    <PageHeader title={msg(locale, "compare")} description={msg(locale, "qualityDescription")} />
    <AutoSubmitForm className="toolbar">
      <SearchField defaultValue={one(params.q)} placeholder={msg(locale, "searchModels")} />
      <select name="owner" defaultValue={owner} aria-label="Owner"><option value="">Owner</option>{owners.map((value) => <option key={value}>{value}</option>)}</select>
      <select name="ability" defaultValue={ability} aria-label={msg(locale, "ability")}><option value="">{msg(locale, "allAbilities")}</option><option value="reasoning">{abilityMsg(locale, "reasoning")}</option><option value="toolCall">{abilityMsg(locale, "toolCall")}</option><option value="vision">{abilityMsg(locale, "vision")}</option></select>
      {sortDisabled
        ? <input type="hidden" name="sort" value="none" />
        : sort && order && <><input type="hidden" name="sort" value={sort} /><input type="hidden" name="order" value={order} /></>}
      <Link href="/compare" className="text-button">{msg(locale, "reset")}</Link>
    </AutoSubmitForm>
    <div className="evidence-banner"><div><strong>{msg(locale, "qualityEvidence")}</strong><span>ai-pricing · {revision?.slice(0, 8) ?? "-"} · MIT</span></div><span>{currency} · {msg(locale, "priceUnit")}</span><span>{quality.length} / {quality.length} {msg(locale, "mappedModels")}</span></div>
    <div className="table-frame">
      {rows.length ? <table className="data-table compare-table">
        <thead><tr>
          <SortableHeader label={msg(locale, "model")} direction={directionFor("name")} href={sortLinkFor("name")} locale={locale} />
          <SortableHeader label="AAIndex" direction={directionFor("quality")} href={sortLinkFor("quality")} locale={locale} />
          {priceMetrics.map((metric) => <SortableHeader key={metric} label={priceLabels[metric]} subtitle={currency} direction={directionFor(sortKeyForMetric[metric])} href={sortLinkFor(sortKeyForMetric[metric])} locale={locale} />)}
          <SortableHeader label={msg(locale, "context")} direction={directionFor("context")} href={sortLinkFor("context")} locale={locale} />
          <th>{abilityMsg(locale, "vision")}</th>
        </tr></thead>
        <tbody>{rows.map((model) => {
          const price = model.displayPrices[currency];
          return <tr key={model.canonicalId}>
            <td className="entity-cell"><Link className="entity-name" href={modelHref(model.canonicalId)}><EntityText name={model.name} id={model.canonicalId} /></Link></td>
            <td className="comparison-cell"><MetricBar label="AAIndex" value={model.quality?.aaIndex} max={maxima.quality} display={String(model.quality?.aaIndex ?? "-")} tone="quality" /></td>
            {priceMetrics.map((metric) => {
              const value = priceRate(price, metric);
              return <td className="comparison-cell" key={metric}><MetricBar label={`${currency} ${priceLabels[metric]}`} value={value} max={maxima[metric]} display={formatPrice(value, currency)} tone={priceMetricTones[metric]} annotation={value != null && isExplicitlyFree(price) ? msg(locale, "free") : undefined} /></td>;
            })}
            <td className="comparison-cell"><MetricBar label={msg(locale, "context")} value={model.contextWindow} max={maxima.context} display={compactNumber(model.contextWindow)} tone="context" /></td>
            <td className="ability-comparison-cell"><span className={model.abilities.vision ? "tag success" : "tag"}>{msg(locale, model.abilities.vision ? "supported" : "unsupported")}</span></td>
          </tr>;
        })}</tbody>
      </table> : <EmptyState>{msg(locale, "noResults")}</EmptyState>}
      <div className="table-footer"><span>{rows.length} / {quality.length} {msg(locale, "mappedModels")}</span></div>
    </div>
  </AppShell>;
}
