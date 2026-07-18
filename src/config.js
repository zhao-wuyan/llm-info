export const SCHEMA_VERSION = 1;

export const SOURCE_CONFIG = {
  litellm: {
    id: "litellm",
    name: "LiteLLM",
    role: "usd-baseline",
    url: "https://raw.githubusercontent.com/BerriAI/litellm/litellm_internal_staging/model_prices_and_context_window.json",
    repository: "https://github.com/BerriAI/litellm",
    license: "NOASSERTION",
  },
  aidy: {
    id: "aidy-models",
    name: "aidy-models",
    role: "cny-primary",
    url: "https://raw.githubusercontent.com/ImSingee/aidy-models/master/models.json",
    repository: "https://github.com/ImSingee/aidy-models",
    license: "MIT",
  },
  priceHub: {
    id: "model-price-hub",
    name: "model-price-hub",
    role: "channel-validation",
    url: "https://raw.githubusercontent.com/Microllin/model-price-hub/main/data/latest.json",
    repository: "https://github.com/Microllin/model-price-hub",
    license: "NOASSERTION",
  },
  aiPricing: {
    id: "ai-pricing",
    name: "ai-pricing",
    role: "quality-evidence",
    url: "https://raw.githubusercontent.com/nuxdie/ai-pricing/main/src/data/llm-data.json",
    revisionUrl: "https://api.github.com/repos/nuxdie/ai-pricing/commits?path=src/data/llm-data.json&per_page=1",
    repository: "https://github.com/nuxdie/ai-pricing",
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
