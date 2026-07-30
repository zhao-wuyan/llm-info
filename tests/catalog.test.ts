import { describe, expect, it } from "vitest";
import { canonicalModels, catalog, modelByCanonicalId, providerById, providerStats } from "@/lib/catalog";
import { formatPrice, isExplicitlyFree, priceRate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { resolveCanonicalModelId } from "@/lib/model-aliases";

describe("catalog view model", () => {
  it("groups channel records by canonicalId without mutating source data", () => {
    const expectedChannelIds = catalog.models.map((model) => model.id).sort();
    const actualChannelIds = canonicalModels.flatMap((model) => model.channels.map((channel) => channel.id)).sort();

    expect(canonicalModels.length).toBe(new Set(catalog.models.map((model) => resolveCanonicalModelId(model.canonicalId))).size);
    expect(actualChannelIds).toEqual(expectedChannelIds);
    expect(canonicalModels.every((model) =>
      model.channels.every((channel) => resolveCanonicalModelId(channel.canonicalId) === model.canonicalId)
    )).toBe(true);
  });

  it("preserves native currency absence", () => {
    const model = modelByCanonicalId.get("openai/gpt-5.6");
    expect(model?.displayPrices.USD).not.toBeNull();
    expect(model?.displayPrices.CNY).toBeNull();
    expect(formatPrice(null, "CNY")).toBe("-");
    expect(formatPrice(0, "USD")).toBe("$0.00");
  });

  it("labels only explicitly marked zero prices as free", () => {
    const zeroPrice = { priceId: "zero", source: "test", region: null, unit: "millionTokens", rates: { textInput: 0 } };
    expect(formatPrice(zeroPrice.rates.textInput, "USD")).toBe("$0.00");
    expect(isExplicitlyFree(zeroPrice)).toBe(false);
    expect(isExplicitlyFree({ ...zeroPrice, free: true })).toBe(true);
  });

  it("keeps provider and model navigation identifiers stable", () => {
    expect(modelHref("moonshotai/kimi-k2.6")).toBe("/models/moonshotai/kimi-k2.6");
    const provider = providerById.get("nano-gpt");
    expect(provider).toBeDefined();
    expect(providerStats(provider!).models.length).toBeGreaterThan(500);
  });

  it("maps model abilities by locale without changing source keys", () => {
    expect(abilityMsg("zh", "toolCall")).toBe("工具调用");
    expect(abilityMsg("en", "structuredOutput")).toBe("Structured output");
    expect(abilityMsg("zh", "futureCapability")).toBe("futureCapability");
    expect(Object.keys(catalog.models.find((model) => model.abilities?.toolCall)?.abilities ?? {})).toContain("toolCall");
  });

  it("localizes cache pricing labels", () => {
    expect(msg("zh", "inputPrice")).toBe("输入");
    expect(msg("zh", "outputPrice")).toBe("输出");
    expect(msg("zh", "cacheReadPrice")).toBe("缓存读");
    expect(msg("zh", "cacheCreationPrice")).toBe("缓存写");
    expect(msg("en", "cacheReadPrice")).toBe("Cache read");
    expect(msg("en", "cacheCreationPrice")).toBe("Cache creation");
  });

  it("reads standardized cache pricing rates", () => {
    const cached = canonicalModels.find((model) => priceRate(model.displayPrices.USD, "textInput_cacheRead") !== null);
    expect(cached).toBeDefined();
    expect(priceRate(cached!.displayPrices.USD, "textInput_cacheRead")).toBeGreaterThanOrEqual(0);
    expect(msg("zh", "supported")).toBe("支持");
    expect(msg("en", "unsupported")).toBe("Unsupported");
  });

  it("merges explicit aliases and selects the verified official quote", () => {
    const model = modelByCanonicalId.get("anthropic/claude-opus-4-8");
    expect(model?.name).toBe("Claude Opus 4.8");
    expect(model?.channels.some((channel) => channel.providerId === "anthropic")).toBe(true);
    expect(model?.channels.some((channel) => channel.providerId === "poe")).toBe(true);
    expect(model?.displayPrices.USD?.providerId).toBe("anthropic");
    expect(model?.displayPrices.USD?.officialStatus).toBe("verified");
    expect(model?.displayPrices.USD?.confidence.score).toBe(100);
    expect(priceRate(model?.displayPrices.USD ?? null, "textInput")).toBe(5);
    expect(priceRate(model?.minPrices.USD ?? null, "textInput")).toBe(4.2929);
  });

  it("derives selected-channel lifecycle states for mixed canonical models", () => {
    const statuses = new Set(canonicalModels.map((model) => model.lifecycle.status));
    const deepSeekR1 = modelByCanonicalId.get("deepseek-ai/deepseek-r1");
    const grok3 = modelByCanonicalId.get("xai/grok-3");

    expect(statuses).toEqual(new Set(["active", "deprecated", "sunset"]));
    expect(canonicalModels.every((model) => ["active", "deprecated", "sunset"].includes(model.lifecycle.status))).toBe(true);
    expect(deepSeekR1?.channels.some((channel) => channel.deprecated)).toBe(true);
    expect(deepSeekR1?.channels.some((channel) => !channel.deprecated && !channel.deprecationDate)).toBe(true);
    expect(deepSeekR1?.lifecycle).toEqual({ status: "active" });
    expect(grok3?.channels.some((channel) => channel.providerId === "xai" && channel.deprecationDate)).toBe(true);
    expect(grok3?.channels.some((channel) => channel.providerId !== "xai" && !channel.deprecationDate)).toBe(true);
    expect(grok3?.lifecycle).toEqual({
      status: "sunset",
      deprecationDate: "2026-05-15",
      source: "litellm",
    });
  });
});
