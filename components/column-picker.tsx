import { Columns3 } from "lucide-react";
import { modelColumns } from "@/lib/model-columns";
import { msg, type Locale } from "@/lib/i18n";

/**
 * 自定义列选择器：使用原生 details/checkbox，在 AutoSubmitForm 内提交后由服务端渲染列。
 * colsSet 隐藏字段用于区分「未配置（走默认列）」与「用户主动清空全部可选列」。
 */
export function ColumnPicker({ locale, visibleColumns }: { locale: Locale; visibleColumns: readonly string[] }) {
  const selected = new Set(visibleColumns);
  return (
    <details className="column-picker">
      <summary aria-label={msg(locale, "customColumns")}>
        <Columns3 aria-hidden size={15} />
        <span>{msg(locale, "customColumns")}</span>
        <small>{selected.size}/{modelColumns.length}</small>
      </summary>
      <div className="column-picker-panel">
        <p>{msg(locale, "columnsHint")}</p>
        <input type="hidden" name="colsSet" value="1" />
        {modelColumns.map((column) => (
          <label key={column.id}>
            <input type="checkbox" name="cols" value={column.id} defaultChecked={selected.has(column.id)} />
            {msg(locale, column.labelKey)}
          </label>
        ))}
      </div>
    </details>
  );
}
