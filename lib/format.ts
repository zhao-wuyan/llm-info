import type { Currency, DisplayPrice } from "./types";

export function compactNumber(value?: number) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export function releaseDateValue(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3] ?? 1);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? timestamp : null;
}

export function formatReleaseDate(value?: string | null) {
  return releaseDateValue(value) == null ? "-" : value ?? "-";
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function priceRate(price: DisplayPrice | null, key: string) {
  const value = price?.rates[key];
  if (value == null) return null;
  return value;
}

export function formatPrice(value: number | null, currency: Currency) {
  if (value == null) return "-";
  const symbol = currency === "USD" ? "$" : "¥";
  return `${symbol}${new Intl.NumberFormat("en", { minimumFractionDigits: value === 0 ? 2 : 0, maximumFractionDigits: 4 }).format(value)}`;
}

export function isExplicitlyFree(price: DisplayPrice | null) {
  return price?.free === true;
}
