import { Columns3, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ColumnDef, ColumnGroup } from "@/lib/model-columns";
import { defaultColumnIds } from "@/lib/model-columns";
import type { Locale, MessageKey } from "@/lib/i18n";
import { msg } from "@/lib/i18n";
import type { Currency } from "@/lib/types";

const groupLabels: Record<ColumnGroup, MessageKey> = {
  base: "columnGroupBase",
  price: "columnGroupPrice",
  open: "columnGroupOpen",
  board: "columnGroupBoard",
};

const groupOrder: ColumnGroup[] = ["base", "price", "open", "board"];

/**
 * Column customizer. Pure form controls so it works without client JS:
 * the surrounding form submits `cols` as a comma-joined list.
 */
export function ColumnPicker({
  columns, visible, locale, currency, resetHref,
}: {
  columns: readonly ColumnDef[];
  visible: readonly string[];
  locale: Locale;
  currency: Currency;
  resetHref: string;
}) {
  const selected = new Set(visible);
  const changed = defaultColumnIds(columns).join(",") !== [...visible].join(",");
  return (
    <details className="column-picker" data-manual-submit>
      <summary aria-label={msg(locale, "customizeColumns")}>
        <Columns3 size={15} aria-hidden />
        <span>{msg(locale, "columns")}</span>
        <small>{visible.length}</small>
      </summary>
      <div className="column-picker-panel">
        {groupOrder.map((group) => {
          const groupColumns = columns.filter((column) => column.group === group);
          if (!groupColumns.length) return null;
          return (
            <fieldset key={group}>
              <legend>{msg(locale, groupLabels[group])}</legend>
              {groupColumns.map((column) => (
                <label key={column.id} className="check-control">
                  <input type="checkbox" name="cols" value={column.id} defaultChecked={selected.has(column.id)} />
                  <span>
                    {column.label(locale)}
                    {column.subtitle && <small> {column.subtitle(currency)}</small>}
                  </span>
                  {column.sourceUrl && (
                    <a href={column.sourceUrl} target="_blank" rel="noreferrer" title={`${msg(locale, "viewSource")}: ${column.sourceLabel ?? column.sourceUrl}`} aria-label={`${msg(locale, "viewSource")}: ${column.sourceLabel ?? column.sourceUrl}`}>
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  )}
                </label>
              ))}
            </fieldset>
          );
        })}
        <div className="column-picker-actions">
          <button type="submit">{msg(locale, "applyColumns")}</button>
          {changed && <Link className="text-button" href={resetHref}>{msg(locale, "resetColumns")}</Link>}
        </div>
      </div>
    </details>
  );
}
