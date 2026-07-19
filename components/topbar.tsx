"use client";

import { Info, Languages, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import type { Currency } from "@/lib/types";

export function Topbar({ locale, currency, section, detail }: { locale: Locale; currency: Currency; section: string; detail?: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  useEffect(() => setMounted(true), []);
  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const ThemeIcon = !mounted || theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  const themeName = !mounted ? msg(locale, "system") : msg(locale, (theme ?? "system") as "system" | "light" | "dark");
  const changeLocale = () => {
    const next = locale === "zh" ? "en" : "zh";
    document.cookie = `llm-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  const changeCurrency = (next: Currency) => {
    if (next === currency) return;
    document.cookie = `llm-currency=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };
  return <div className="topbar"><div className="breadcrumbs"><span>{section}</span>{detail && <><b>/</b><strong>{detail}</strong></>}</div><div className="top-actions"><button className="icon-button" onClick={() => router.refresh()} aria-label={msg(locale, "refresh")} title={msg(locale, "refresh")}><RefreshCw size={17} /></button><div className="segmented currency-switch" role="group" aria-label={msg(locale, "priceCurrency")}>{(["USD", "CNY"] as Currency[]).map((value) => <button key={value} type="button" className={currency === value ? "active" : ""} aria-pressed={currency === value} aria-label={`${msg(locale, "priceCurrency")}: ${value}`} disabled={isPending} onClick={() => changeCurrency(value)}>{value}</button>)}</div><button className="icon-button" onClick={changeLocale} aria-label={msg(locale, "language")} title={msg(locale, "language")}><Languages size={17} /><span className="compact-label">{locale === "zh" ? "EN" : "中"}</span></button><button className="icon-button" onClick={() => setTheme(nextTheme)} aria-label={`${msg(locale, "theme")}: ${themeName}`} title={`${msg(locale, "theme")}: ${themeName}`}><ThemeIcon size={17} /></button><details className="help-menu"><summary className="icon-button" aria-label="LLM Info" title="LLM Info"><Info size={17} /></summary><div><strong>LLM Info</strong><p>{locale === "zh" ? "价格均为上游原生币种，不做汇率换算。AAIndex 是 ai-pricing 提供的外部 Quality 证据。" : "Prices use upstream native currencies without FX conversion. AAIndex is external Quality evidence from ai-pricing."}</p></div></details></div></div>;
}
