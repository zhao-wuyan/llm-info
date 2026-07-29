import { describe, expect, test } from "vitest";
import {
  canonicalLifecycle,
  channelLifecycle,
  deprecationTimestamp,
  isRecentOpenWeights,
} from "@/lib/lifecycle";
import type { Model } from "@/lib/types";

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

  test("aggregates to active when every channel is active", () => {
    expect(canonicalLifecycle([baseModel(), baseModel({ id: "x/z" })], now)).toEqual({ status: "active" });
  });

  test("keeps the worst status across channels", () => {
    const channels = [
      baseModel({ id: "openai/gpt-4-0613", deprecationDate: "2025-06-06" }),
      baseModel({ id: "poe/gpt-4", deprecationDate: "2027-01-01" }),
    ];
    const lifecycle = canonicalLifecycle(channels, now);
    expect(lifecycle.status).toBe("sunset");
    expect(lifecycle.deprecationDate).toBe("2025-06-06");
    expect(lifecycle.source).toBe("litellm");
  });

  test("picks the earliest deprecation date when several channels are sunsetting", () => {
    const channels = [
      baseModel({ id: "openai/a", deprecationDate: "2026-12-01" }),
      baseModel({ id: "azure/b", deprecationDate: "2026-03-01" }),
    ];
    const lifecycle = canonicalLifecycle(channels, now);
    expect(lifecycle.deprecationDate).toBe("2026-03-01");
  });

  test("upgrades to deprecated when a channel only carries the aidy flag", () => {
    const channels = [baseModel({ id: "openai/a" }), baseModel({ id: "poe/b", deprecated: true })];
    const lifecycle = canonicalLifecycle(channels, now);
    expect(lifecycle.status).toBe("deprecated");
    expect(lifecycle.deprecated).toBe(true);
  });
});

describe("isRecentOpenWeights", () => {
  const now = new Date(Date.UTC(2026, 6, 29));

  test("keeps closed models regardless of release date", () => {
    expect(isRecentOpenWeights({ openWeights: false }, now)).toBe(true);
    expect(isRecentOpenWeights({ openWeights: false, releasedAt: "2020-01-01" }, now)).toBe(true);
  });

  test("keeps open weights models released within the last year", () => {
    expect(isRecentOpenWeights({ openWeights: true, releasedAt: "2026-01-01" }, now)).toBe(true);
  });

  test("drops open weights models released more than a year ago", () => {
    expect(isRecentOpenWeights({ openWeights: true, releasedAt: "2024-01-01" }, now)).toBe(false);
  });

  test("drops open weights models with no release date", () => {
    expect(isRecentOpenWeights({ openWeights: true }, now)).toBe(false);
  });
});
