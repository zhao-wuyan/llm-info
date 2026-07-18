# llm-info 数据管线

该目录先实现模型与价格数据层，页面暂不在本阶段范围内。数据来自：

- LiteLLM：USD 基准模型与价格；
- aidy-models：CNY 主数据及模型元数据；
- model-price-hub：中国区渠道、区域和价格的补充验证数据；
- ai-pricing：Artificial Analysis Intelligence Index（`AAIndex`）Quality 快照。

运行环境为 Node.js 20 或更高版本，无第三方运行时依赖：

```bash
npm run generate
npm test
npm run validate
```

生成产物为 `data/models.json`。核心结构是渠道模型 `models[]`，每个模型保留全部原始货币报价 `pricing[]`，并预计算 `displayPrices.USD` 与 `displayPrices.CNY`。系统不做汇率换算；缺少原生价格时对应值为 `null`，页面应显示 `-`。

同一模型经厂商直连、阿里云百炼、硅基流动、PPIO 或 OpenRouter 等渠道销售时，会保留为不同的 `providerId/modelId`，避免混淆不同区域和渠道价格。`canonicalId` 用于后续页面聚合同一模型，`sourceRefs` 和每条报价的 `sourceUrl`/`observedAt` 用于追溯。

`providers[]` 承载供应商和渠道资料，包括描述、官网、文档、API 协议与连接信息；`models[]` 承载模型自身的描述、能力、上下文、发布日期和价格。模型级字段不会被提升为整个供应商的默认配置。

Quality 由自动化脚本从 `nuxdie/ai-pricing` 的 `src/data/llm-data.json` 拉取。适配器只读取 `AAIndex`、上游模型名和开发者，并通过显式别名映射到本地 `canonicalId`；上游价格、上下文和能力不会覆盖现有模型字段。匹配后的渠道模型包含 `quality.aaIndex`、数据文件 commit、观测时间与来源模型名，默认对比集合可按 `canonicalId` 去重后筛选 `quality != null`。

完整机器可读约束见 `schemas/models.schema.json`。生成脚本会通过 GitHub License API 校验每个数据源仓库：`sources[].license` 保存 SPDX 类型，`licenseFile` 表示是否存在授权文件，`licenseUrl` 提供证据链接；无授权文件时写入 `license: "NOASSERTION"` 和 `licenseLabel: "未标注"`。API 限流或服务错误不会被误判为未标注，而会中止本次生成。
