"use client";

import type { FormEvent, ReactNode } from "react";

export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if ((event.target as HTMLElement).matches("select,input[type=checkbox]")) event.currentTarget.requestSubmit();
  };
  return <form className={className} onChange={submit}>{children}</form>;
}
