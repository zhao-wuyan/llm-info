import type { Lifecycle, LifecycleStatus, Model } from "./types";

// 将 YYYY-MM-DD（或 releaseDateValue 支持的 YYYY-M/D 形态）解析为 UTC 0 点毫秒数。
// 复用与发布日期一致的解析口径，保证下线阈值与列表排序口径统一。
export function deprecationTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3] ?? 1);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return timestamp;
}

const statusSeverity: Record<LifecycleStatus, number> = { active: 0, deprecated: 1, sunset: 2 };

// 单个 channel 的生命周期：LiteLLM deprecation_date 已过视为已下线，未到但存在或 aidy deprecated 视为即将下线。
export function channelLifecycle(model: Model, now: Date = new Date()): Lifecycle {
  const deprecationDate = model.deprecationDate;
  const timestamp = deprecationTimestamp(deprecationDate);
  if (timestamp !== null) {
    const source = "litellm";
    if (timestamp <= now.getTime()) {
      return { status: "sunset", deprecationDate, source };
    }
    return { status: "deprecated", deprecationDate, source };
  }
  if (model.deprecated) {
    return { status: "deprecated", deprecated: true, source: "aidy-models" };
  }
  return { status: "active" };
}

// 聚合到 canonical 层：取最严重状态，下线日期取所有 channel 中最早的一个。
export function canonicalLifecycle(channels: readonly Model[], now: Date = new Date()): Lifecycle {
  let worst: LifecycleStatus = "active";
  let earliestDate: string | undefined;
  let deprecated = false;
  let source: string | undefined;
  for (const channel of channels) {
    const lifecycle = channelLifecycle(channel, now);
    if (statusSeverity[lifecycle.status] > statusSeverity[worst]) {
      worst = lifecycle.status;
    }
    if (lifecycle.deprecated) deprecated = true;
    if (lifecycle.deprecationDate) {
      const ts = deprecationTimestamp(lifecycle.deprecationDate);
      const current = deprecationTimestamp(earliestDate);
      if (ts !== null && (current === null || ts < current)) {
        earliestDate = lifecycle.deprecationDate;
        source = lifecycle.source;
      }
    }
  }
  return {
    status: worst,
    deprecationDate: earliestDate,
    deprecated: deprecated || undefined,
    source,
  };
}

export function isActivelySupported(lifecycle: Lifecycle): boolean {
  return lifecycle.status === "active";
}

// 「开源模型仅看近 1 年」：开源权重模型且发布时间在近一年内（无发布时间的开源模型不计入活跃）。
// 接受结构类型，使 CanonicalModel 与原始 Model 均可传入。
export function isRecentOpenWeights(model: { openWeights?: boolean; releasedAt?: string }, now: Date = new Date(), windowDays = 365): boolean {
  if (!model.openWeights) return true;
  const releasedAt = model.releasedAt;
  if (!releasedAt) return false;
  const timestamp = deprecationTimestamp(releasedAt);
  if (timestamp === null) return false;
  return timestamp >= now.getTime() - windowDays * 86_400_000;
}
