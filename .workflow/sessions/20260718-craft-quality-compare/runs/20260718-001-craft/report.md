---
verdict: ready
summary: "完成横向柱状模型对比原型，并将 ai-pricing AAIndex 与数据源 license 校验接入自动化管线。"
constraints: []
decisions:
  - id: D-001
    status: accepted
    text: 使用显式别名映射 22 个 ai-pricing 模型到本地 canonicalId，Quality 不覆盖本地模型字段。
  - id: D-002
    status: accepted
    text: 所有数值参数使用从左到右的水平条，并保留精确值。
  - id: D-003
    status: accepted
    text: license 使用 GitHub License API 与常见授权文本回退识别，无文件显示未标注。
caveats: []
open_questions: []
next:
  - command: maestro-impeccable craft
    reason: 前端实现时按 canonicalId 聚合 180 条 listing 为 22 个默认对比模型。
    needs:
      - design/原型设计.pen
      - data/models.json
---
## 摘要

新增 `08 模型对比页`，Quality、输入价、输出价、上下文、最大输出和供应商数均采用水平微型柱状图。完成 ai-pricing Quality adapter、证据映射、自动生成、license 校验、schema、测试和 README 更新。

## 结论/Verdict

Ready。原型与数据管线均通过验证，Quality 22/22 匹配，license 结果可追溯。

## 讨论/复盘

`AAIndex` 在 ai-pricing 中直接存储，并由上游人工同步；本项目不把它提升为本地模型事实，而是保留来源、revision 和观测时间。GitHub SPDX 对 LiteLLM 顶层复合说明返回 `NOASSERTION`，因此增加授权文本识别，得到适用于当前非 enterprise 数据文件的 MIT 结果。

## 产物

- `outputs/prototype/brVYS.png`：模型对比页 2x PNG。
- `outputs/quality-source-analysis.md`：Quality 来源、映射、license 与验证报告。
- `design/原型设计.pen`：包含 8 个完整页面/弹框。

## 交接/Next

实现前端时使用 `models[].quality.aaIndex`，默认集合筛选 `quality != null` 后按 `canonicalId` 去重。能力和价格仍读取本地模型字段及 `displayPrices`。
