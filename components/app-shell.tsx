import type { ReactNode } from "react";
import { catalog } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";
import { getCurrency } from "@/lib/server-i18n";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export async function AppShell({ children, locale, section, detail }: { children: ReactNode; locale: Locale; section: string; detail?: string }) {
  const currency = await getCurrency();
  return <div className="app-shell"><Sidebar locale={locale} generatedAt={catalog.generatedAt} sourceCount={catalog.sources.length} /><div className="main-region"><Topbar locale={locale} currency={currency} section={section} detail={detail} /><main id="main-content" className="content">{children}</main></div></div>;
}
