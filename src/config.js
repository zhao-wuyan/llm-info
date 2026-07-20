export const SCHEMA_VERSION = 1;

export const SOURCE_CONFIG = {
  litellm: {
    id: "litellm",
    name: "LiteLLM",
    role: "usd-baseline",
    url: "https://raw.githubusercontent.com/BerriAI/litellm/litellm_internal_staging/model_prices_and_context_window.json",
    repository: "https://github.com/BerriAI/litellm",
    github: {
      repository: "BerriAI/litellm",
      ref: "litellm_internal_staging",
      path: "model_prices_and_context_window.json",
    },
    license: "NOASSERTION",
  },
  aidy: {
    id: "aidy-models",
    name: "aidy-models",
    role: "cny-primary",
    url: "https://raw.githubusercontent.com/ImSingee/aidy-models/master/models.json",
    repository: "https://github.com/ImSingee/aidy-models",
    github: { repository: "ImSingee/aidy-models", ref: "master", path: "models.json" },
    license: "MIT",
  },
  priceHub: {
    id: "model-price-hub",
    name: "model-price-hub",
    role: "channel-validation",
    url: "https://raw.githubusercontent.com/Microllin/model-price-hub/main/data/latest.json",
    repository: "https://github.com/Microllin/model-price-hub",
    github: { repository: "Microllin/model-price-hub", ref: "main", path: "data/latest.json" },
    license: "NOASSERTION",
  },
  aiPricing: {
    id: "ai-pricing",
    name: "ai-pricing",
    role: "quality-evidence",
    url: "https://raw.githubusercontent.com/nuxdie/ai-pricing/main/src/data/llm-data.json",
    repository: "https://github.com/nuxdie/ai-pricing",
    github: { repository: "nuxdie/ai-pricing", ref: "main", path: "src/data/llm-data.json" },
    license: "MIT",
  },
};

export const HUB_PROVIDER_ALIASES = {
  aliyun: "alibaba-cn",
  baidu: "wenxin",
  bytedance: "volcengine",
  moonshot: "moonshotai-cn",
  tencent: "hunyuan",
  zhipu: "zhipuai",
};

export const HUB_CHANNEL_ALIASES = {
  bedrock: "amazon-bedrock",
  vertex: "google-vertex",
  siliconflow: "siliconflow-cn",
};
