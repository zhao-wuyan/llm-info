# llm-info 数据管线

该目录先实现模型与价格数据层，页面暂不在本阶段范围内。数据来自：

- LiteLLM：USD 基准模型与价格；
- aidy-models：CNY 主数据及模型元数据；
- model-price-hub：中国区渠道、区域和价格的补充验证数据。

运行环境为 Node.js 20 或更高版本，无第三方运行时依赖：

```bash
npm run generate
npm test
npm run validate
```

生成产物为 `data/models.json`。核心结构是渠道模型 `models[]`，每个模型保留全部原始货币报价 `pricing[]`，并预计算 `displayPrices.USD` 与 `displayPrices.CNY`。系统不做汇率换算；缺少原生价格时对应值为 `null`，页面应显示 `-`。

同一模型经厂商直连、阿里云百炼、硅基流动、PPIO 或 OpenRouter 等渠道销售时，会保留为不同的 `providerId/modelId`，避免混淆不同区域和渠道价格。`canonicalId` 用于后续页面聚合同一模型，`sourceRefs` 和每条报价的 `sourceUrl`/`observedAt` 用于追溯。

完整机器可读约束见 `schemas/models.schema.json`。`model-price-hub` 当前仓库未声明 license，生成数据的 `sources[].license` 因此标记为 `NOASSERTION`，上线使用前需要单独确认授权边界。
