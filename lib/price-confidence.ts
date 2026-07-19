import type {
  CanonicalDisplayPrice,
  Currency,
  DisplayPrice,
  Model,
  OfficialStatus,
  PriceConfidence,
  Provider,
} from "./types";

const RATE_KEYS = ["textInput", "textOutput", "textInput_cacheRead", "textInput_cacheWrite"] as const;
const OWNER_PROVIDER_ALIASES: Record<string, string[]> = {};

interface Candidate {
  channel: Model;
  price: DisplayPrice;
  provider?: Provider;
  observedAt?: string;
  signature: string;
  officialStatus: OfficialStatus;
  officialLikelihood: number;
}

function normalizedIdentity(value?: string) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function identityTokens(value?: string) {
  return String(value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function containsOwner(value: string | undefined, ownerId: string) {
  const owner = normalizedIdentity(ownerId);
  if (owner.length < 3) return false;
  return identityTokens(value).some((token) => normalizedIdentity(token) === owner) || normalizedIdentity(value).startsWith(owner);
}

function domainMatchesOwner(provider: Provider | undefined, ownerId: string) {
  const owner = normalizedIdentity(ownerId);
  if (!provider || owner.length < 4) return false;
  return [provider.website, provider.baseUrl, provider.api, provider.documentation].some((value) => {
    if (!value) return false;
    try {
      return normalizedIdentity(new URL(value).hostname).includes(owner);
    } catch {
      return false;
    }
  });
}

export function officialEvidence(channel: Model, provider?: Provider) {
  const selectedQuotes = Object.values(channel.displayPrices)
    .filter((price): price is DisplayPrice => price !== null)
    .map((price) => channel.pricing.find((quote) => quote.id === price.priceId))
    .filter(Boolean);
  if (provider?.official || selectedQuotes.some((quote) => quote?.official)) {
    return { officialStatus: "verified" as const, officialLikelihood: 100 };
  }

  const owner = normalizedIdentity(channel.ownerId);
  const providerIdentityMatches =
    normalizedIdentity(channel.providerId) === owner ||
    normalizedIdentity(provider?.name) === owner ||
    (OWNER_PROVIDER_ALIASES[channel.ownerId] ?? []).some((id) => normalizedIdentity(id) === normalizedIdentity(channel.providerId));

  let score = 0;
  if (providerIdentityMatches) score += 60;
  if (domainMatchesOwner(provider, channel.ownerId)) score += 20;
  if (containsOwner(channel.modelId, channel.ownerId)) score += 10;
  if (containsOwner(channel.name, channel.ownerId)) score += 5;
  if (new Set(channel.pricing.map((price) => price.source)).size >= 2) score += 10;
  if (!providerIdentityMatches) score = Math.min(score, 40);

  return {
    officialStatus: score >= 80 ? "inferred" as const : "none" as const,
    officialLikelihood: Math.min(100, score),
  };
}

function stableRate(value: number | undefined) {
  return value == null ? "-" : String(Math.round(value * 100_000_000) / 100_000_000);
}

function priceSignature(price: DisplayPrice) {
  return `${price.unit}:${stableRate(price.rates.textInput)}:${stableRate(price.rates.textOutput)}`;
}

function completeness(price: DisplayPrice) {
  return (price.rates.textInput != null ? 3 : 0) +
    (price.rates.textOutput != null ? 3 : 0) +
    (price.rates.textInput_cacheRead != null ? 2 : 0) +
    (price.rates.textInput_cacheWrite != null ? 2 : 0);
}

function freshnessScore(observedAt: string | undefined, referenceDate: string) {
  if (!observedAt) return 0;
  const ageDays = Math.max(0, (Date.parse(referenceDate) - Date.parse(observedAt)) / 86_400_000);
  if (!Number.isFinite(ageDays)) return 0;
  if (ageDays <= 7) return 15;
  if (ageDays <= 30) return 10;
  if (ageDays <= 90) return 5;
  return 0;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function relativeDifference(value: number | undefined, baseline: number | null) {
  if (value == null || baseline == null) return null;
  if (baseline === 0) return value === 0 ? 0 : 1;
  return Math.abs(value - baseline) / Math.abs(baseline);
}

function confidenceLevel(score: number, status: OfficialStatus): PriceConfidence["level"] {
  if (status === "verified") return "verified";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function timestamp(value?: string) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function selectCanonicalDisplayPrice(
  channels: Model[],
  providers: Map<string, Provider>,
  currency: Currency,
  referenceDate: string,
): CanonicalDisplayPrice | null {
  const candidates: Candidate[] = channels.flatMap((channel) => {
    const price = channel.displayPrices[currency];
    if (!price || !RATE_KEYS.some((key) => typeof price.rates[key] === "number")) return [];
    const quote = channel.pricing.find((item) => item.id === price.priceId);
    const evidence = officialEvidence(channel, providers.get(channel.providerId));
    return [{
      channel,
      price,
      provider: providers.get(channel.providerId),
      observedAt: quote?.observedAt,
      signature: priceSignature(price),
      ...evidence,
    }];
  });
  if (candidates.length === 0) return null;

  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) groups.set(candidate.signature, [...(groups.get(candidate.signature) ?? []), candidate]);
  const medianInput = median(candidates.flatMap((candidate) => candidate.price.rates.textInput ?? []));
  const medianOutput = median(candidates.flatMap((candidate) => candidate.price.rates.textOutput ?? []));

  const ranked = candidates.map((candidate) => {
    const peers = groups.get(candidate.signature) ?? [candidate];
    const supportingProviders = [...new Set(peers.map((peer) => peer.channel.providerId))].sort();
    const supportingSources = [...new Set(peers.map((peer) => peer.price.source))].sort();
    const providerCount = supportingProviders.length;
    const consensus = providerCount <= 1 ? 0 : 60 * (1 - Math.exp(-(providerCount - 1) / 1.5));
    const sourceDiversity = Math.min(15, supportingSources.length * 5);
    const freshness = freshnessScore(candidate.observedAt, referenceDate);
    const complete = completeness(candidate.price);
    const differences = [
      relativeDifference(candidate.price.rates.textInput, medianInput),
      relativeDifference(candidate.price.rates.textOutput, medianOutput),
    ].filter((value): value is number => value !== null);
    const outlierPenalty = providerCount === 1 && differences.some((value) => value > 0.1) ? 15 : 0;
    const baseScore = Math.round(Math.max(0, Math.min(100, consensus + sourceDiversity + freshness + complete - outlierPenalty)));
    const score = candidate.officialStatus === "verified"
      ? 100
      : candidate.officialStatus === "inferred"
        ? Math.max(baseScore, candidate.officialLikelihood)
        : baseScore;
    const confidence: PriceConfidence = {
      score,
      level: confidenceLevel(score, candidate.officialStatus),
      reason: candidate.officialStatus === "verified"
        ? "verified-official"
        : candidate.officialStatus === "inferred"
          ? "inferred-official"
          : providerCount > 1
            ? "provider-consensus"
            : "single-provider",
      supportingProviderCount: providerCount,
      supportingProviders,
      supportingSources,
      observedAt: candidate.observedAt ?? null,
    };
    return { candidate, confidence, complete };
  }).sort((left, right) => {
    const tier = (status: OfficialStatus) => status === "verified" ? 2 : status === "inferred" ? 1 : 0;
    return tier(right.candidate.officialStatus) - tier(left.candidate.officialStatus) ||
      right.confidence.score - left.confidence.score ||
      right.confidence.supportingProviderCount - left.confidence.supportingProviderCount ||
      right.complete - left.complete ||
      timestamp(right.candidate.observedAt) - timestamp(left.candidate.observedAt) ||
      left.candidate.price.priceId.localeCompare(right.candidate.price.priceId);
  });

  const selected = ranked[0];
  return {
    ...selected.candidate.price,
    providerId: selected.candidate.channel.providerId,
    officialStatus: selected.candidate.officialStatus,
    officialLikelihood: selected.candidate.officialLikelihood,
    confidence: selected.confidence,
  };
}
