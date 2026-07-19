"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export function TableRowLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const router = useRouter();
  const navigate = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest("a,button,input,select,summary")) return;
    router.push(href);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(href); }
  };
  return <tr role="link" aria-label={label} tabIndex={0} onClick={navigate} onKeyDown={onKeyDown}>{children}</tr>;
}
