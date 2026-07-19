export type Locale = "zh" | "en";

export const messages = {
  zh: {
    models: "模型目录", compare: "模型对比", providers: "供应商", sources: "数据来源",
    searchModels: "搜索模型名称或 Model ID", searchProviders: "搜索供应商名称或 ID", searchSources: "搜索来源名称或角色",
    allAbilities: "全部能力", allCurrencies: "全部币种", allLicenses: "全部 License", allRoles: "全部角色",
    reset: "清除", dataUpdated: "数据已更新", modelCount: "规范模型", channelCount: "渠道记录", pricedModels: "有报价模型", multiProvider: "多供应商模型",
    providerCount: "供应商", officialProviders: "官方供应商", enabledProviders: "已启用", featuredProviders: "精选供应商",
    model: "模型", ability: "能力", context: "上下文", channels: "供应商数", inputPrice: "输入价", outputPrice: "输出价", cacheReadPrice: "缓存读取价", cacheCreationPrice: "缓存创建价", currency: "币种", priceCurrency: "价格体系",
    source: "来源", roleCoverage: "角色 / 覆盖", records: "记录数", license: "License", observedAt: "观测时间", repository: "仓库 / 原始数据",
    details: "详情", back: "返回", compareProviders: "比较供应商", allProviderModels: "查看全部模型", apiDetails: "API 信息", modelAbilities: "模型能力",
    pricingOverview: "价格概览", providerPreview: "供应商预览", traceability: "数据追溯", rawQuotes: "原始报价", missing: "-", free: "免费",
    qualityEvidence: "AAIndex 外部证据", mappedModels: "已映射模型", supported: "支持", unsupported: "不支持", noResults: "没有符合当前条件的数据", loading: "正在加载目录", error: "页面加载失败",
    retry: "重试", home: "首页", language: "切换语言", theme: "切换主题", refresh: "刷新数据", menu: "打开导航", close: "关闭",
    sortBy: "排序", sortAscending: "正序", sortDescending: "倒序", sortNone: "不排序",
    onlyPriced: "只看有报价", region: "地区", priceOrder: "价格排序", priceUnit: "每 1M tokens", exactData: "模型、价格、来源与 Quality 数据保持原文。",
    qualityDescription: "ai-pricing 自动拉取的 AAIndex 外部证据，仅覆盖映射到 models.json 的规范模型。",
    sourceDescription: "自动核对上游角色、记录量、观测时间与 License 状态。",
    providerDescription: "浏览直接厂商与第三方渠道，并下钻查看其模型目录。",
    modelDescription: "按 canonicalId 聚合规范模型，并保留各供应商原生报价。",
    unknown: "未标注", system: "跟随系统", light: "浅色", dark: "深色",
  },
  en: {
    models: "Models", compare: "Model compare", providers: "Providers", sources: "Data sources",
    searchModels: "Search model name or Model ID", searchProviders: "Search provider name or ID", searchSources: "Search source name or role",
    allAbilities: "All abilities", allCurrencies: "All currencies", allLicenses: "All licenses", allRoles: "All roles",
    reset: "Clear", dataUpdated: "Data updated", modelCount: "Canonical models", channelCount: "Channel records", pricedModels: "Priced models", multiProvider: "Multi-provider models",
    providerCount: "Providers", officialProviders: "Official providers", enabledProviders: "Enabled", featuredProviders: "Featured",
    model: "Model", ability: "Abilities", context: "Context", channels: "Providers", inputPrice: "Input", outputPrice: "Output", cacheReadPrice: "Cache read", cacheCreationPrice: "Cache creation", currency: "Currency", priceCurrency: "Price system",
    source: "Source", roleCoverage: "Role / coverage", records: "Records", license: "License", observedAt: "Observed", repository: "Repository / raw data",
    details: "Details", back: "Back", compareProviders: "Compare providers", allProviderModels: "View all models", apiDetails: "API details", modelAbilities: "Model abilities",
    pricingOverview: "Pricing overview", providerPreview: "Provider preview", traceability: "Traceability", rawQuotes: "Raw quotes", missing: "-", free: "Free",
    qualityEvidence: "AAIndex evidence", mappedModels: "Mapped models", supported: "Supported", unsupported: "Unsupported", noResults: "No data matches these filters", loading: "Loading catalog", error: "Page failed to load",
    retry: "Retry", home: "Home", language: "Change language", theme: "Change theme", refresh: "Refresh data", menu: "Open navigation", close: "Close",
    sortBy: "Sort by", sortAscending: "Ascending", sortDescending: "Descending", sortNone: "Unsorted",
    onlyPriced: "Only with price", region: "Region", priceOrder: "Price order", priceUnit: "per 1M tokens", exactData: "Model, price, source, and Quality data remain untranslated.",
    qualityDescription: "AAIndex evidence fetched from ai-pricing, limited to canonical models mapped into models.json.",
    sourceDescription: "Audit upstream roles, record counts, observation times, and license status.",
    providerDescription: "Browse first-party and third-party channels, then inspect their model catalogs.",
    modelDescription: "Canonical models grouped by canonicalId with native provider quotes preserved.",
    unknown: "Unlabeled", system: "System", light: "Light", dark: "Dark",
  },
} as const;

export type MessageKey = keyof typeof messages.zh;
export const msg = (locale: Locale, key: MessageKey) => messages[locale][key];

const abilityMessages: Record<Locale, Record<string, string>> = {
  zh: {
    attachment: "附件",
    imageOutput: "图像输出",
    interleaved: "交错思考",
    reasoning: "推理",
    search: "搜索",
    structuredOutput: "结构化输出",
    temperature: "温度参数",
    toolCall: "工具调用",
    video: "视频理解",
    vision: "视觉理解",
  },
  en: {
    attachment: "Attachment",
    imageOutput: "Image output",
    interleaved: "Interleaved thinking",
    reasoning: "Reasoning",
    search: "Search",
    structuredOutput: "Structured output",
    temperature: "Temperature",
    toolCall: "Tool calling",
    video: "Video",
    vision: "Vision",
  },
};

export const abilityMsg = (locale: Locale, key: string) => abilityMessages[locale][key] ?? key;
