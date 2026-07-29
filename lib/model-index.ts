import rawIndex from "@/data/model-index.json";
import type { Locale } from "./i18n";

export type BoardDirection = "higher" | "lower";
export type BoardKind = "quality" | "arena" | "coding" | "popularity";

export interface BoardMeta {
  id: string;
  name: string;
  label: Record<Locale, string>;
  kind: BoardKind;
  metric: string;
  direction: BoardDirection;
  sourceId: string;
  sourceName: string;
  homepageUrl: string;
  repository?: string;
  license?: string;
  note?: Record<Locale, string>;
  revision?: string | null;
  revisionUrl?: string | null;
  observedAt?: string | null;
  coverage: { entries: number; matched: number; unmatched: number };
}

export interface BoardScore {
  score: number | null;
  rank: number | null;
  metrics: Record<string, number | string | null>;
  sourceModel: string;
  sourceUrl: string | null;
  match: "exact" | "loose";
}

export interface OpenWeightFacts {
  repoId: string;
  license: string | null;
  licenseUrl: string | null;
  parameters: number | null;
  gated: boolean;
  lastModified: string | null;
  createdAt: string | null;
  popularity: {
    downloads30d: number | null;
    downloadsAllTime: number | null;
    likes: number | null;
    trendingScore: number | null;
  };
}

export interface ModelIndexRecord {
  boards: Record<string, BoardScore>;
  openWeights?: OpenWeightFacts;
}

export interface ModelIndex {
  schemaVersion: 1;
  generatedAt: string;
  catalogGeneratedAt: string | null;
  boards: BoardMeta[];
  models: Record<string, ModelIndexRecord>;
  unmapped: Record<string, string[]>;
  stats: Record<string, number>;
}

export const modelIndex = rawIndex as unknown as ModelIndex;
export const boards = modelIndex.boards;
export const boardById = new Map(boards.map((board) => [board.id, board]));

const empty: ModelIndexRecord = { boards: {} };

export function indexFor(canonicalId: string): ModelIndexRecord {
  return modelIndex.models[canonicalId] ?? empty;
}

export function boardScore(canonicalId: string, boardId: string): BoardScore | null {
  return modelIndex.models[canonicalId]?.boards[boardId] ?? null;
}

export function openWeightFacts(canonicalId: string): OpenWeightFacts | null {
  return modelIndex.models[canonicalId]?.openWeights ?? null;
}

export function boardLabel(board: BoardMeta, locale: Locale) {
  return board.label?.[locale] ?? board.name;
}

/** SPDX-ish license id → commercial-use friendliness bucket, for tag colouring. */
export function licenseTone(license: string | null | undefined) {
  if (!license) return "unknown" as const;
  const value = license.toLowerCase();
  if (/^(apache|mit|bsd|isc|mpl|cc-by-4|openrail|unlicense|zlib)/.test(value)) return "permissive" as const;
  if (/(gpl|agpl|cc-by-nc|cc-by-sa|noncommercial|research|non-commercial)/.test(value)) return "restricted" as const;
  if (/(llama|gemma|other|proprietary|custom)/.test(value)) return "custom" as const;
  return "custom" as const;
}

export function formatParameters(parameters: number | null | undefined) {
  if (!parameters) return "-";
  const billions = parameters / 1_000_000_000;
  if (billions >= 1) return `${billions >= 100 ? Math.round(billions) : billions.toFixed(billions >= 10 ? 0 : 1)}B`;
  return `${Math.round(parameters / 1_000_000)}M`;
}

export const openWeightBoardId = "hf-downloads";
export const indexedModelCount = Object.keys(modelIndex.models).length;
