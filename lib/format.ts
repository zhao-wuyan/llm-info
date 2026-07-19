import type { Currency, DisplayPrice } from "./types";

export function compactNumber(value?: number) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
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
