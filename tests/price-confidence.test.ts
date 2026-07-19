import { describe, expect, it } from "vitest";
import { officialEvidence, selectCanonicalDisplayPrice } from "@/lib/price-confidence";
import type { Model, Provider } from "@/lib/types";

function provider(id: string, official = false, details: Partial<Provider> = {}): Provider {
  return { id, name: id, official, sourceRefs: [], ...details };
}

function channel(providerId: string, input: number, output: number, options: {
  ownerId?: string;
  modelId?: string;
  name?: string;
  source?: string;
  officialQuote?: boolean;
} = {}): Model {
  const ownerId = options.ownerId ?? "acme";
  const priceId = `${providerId}:USD`;
  const source = options.source ?? "aidy-models";
  return {
    id: `${providerId}/${options.modelId ?? `${ownerId}/model-1`}`,
    providerId,
    ownerId,
    modelId: options.modelId ?? `${ownerId}/model-1`,
    canonicalId: `${ownerId}/model-1`,
    name: options.name ?? "Model 1",
    abilities: {},
    sourceRefs: [],
    pricing: [{
      id: priceId,
      priceId,
      source,
      currency: "USD",
      region: null,
      unit: "millionTokens",
      rates: { textInput: input, textOutput: output },
      observedAt: "2026-07-19T00:00:00Z",
      official: options.officialQuote,
    }],
    displayPrices: {
      USD: { priceId, source, region: null, unit: "millionTokens", rates: { textInput: input, textOutput: output } },
      CNY: null,
    },
  };
}

describe("canonical display price confidence", () => {
  it("always prefers a verified official quote over a cheaper channel", () => {
    const channels = [channel("acme", 5, 25), channel("discount", 4, 20)];
    const providers = new Map([
      ["acme", provider("acme", true)],
      ["discount", provider("discount")],
    ]);
    const selected = selectCanonicalDisplayPrice(channels, providers, "USD", "2026-07-19T00:00:00Z");
    expect(selected?.providerId).toBe("acme");
    expect(selected?.confidence.score).toBe(100);
    expect(selected?.officialStatus).toBe("verified");
  });

  it("prefers a repeated multi-provider price over a singleton outlier", () => {
    const channels = [
      channel("one", 5, 25),
      channel("two", 5, 25),
      channel("three", 5, 25, { source: "litellm" }),
      channel("discount", 4, 20),
    ];
    const providers = new Map(channels.map((model) => [model.providerId, provider(model.providerId)]));
    const selected = selectCanonicalDisplayPrice(channels, providers, "USD", "2026-07-19T00:00:00Z");
    expect(selected?.rates).toMatchObject({ textInput: 5, textOutput: 25 });
    expect(selected?.confidence.reason).toBe("provider-consensus");
    expect(selected?.confidence.supportingProviderCount).toBe(3);
  });

  it("caps owner-like model ids when the serving provider identity differs", () => {
    const reseller = channel("poe", 4, 20, {
      ownerId: "anthropic",
      modelId: "anthropic/claude-opus-4.8",
      name: "Anthropic Claude Opus 4.8",
    });
    const direct = channel("anthropic", 5, 25, {
      ownerId: "anthropic",
      modelId: "claude-opus-4-8",
      name: "Claude Opus 4.8",
    });
    const resellerEvidence = officialEvidence(reseller, provider("poe", false, { website: "https://poe.com" }));
    const directEvidence = officialEvidence(direct, provider("anthropic", false, {
      name: "Anthropic",
      website: "https://anthropic.com",
      baseUrl: "https://api.anthropic.com",
    }));
    expect(resellerEvidence.officialStatus).toBe("none");
    expect(resellerEvidence.officialLikelihood).toBeLessThanOrEqual(40);
    expect(directEvidence.officialStatus).toBe("inferred");
    expect(directEvidence.officialLikelihood).toBeGreaterThanOrEqual(80);
  });
});
