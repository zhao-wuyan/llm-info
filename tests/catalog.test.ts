import { describe, expect, it } from "vitest";
import { canonicalModels, catalog, modelByCanonicalId, providerById, providerStats } from "@/lib/catalog";
import { formatPrice, isExplicitlyFree, priceRate } from "@/lib/format";
import { abilityMsg, msg } from "@/lib/i18n";
import { modelHref } from "@/lib/links";
import { resolveCanonicalModelId } from "@/lib/model-aliases";

describe("catalog view model", () => {
  it("groups channel records by canonicalId without mutating source data", () => {
    expect(canonicalModels.length).toBe(new Set(catalog.models.map((model) => resolveCanonicalModelId(model.canonicalId))).size);
    expect(catalog.models.length).toBe(10_007);
    expect(modelByCanonicalId.get("moonshotai/kimi-k2.6")?.channels.length).toBe(26);
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
});
