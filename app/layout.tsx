import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { getLocale } from "@/lib/server-i18n";
import "./globals.css";

export const metadata: Metadata = { title: { default: "LLM Info", template: "%s · LLM Info" }, description: "Canonical LLM models, providers, native pricing, and quality evidence." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "light dark" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning><body><a href="#main-content" className="skip-link">Skip to content</a><Providers>{children}</Providers></body></html>;
}
