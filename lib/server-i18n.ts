import { cookies } from "next/headers";
import type { Locale } from "./i18n";
import type { Currency } from "./types";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("llm-locale")?.value;
  return value === "en" ? "en" : "zh";
}

export async function getCurrency(): Promise<Currency> {
  const value = (await cookies()).get("llm-currency")?.value;
  return value === "CNY" ? "CNY" : "USD";
}
