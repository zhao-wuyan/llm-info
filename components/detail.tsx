import type { ReactNode } from "react";

/** 两详情页共用的头部骨架；类名结构（detail-header/identity/identity-mark/detail-actions）逐字保留，e2e 与 CSS 依赖。 */
export function DetailHeader({ initials, title, subtitle, tags, actions }: { initials: string; title: string; subtitle: string; tags?: ReactNode; actions?: ReactNode }) {
  return <div className="detail-header"><div className="identity"><span className="identity-mark">{initials}</span><div><h1>{title}</h1><p>{subtitle}</p></div>{tags}</div><div className="detail-actions">{actions}</div></div>;
}

/** 两详情页共用的四格指标条。 */
export function DetailMetrics({ metrics }: { metrics: Array<{ label: string; value: ReactNode }> }) {
  return <div className="detail-metrics">{metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>;
}
