import { useId, type ReactNode } from "react";
import { AutoSubmitBehavior } from "./auto-submit-behavior";

export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  const formId = useId();

  return <>
    <form id={formId} className={className}>{children}</form>
    <AutoSubmitBehavior formId={formId} />
  </>;
}
