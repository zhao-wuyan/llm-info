"use client";

import { useEffect } from "react";

export function AutoSubmitBehavior({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-manual-submit]")) return;
      if (target.matches("select,input[type=checkbox]")) form.requestSubmit();
    };
    const handleSubmit = () => {
      form.querySelectorAll<HTMLDetailsElement>("details[data-manual-submit][open]").forEach((details) => {
        details.open = false;
      });
    };

    form.addEventListener("change", handleChange);
    form.addEventListener("submit", handleSubmit);
    return () => {
      form.removeEventListener("change", handleChange);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [formId]);

  return null;
}
