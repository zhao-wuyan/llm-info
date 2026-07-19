import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Currency, DisplayPrice } from "@/lib/types";
import { formatPrice, isExplicitlyFree, priceRate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import type { SortOrder } from "@/lib/table-sort";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function MetricStrip({ metrics }: { metrics: Array<{ value: string | number; label: string }> }) {
  return <div className="metric-strip">{metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</div>;
}

export function SearchField({ name = "q", defaultValue, placeholder }: { name?: string; defaultValue?: string; placeholder: string }) {
  return <label className="search-field"><span className="sr-only">{placeholder}</span><Search size={16} /><input name={name} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function EntityText({ name, id }: { name: string; id: string }) {
  return <><span className="entity-title" title={name}>{name}</span>{id !== name && <small title={id}>{id}</small>}</>;
}

function SortHeaderContent({ label, subtitle, direction }: { label: string; subtitle?: string; direction: SortOrder | null }) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
  return <><span className="sortable-header-copy"><span>{label}</span>{subtitle && <small>{subtitle}</small>}</span><Icon aria-hidden size={14} /></>;
}

function sortAction(locale: Locale, label: string, subtitle: string | undefined, direction: SortOrder | null) {
  const next = direction === null ? "sortAscending" : direction === "asc" ? "sortDescending" : "sortNone";
  return `${msg(locale, "sortBy")} ${label}${subtitle ? ` ${subtitle}` : ""}: ${msg(locale, next)}`;
}

export function SortableHeader({ label, subtitle, direction, href, locale }: { label: string; subtitle?: string; direction: SortOrder | null; href: string; locale: Locale }) {
  const action = sortAction(locale, label, subtitle, direction);
  return <th aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}><Link className={`sortable-header${direction ? " active" : ""}`} href={href} aria-label={action} title={action}><SortHeaderContent label={label} subtitle={subtitle} direction={direction} /></Link></th>;
}

export function SortableButtonHeader({ label, subtitle, direction, onSort, locale }: { label: string; subtitle?: string; direction: SortOrder | null; onSort: () => void; locale: Locale }) {
  const action = sortAction(locale, label, subtitle, direction);
  return <th aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}><button type="button" className={`sortable-header${direction ? " active" : ""}`} onClick={onSort} aria-label={action} title={action}><SortHeaderContent label={label} subtitle={subtitle} direction={direction} /></button></th>;
}

export function PriceValue({ price, rate, currency, locale }: { price: DisplayPrice | null; rate: string; currency: Currency; locale: Locale }) {
  const value = priceRate(price, rate);
  if (value === null) return <span className="missing">-</span>;
  const isFree = isExplicitlyFree(price);
  return <span className={isFree ? "free-price" : "price"}>{isFree && <small>{msg(locale, "free")}</small>}{formatPrice(value, currency)}</span>;
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const values = [...new Set([1, Math.max(1, page - 1), page, Math.min(pages, page + 1), pages])].sort((a, b) => a - b);
  return <nav className="pagination" aria-label="Pagination"><Link aria-label="上一页 / Previous page" aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined} href={href(Math.max(1, page - 1))}><ChevronLeft size={15} /></Link>{values.map((value, index) => <span key={value}>{index > 0 && value - values[index - 1] > 1 && <i>…</i>}<Link className={value === page ? "current" : ""} aria-current={value === page ? "page" : undefined} href={href(value)}>{value}</Link></span>)}<Link aria-label="下一页 / Next page" aria-disabled={page === pages} tabIndex={page === pages ? -1 : undefined} href={href(Math.min(pages, page + 1))}><ChevronRight size={15} /></Link></nav>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state"><Search size={24} /><p>{children}</p></div>;
}
