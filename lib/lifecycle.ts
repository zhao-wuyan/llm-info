import type { Lifecycle, Model, Provider } from "./types";

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

// 聚合到 canonical 层：直连官方渠道优先；无官方证据时，任一可用渠道即可保持在售。
export function canonicalLifecycle(
  channels: readonly Model[],
  providerById: ReadonlyMap<string, Provider>,
  now: Date = new Date(),
): Lifecycle {
  const officialChannels = channels.filter((channel) => {
    const provider = providerById.get(channel.providerId);
    const providerId = channel.providerId.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const ownerId = channel.ownerId.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return provider?.official === true && providerId === ownerId;
  });
  const selectedChannels = officialChannels.length > 0 ? officialChannels : channels;
  const selected = selectedChannels.map((channel) => ({
    channel,
    lifecycle: channelLifecycle(channel, now),
  }));
  const status = selected.some(({ lifecycle }) => lifecycle.status === "active")
    ? "active"
    : selected.some(({ lifecycle }) => lifecycle.status === "deprecated")
      ? "deprecated"
      : "sunset";
  const cohort = selected
    .filter(({ lifecycle }) => lifecycle.status === status)
    .sort((left, right) => left.channel.id.localeCompare(right.channel.id));
  const dated = cohort
    .filter(({ lifecycle }) => deprecationTimestamp(lifecycle.deprecationDate) !== null)
    .sort((left, right) => {
      const dateDifference = deprecationTimestamp(left.lifecycle.deprecationDate)!
        - deprecationTimestamp(right.lifecycle.deprecationDate)!;
      return dateDifference || left.channel.id.localeCompare(right.channel.id);
    });
  const evidence = dated[0] ?? cohort.find(({ lifecycle }) => lifecycle.source);

  return {
    status,
    deprecationDate: evidence?.lifecycle.deprecationDate,
    deprecated: cohort.some(({ lifecycle }) => lifecycle.deprecated) || undefined,
    source: evidence?.lifecycle.source,
  };
}

export function isActivelySupported(lifecycle: Lifecycle): boolean {
  return lifecycle.status === "active";
}

interface OpenWeightGenerationModel {
  canonicalId: string;
  ownerId: string;
  family?: string;
  name: string;
  releasedAt?: string;
  openWeights?: boolean;
}

function normalizedSeries(model: OpenWeightGenerationModel): string {
  const family = model.family?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-(?:[a-z]?\d+(?:-\d+)*)$/, "");
  if (family) return `${model.ownerId}/${family}`;
  const slug = model.canonicalId.split("/").at(-1)?.toLowerCase() ?? model.name.toLowerCase();
  const prefix = slug.match(/^[a-z]+(?:-[a-z]+)*/)?.[0] ?? slug;
  return `${model.ownerId}/${prefix}`;
}

function inferredGeneration(model: OpenWeightGenerationModel): number[] | null {
  const slug = model.canonicalId.split("/").at(-1)?.toLowerCase() ?? model.name.toLowerCase();
  const match = /(?:^|[a-z]+[-_.]?)(?:v|m|r)?(\d+(?:\.\d+)?)(?=$|[-_.])/.exec(slug);
  if (!match) return null;
  const parts = match[1].split(".").map(Number);
  return parts[0] <= 20 ? parts : null;
}

function compareGenerations(left: readonly number[], right: readonly number[]) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function generationKey(generation: readonly number[]) {
  return generation.join(".");
}

// Closed models always remain visible. Open-weight models are retained when released within
// the rolling window or when their inferred numeric version is among the latest generations
// in the same owner/family series. Models lacking both signals are conservatively excluded.
export function recentOpenWeightModelIds(
  models: readonly OpenWeightGenerationModel[],
  now: Date = new Date(),
  windowDays = 365,
  generationLimit = 2,
): Set<string> {
  const allowed = new Set<string>();
  const bySeries = new Map<string, Array<{ id: string; generation: number[] }>>();
  const cutoff = now.getTime() - windowDays * 86_400_000;

  for (const model of models) {
    if (!model.openWeights) {
      allowed.add(model.canonicalId);
      continue;
    }
    const releasedAt = deprecationTimestamp(model.releasedAt);
    if (releasedAt !== null && releasedAt >= cutoff) allowed.add(model.canonicalId);
    const generation = inferredGeneration(model);
    if (!generation) continue;
    const series = normalizedSeries(model);
    bySeries.set(series, [...(bySeries.get(series) ?? []), { id: model.canonicalId, generation }]);
  }

  for (const candidates of bySeries.values()) {
    const latest = [...new Map(candidates.map(({ generation }) => [generationKey(generation), generation])).values()]
      .sort(compareGenerations)
      .slice(0, generationLimit)
      .map(generationKey);
    const accepted = new Set(latest);
    for (const candidate of candidates) {
      if (accepted.has(generationKey(candidate.generation))) allowed.add(candidate.id);
    }
  }
  return allowed;
}
