"use client";

import { Columns3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ColumnGroup, ColumnPickerOption } from "@/lib/model-columns";
import { defaultColumnIds, parseVisibleColumns, serializeColumns } from "@/lib/model-columns";
import type { Locale, MessageKey } from "@/lib/i18n";
import { msg } from "@/lib/i18n";

const groupLabels: Record<ColumnGroup, MessageKey> = {
  base: "columnGroupBase",
  price: "columnGroupPrice",
  open: "columnGroupOpen",
  board: "columnGroupBoard",
};

const groupOrder: ColumnGroup[] = ["base", "price", "open", "board"];

/**
 * Column customizer. Receives only serializable options so it can be rendered
 * by a client component without passing functions across the RSC boundary.
 * The picker is the only client persistence boundary:
 * - Apply writes the ordered selection to the page-specific storage key and
 *   navigates with a canonical `cols` value.
 * - Reset removes only the current page key and removes `cols` from the URL.
 * - On first client render, if no `cols` is present in the URL, the stored
 *   selection is validated and applied via `router.replace`.
 */
export function ColumnPicker({
  options, visible, locale, resetHref, storageKey, hasUrlColumns,
}: {
  options: readonly ColumnPickerOption[];
  visible: readonly string[];
  locale: Locale;
  resetHref: string;
  storageKey: string;
  hasUrlColumns: boolean;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(() => new Set(visible));
  const [reconciled, setReconciled] = useState(false);

  useEffect(() => {
    setDraft(new Set(visible));
  }, [visible]);

  useEffect(() => {
    if (reconciled || hasUrlColumns || typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    if (stored === null) {
      setReconciled(true);
      return;
    }
    const parsed = parseVisibleColumns(stored, options);
    const defaults = defaultColumnIds(options);
    if (parsed.join(",") !== defaults.join(",")) {
      const next = new URLSearchParams(window.location.search);
      next.delete("page");
      const serialized = serializeColumns(parsed, options);
      if (serialized) next.set("cols", serialized);
      else next.delete("cols");
      const query = next.toString();
      router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname);
    }
    setReconciled(true);
  }, [hasUrlColumns, options, storageKey, router, reconciled]);

  const applyColumns = () => {
    if (typeof window === "undefined") return;
    const selectedIds = options.filter((option) => draft.has(option.id)).map((option) => option.id);
    const serialized = serializeColumns(selectedIds, options);
    localStorage.setItem(storageKey, serialized);
    const next = new URLSearchParams(window.location.search);
    next.delete("page");
    if (serialized) next.set("cols", serialized);
    else next.delete("cols");
    const query = next.toString();
    router.push(query ? `${window.location.pathname}?${query}` : window.location.pathname);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const resetColumns = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  };

  const defaults = defaultColumnIds(options);
  const changed = visible.join(",") !== defaults.join(",");
  const serialized = serializeColumns(visible, options);

  return (
    <details ref={detailsRef} className="column-picker" data-manual-submit>
      {serialized && <input type="hidden" name="cols" value={serialized} />}
      <summary aria-label={msg(locale, "customizeColumns")}>
        <Columns3 size={15} aria-hidden />
        <span>{msg(locale, "columns")}</span>
        <small>{visible.length}</small>
      </summary>
      <div className="column-picker-panel">
        {groupOrder.map((group) => {
          const groupOptions = options.filter((option) => option.group === group);
          if (!groupOptions.length) return null;
          return (
            <fieldset key={group}>
              <legend>{msg(locale, groupLabels[group])}</legend>
              {groupOptions.map((option) => (
                <label key={option.id} className="check-control">
                  <input
                    type="checkbox"
                    value={option.id}
                    checked={draft.has(option.id)}
                    onChange={(event) => {
                      const next = new Set(draft);
                      if (event.target.checked) next.add(option.id);
                      else next.delete(option.id);
                      setDraft(next);
                    }}
                  />
                  <span>
                    {option.label}
                    {option.subtitle && <small> {option.subtitle}</small>}
                  </span>
                  {option.sourceUrl && (
                    <a href={option.sourceUrl} target="_blank" rel="noreferrer" title={`${msg(locale, "viewSource")}: ${option.sourceLabel ?? option.sourceUrl}`} aria-label={`${msg(locale, "viewSource")}: ${option.sourceLabel ?? option.sourceUrl}`}>
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  )}
                </label>
              ))}
            </fieldset>
          );
        })}
        <div className="column-picker-actions">
          <button type="button" onClick={applyColumns}>{msg(locale, "applyColumns")}</button>
          {changed && <Link className="text-button" href={resetHref} onClick={resetColumns}>{msg(locale, "resetColumns")}</Link>}
        </div>
      </div>
    </details>
  );
}
