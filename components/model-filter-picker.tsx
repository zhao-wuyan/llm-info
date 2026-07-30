import { Filter } from "lucide-react";
import type { Locale, MessageKey } from "@/lib/i18n";
import { msg } from "@/lib/i18n";

type FilterKey = "priced" | "active" | "recentOpen";

const filterLabels: Record<FilterKey, MessageKey> = {
  priced: "onlyPriced",
  active: "onlyActive",
  recentOpen: "recentOpenWeights",
};

/**
 * Combined model filter picker. Pure native form controls so it works
 * without client JS: checkboxes are grouped under `[data-manual-submit]`
 * and an explicit Apply button submits the surrounding form.
 */
export function ModelFilterPicker({
  filters,
  locale,
}: {
  filters: Record<FilterKey, boolean>;
  locale: Locale;
}) {
  const selectedCount = Object.values(filters).filter(Boolean).length;
  return (
    <details className="model-filter-picker" data-manual-submit>
      <summary aria-label={msg(locale, "customizeFilters")}>
        <Filter size={15} aria-hidden />
        <span>{msg(locale, "filters")}</span>
        {selectedCount > 0 && <small>{selectedCount}</small>}
      </summary>
      <div className="model-filter-picker-panel">
        <label className="check-control">
          <input type="checkbox" name="priced" value="1" defaultChecked={filters.priced} />
          {msg(locale, filterLabels.priced)}
        </label>
        <label className="check-control">
          <input type="checkbox" name="active" value="1" defaultChecked={filters.active} />
          {msg(locale, filterLabels.active)}
        </label>
        <label className="check-control">
          <input type="checkbox" name="recent-open" value="1" defaultChecked={filters.recentOpen} />
          {msg(locale, filterLabels.recentOpen)}
          <input type="hidden" name="recent-open" value="0" />
        </label>
        <div className="model-filter-picker-actions">
          <button type="submit">{msg(locale, "applyFilters")}</button>
        </div>
      </div>
    </details>
  );
}
