"use client";

import { BarChart3, Box, Building2, Database, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import type { Locale } from "@/lib/i18n";
import { msg } from "@/lib/i18n";

const items = [
  { href: "/models", key: "models", icon: Box },
  { href: "/compare", key: "compare", icon: BarChart3 },
  { href: "/providers", key: "providers", icon: Building2 },
  { href: "/sources", key: "sources", icon: Database },
] as const;

export function Sidebar({ locale, generatedAt, sourceCount }: { locale: Locale; generatedAt: string; sourceCount: number }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const closeDrawer = () => drawer.current?.close();
  const nav = (
    <>
      <Link className="brand" href="/models" onClick={closeDrawer}>
        <span className="brand-mark"><Database size={18} /></span><strong>LLM INFO</strong>
      </Link>
      <nav className="primary-nav" aria-label={locale === "zh" ? "主导航" : "Primary navigation"}>
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={closeDrawer}><Icon size={17} /><span>{msg(locale, key)}</span></Link>;
        })}
      </nav>
      <div className="nav-spacer" />
      <div className="data-status"><span><i />{msg(locale, "dataUpdated")}</span><small>{generatedAt.slice(0, 10)} · {sourceCount} {locale === "zh" ? "个数据源" : "sources"}</small></div>
    </>
  );
  return (
    <>
      <aside className="sidebar">{nav}</aside>
      <header className="mobile-header"><Link className="brand" href="/models"><span className="brand-mark"><Database size={18} /></span><strong>LLM INFO</strong></Link><button className="icon-button" aria-label={msg(locale, "menu")} title={msg(locale, "menu")} onClick={() => drawer.current?.showModal()}><Menu size={20} /></button></header>
      <dialog ref={drawer} className="mobile-drawer"><button className="icon-button drawer-close" aria-label={msg(locale, "close")} title={msg(locale, "close")} onClick={closeDrawer}><X size={20} /></button>{nav}</dialog>
    </>
  );
}
