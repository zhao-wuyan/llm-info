export type Currency = "USD" | "CNY";

export interface SourceRef {
  source: string;
  id: string;
}

export interface DisplayPrice {
  priceId: string;
  source: string;
  region: string | null;
  unit: string;
  rates: Record<string, number>;
  free?: boolean;
}

export interface Price extends DisplayPrice {
  id: string;
  currency: Currency;
  observedAt?: string;
  official?: boolean;
  sourceUrl?: string;
  provenance?: string;
}

export interface Quality {
  source: "ai-pricing";
  sourceModel: string;
  sourceDeveloper?: string;
  aaIndex: number;
  observedAt: string | null;
  revision: string;
}

export interface Model {
  id: string;
  providerId: string;
  ownerId: string;
  modelId: string;
  canonicalId: string;
  name: string;
  description?: string;
  type?: string;
  family?: string;
  releasedAt?: string;
  knowledgeCutoff?: string;
  openWeights?: boolean;
  abilities?: Record<string, boolean>;
  contextWindow?: number;
  maxOutput?: number;
  modalities?: { input?: string[]; output?: string[] };
  sourceRefs: SourceRef[];
  pricing: Price[];
  displayPrices: Record<Currency, DisplayPrice | null>;
  quality?: Quality;
  deprecated?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  official: boolean;
  featured?: boolean;
  description?: string;
  api?: string;
  baseUrl?: string;
  website?: string;
  documentation?: string;
  apiKeyUrl?: string;
  enabled?: boolean;
  compat?: Record<string, unknown>;
  sourceRefs: SourceRef[];
}

export interface DataSource {
  id: string;
  name: string;
  role: string;
  url: string;
  repository: string;
  license: string;
  licenseLabel?: string;
  licenseFile?: boolean;
  licenseUrl?: string | null;
  licenseCheckedAt?: string;
  recordCount: number;
  observedAt: string | null;
  revision?: string;
  revisionUrl?: string;
  unmappedCount?: number;
}

export interface Catalog {
  schemaVersion: 1;
  generatedAt: string;
  stats: Record<string, number>;
  sources: DataSource[];
  providers: Provider[];
  models: Model[];
}

export interface CanonicalModel {
  canonicalId: string;
  name: string;
  ownerId: string;
  description?: string;
  family?: string;
  releasedAt?: string;
  knowledgeCutoff?: string;
  openWeights?: boolean;
  abilities: Record<string, boolean>;
  contextWindow?: number;
  maxOutput?: number;
  modalities?: Model["modalities"];
  quality?: Quality;
  channels: Model[];
  providerCount: number;
  minPrices: Record<Currency, DisplayPrice | null>;
  sourceRefs: SourceRef[];
}
