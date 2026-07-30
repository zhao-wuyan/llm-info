import { describe, expect, test } from "vitest";
import {
  canonicalLifecycle,
  channelLifecycle,
  deprecationTimestamp,
  recentOpenWeightModelIds,
} from "@/lib/lifecycle";
import type { Model, Provider } from "@/lib/types";

const baseModel = (overrides: Partial<Model> = {}): Model => ({
  id: "x/y",
  providerId: "x",
  ownerId: "x",
  modelId: "y",
  canonicalId: "x/y",
  name: "y",
  sourceRefs: [],
  pricing: [],
  displayPrices: { USD: null, CNY: null },
  ...overrides,
});

describe("deprecationTimestamp", () => {
  test("parses YYYY-MM-DD into a UTC midnight timestamp", () => {
    expect(deprecationTimestamp("2026-02-27")).toBe(Date.UTC(2026, 1, 27));
  });

  test("accepts the loose YYYY-M-D forms shared with release dates", () => {
    expect(deprecationTimestamp("2025-4-9")).toBe(Date.UTC(2025, 3, 9));
    expect(deprecationTimestamp("2025-4")).toBe(Date.UTC(2025, 3, 1));
  });

  test("rejects non-date strings and invalid calendar dates", () => {
    expect(deprecationTimestamp("date when the model becomes deprecated")).toBeNull();
    expect(deprecationTimestamp("2025-13-01")).toBeNull();
    expect(deprecationTimestamp("2025-02-30")).toBeNull();
    expect(deprecationTimestamp(undefined)).toBeNull();
  });
});

describe("channelLifecycle", () => {
  const now = new Date(Date.UTC(2026, 6, 29));

  test("treats an unset model as active", () => {
    expect(channelLifecycle(baseModel(), now)).toEqual({ status: "active" });
  });

  test("promotes a future deprecation_date to deprecated with the litellm source", () => {
    const lifecycle = channelLifecycle(baseModel({ deprecationDate: "2026-12-31" }), now);
    expect(lifecycle.status).toBe("deprecated");
    expect(lifecycle.deprecationDate).toBe("2026-12-31");
    expect(lifecycle.source).toBe("litellm");
  });

  test("flips a past deprecation_date to sunset", () => {
    const lifecycle = channelLifecycle(baseModel({ deprecationDate: "2025-06-06" }), now);
    expect(lifecycle.status).toBe("sunset");
    expect(lifecycle.deprecationDate).toBe("2025-06-06");
  });

  test("treats the boundary day itself as sunset (inclusive)", () => {
    const lifecycle = channelLifecycle(baseModel({ deprecationDate: "2026-07-29" }), now);
    expect(lifecycle.status).toBe("sunset");
  });

  test("falls back to aidy-models deprecated flag without a date", () => {
    const lifecycle = channelLifecycle(baseModel({ deprecated: true }), now);
    expect(lifecycle).toEqual({ status: "deprecated", deprecated: true, source: "aidy-models" });
  });

  test("prefers an explicit deprecation_date over the aidy deprecated flag", () => {
    const lifecycle = channelLifecycle(baseModel({ deprecated: true, deprecationDate: "2027-01-01" }), now);
    expect(lifecycle.status).toBe("deprecated");
    expect(lifecycle.source).toBe("litellm");
  });
});

describe("canonicalLifecycle", () => {
  const now = new Date(Date.UTC(2026, 6, 29));
  const provider = (id: string, official: boolean): Provider => ({
    id,
    name: id,
    official,
    sourceRefs: [],
  });

  test("aggregates to active when every channel is active", () => {
    expect(canonicalLifecycle(
      [baseModel(), baseModel({ id: "x/z" })],
      new Map(),
      now,
    )).toEqual({ status: "active" });
  });

  test("uses an active direct official channel instead of deprecated and sunset resellers", () => {
    const channels = [
      baseModel({ id: "openai/gpt-4", providerId: "openai", ownerId: "openai" }),
      baseModel({ id: "poe/gpt-4", providerId: "poe", ownerId: "openai", deprecationDate: "2027-01-01" }),
      baseModel({ id: "openrouter/gpt-4", providerId: "openrouter", ownerId: "openai", deprecationDate: "2025-06-06" }),
    ];
    const lifecycle = canonicalLifecycle(
      channels,
      new Map([
        ["openai", provider("openai", true)],
        ["poe", provider("poe", false)],
        ["openrouter", provider("openrouter", false)],
      ]),
      now,
    );

    expect(lifecycle.status).toBe("active");
    expect(lifecycle.deprecationDate).toBeUndefined();
    expect(lifecycle.deprecated).toBeUndefined();
    expect(lifecycle.source).toBeUndefined();
  });

  test("uses a sunset direct official channel instead of an active reseller", () => {
    const lifecycle = canonicalLifecycle(
      [
        baseModel({
          id: "openai/gpt-4-0613",
          providerId: "openai",
          ownerId: "openai",
          deprecationDate: "2025-06-06",
        }),
        baseModel({ id: "poe/gpt-4-0613", providerId: "poe", ownerId: "openai" }),
      ],
      new Map([
        ["openai", provider("openai", true)],
        ["poe", provider("poe", false)],
      ]),
      now,
    );

    expect(lifecycle).toEqual({
      status: "sunset",
      deprecationDate: "2025-06-06",
      source: "litellm",
    });
  });

  test("falls back to active when there is no direct official evidence", () => {
    const lifecycle = canonicalLifecycle(
      [
        baseModel({ id: "poe/a", providerId: "poe", ownerId: "openai", deprecated: true }),
        baseModel({ id: "openrouter/a", providerId: "openrouter", ownerId: "openai" }),
      ],
      new Map([
        ["poe", provider("poe", true)],
        ["openrouter", provider("openrouter", false)],
      ]),
      now,
    );

    expect(lifecycle).toEqual({ status: "active" });
  });

  test("selects deprecated over sunset when no selected channel is active", () => {
    const lifecycle = canonicalLifecycle(
      [
        baseModel({ id: "poe/a", providerId: "poe", deprecationDate: "2027-01-01" }),
        baseModel({ id: "openrouter/a", providerId: "openrouter", deprecationDate: "2025-06-06" }),
      ],
      new Map(),
      now,
    );

    expect(lifecycle.status).toBe("deprecated");
    expect(lifecycle.deprecationDate).toBe("2027-01-01");
    expect(lifecycle.source).toBe("litellm");
  });

  test("selects sunset only when every selected channel is sunset", () => {
    const lifecycle = canonicalLifecycle(
      [
        baseModel({ id: "poe/a", providerId: "poe", deprecationDate: "2025-06-06" }),
        baseModel({ id: "openrouter/a", providerId: "openrouter", deprecationDate: "2024-01-01" }),
      ],
      new Map(),
      now,
    );

    expect(lifecycle.status).toBe("sunset");
    expect(lifecycle.deprecationDate).toBe("2024-01-01");
  });

  test("derives date, source, and deprecated facts only from the selected status cohort", () => {
    const lifecycle = canonicalLifecycle(
      [
        baseModel({ id: "reseller/sunset", providerId: "reseller", deprecationDate: "2024-01-01" }),
        baseModel({ id: "reseller/dated", providerId: "reseller", deprecationDate: "2026-12-01" }),
        baseModel({ id: "reseller/flagged", providerId: "reseller", deprecated: true }),
      ],
      new Map(),
      now,
    );

    expect(lifecycle).toEqual({
      status: "deprecated",
      deprecationDate: "2026-12-01",
      deprecated: true,
      source: "litellm",
    });
  });
});

describe("recentOpenWeightModelIds", () => {
  const now = new Date(Date.UTC(2026, 6, 29));
  const candidate = (canonicalId: string, overrides: Partial<{ ownerId: string; family: string; name: string; openWeights: boolean; releasedAt: string | undefined }> = {}) => ({
    canonicalId,
    ownerId: "qwen",
    family: "qwen",
    name: canonicalId,
    openWeights: true,
    ...overrides,
  });

  test("keeps closed models and open models released within the last year", () => {
    const models = [
      candidate("vendor/closed", { openWeights: false, releasedAt: "2020-01-01" }),
      candidate("qwen/qwen3", { releasedAt: "2026-01-01" }),
    ];
    const allowed = recentOpenWeightModelIds(models, now);
    expect(allowed.has("vendor/closed")).toBe(true);
    expect(allowed.has("qwen/qwen3")).toBe(true);
  });

  test("keeps the latest two inferred generations even when they are older than one year", () => {
    const models = [
      candidate("qwen/qwen2.5-72b", { releasedAt: "2023-01-01" }),
      candidate("qwen/qwen3-32b", { releasedAt: "2024-01-01" }),
      candidate("qwen/qwen3.5-27b", { releasedAt: "2024-02-01" }),
      candidate("qwen/qwen3.5-122b", { releasedAt: "2024-02-01" }),
    ];
    const allowed = recentOpenWeightModelIds(models, now);
    expect(allowed.has("qwen/qwen2.5-72b")).toBe(false);
    expect(allowed.has("qwen/qwen3-32b")).toBe(true);
    expect(allowed.has("qwen/qwen3.5-27b")).toBe(true);
    expect(allowed.has("qwen/qwen3.5-122b")).toBe(true);
  });

  test("excludes open models with neither a recent release nor an inferable generation", () => {
    const allowed = recentOpenWeightModelIds([candidate("qwen/experimental", { releasedAt: undefined })], now);
    expect(allowed.has("qwen/experimental")).toBe(false);
  });
});
