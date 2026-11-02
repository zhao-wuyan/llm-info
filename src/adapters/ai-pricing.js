import { resolveCanonicalId } from "../ids.js";

export const QUALITY_MODEL_ALIASES = {
  "GPT 6 Astra": "openai/gpt-6-astra",
  "GPT 6.1 Sol": "openai/gpt-6.1-sol",
  "GPT 6 Luna": "openai/gpt-6-luna",
  "Claude Opus 5.5": "anthropic/claude-opus-5-5",
  "Claude Sonnet 5.5": "anthropic/claude-sonnet-5-5",
  "Claude Haiku 5.5": "anthropic/claude-haiku-5-5",
  "Claude Fable 5.1": "anthropic/claude-fable-5-1",
  "Gemini 4 Argon": "google/gemini-4-argon",
  "Gemini 3.8 Flash": "google/gemini-3.8-flash",
  "Grok 4.7": "xai/grok-4.7",
  "Muse Wonder": "meta/muse-wonder",
  "Muse Spark 1.3": "meta/muse-spark-1.3",
  "Muse Glimmer": "meta/muse-glimmer-30b",
  "Nemotron 3.5 Super VL": "nvidia/nemotron-3.5-super-vl",
  "Mistral Large 4 Preview": "mistral/mistral-large-4",
  "Kimi K3.1 Pro": "moonshotai/kimi-k3.1-pro",
  "GLM 5.3": "zai-org/glm-5.3",
  "Qwen 3.8 Max 0902": "qwen/qwen3.8-max-0902",
  "Qwen 3.8 27B": "qwen/qwen3.8-27b",
  "MiniMax M3.1 Flash": "minimax/minimax-m3.1-flash",
  "DeepSeek V4.1 Flash 1017": "deepseek/deepseek-v4.1-flash-1017",
  "Step 5 Preview": "stepfun/step-5-preview",
  "MiMo V2.6 Pro": "xiaomi/mimo-v2.6-pro",
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
