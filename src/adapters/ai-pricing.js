import { resolveCanonicalId } from "../ids.js";

export const QUALITY_MODEL_ALIASES = {
  "GPT 5.6 Sol": "openai/gpt-5.6-sol",
  "GPT 5.6 Terra": "openai/gpt-5.6-terra",
  "GPT 5.6 Luna": "openai/gpt-5.6-luna",
  "GPT 5.4 mini": "openai/gpt-5.4-mini",
  "GPT OSS 120B": "openai/gpt-oss-120b",
  "Claude Fable 5": "anthropic/claude-fable-5",
  "Claude Opus 4.8": "anthropic/claude-opus-4.8",
  "Claude Sonnet 5": "anthropic/claude-sonnet-5",
  "Gemini 3.5 Flash": "google/gemini-3.5-flash",
  "Gemini 3.1 Pro": "google/gemini-3.1-pro",
  "Gemma 4 31B": "google/gemma-4-31b",
  "Grok 4.5": "xai/grok-4.5",
  "Muse Spark": "meta/muse-spark-1.1",
  "Nemotron 3 Ultra": "nvidia/nemotron-3-ultra-550b-a55b",
  "Mistral Medium 3.5": "mistral/mistral-medium-3.5",
  "Kimi K3": "moonshotai/kimi-k3",
  "GLM 5.2": "zai-org/glm-5.2",
  "Qwen 3.7 Max": "qwen/qwen3.7-max",
  "MiniMax M3": "minimax/minimax-m3",
  "DeepSeek V4 Pro": "deepseek/deepseek-v4-pro",
  "DeepSeek V4 Flash": "deepseek/deepseek-v4-flash",
  "MiMo V2.5 Pro": "xiaomi/mimo-v2.5-pro",
};

export function adaptAiPricing(data, { observedAt, revision }) {
  if (!Array.isArray(data)) throw new Error("ai-pricing: expected an array of model records");
  if (!revision) throw new Error("ai-pricing: repository revision is required");

  const qualities = [];
  const unmappedModels = [];

  for (const record of data) {
    if (typeof record?.AAIndex !== "number" || !Number.isFinite(record.AAIndex) || record.AAIndex < 0) continue;
    const mappedCanonicalId = QUALITY_MODEL_ALIASES[record.model];
    if (!mappedCanonicalId) {
      unmappedModels.push(record.model);
      continue;
    }
    const canonicalId = resolveCanonicalId(mappedCanonicalId);
    qualities.push({
      canonicalId,
      source: "ai-pricing",
      sourceModel: record.model,
      sourceDeveloper: record.developer,
      aaIndex: record.AAIndex,
      observedAt,
      revision,
    });
  }

  return {
    providers: [],
    models: [],
    qualities,
    meta: {
      recordCount: qualities.length,
      observedAt,
      revision,
      unmappedCount: unmappedModels.length,
      unmappedModels,
    },
  };
}
