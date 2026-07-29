"use client";

import type { FormEvent, ReactNode } from "react";

/**
 * Auto-submits on select/checkbox changes, except inside `[data-manual-submit]`
 * containers (the column picker applies its selection explicitly).
 */
export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-manual-submit]")) return;
    if (target.matches("select,input[type=checkbox]")) event.currentTarget.requestSubmit();
  };
  return <form className={className} onChange={submit}>{children}</form>;
}
