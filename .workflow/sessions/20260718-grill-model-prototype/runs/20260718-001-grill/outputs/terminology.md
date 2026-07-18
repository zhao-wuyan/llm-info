# Terminology

| Term | Definition | Code Reference | Status |
|------|------------|----------------|--------|
| 渠道模型 | 一个供应商渠道下的具体模型记录，以 `providerId/modelId` 区分 | `schemas/models.schema.json:84` | locked |
| 规范模型 | 通过 `canonicalId` 聚合后的同一基础模型，也是列表页主要展示对象 | `README.md:19` | locked |
| 供应商 | 提供模型访问和报价的厂商直连或第三方渠道 | `schemas/models.schema.json:$defs.provider` | locked |
| 原始报价 | `pricing[]` 中按来源、币种、单位和区域保留的价格 | `schemas/models.schema.json:$defs.price` | locked |
| 展示价 | `displayPrices.USD/CNY` 中预计算的页面首选价格，也是对比主表的价格口径 | `README.md:17` | locked |
| 多供应商对比 | 从规范模型详情页进入，对同一 `canonicalId` 下供应商按行比较 | `README.md:19` | locked |
| 免费报价 | 有效费率为 0 的报价，显示“免费 + 0.00” | `schemas/models.schema.json:$defs.price` | locked |
| 缺失价格 | 当前币种没有原生展示价，以 `null` 表示并显示 `-` | `README.md:17` | locked |
