---
verdict: ready
summary: "完成供应商列表页与数据来源页，并按第二行从模型列表页下方向右排布。"
decisions:
  - id: D-001
    status: accepted
    text: 供应商列表必须以供应商为行维度，而不是以模型为行维度。
  - id: D-002
    status: accepted
    text: 新增页面从模型列表页正下方开始，向右排列。
  - id: D-003
    status: accepted
    text: 供应商列表页使用供应商、API / 身份、模型数、币种、USD 覆盖、CNY 覆盖六列。
  - id: D-004
    status: accepted
    text: 左侧菜单中的供应商与数据来源均对应独立页面。
concerns: []
next:
  - command: maestro-impeccable craft
    reason: 如进入实现阶段，可按 Pencil 节点结构映射为前端路由与表格组件。
    needs:
      - design/原型设计.pen
---
## 摘要

在现有模型列表、模型详情和多供应商对比弹框基础上，补充供应商列表页与数据来源页。第二行以模型列表页左边界为起点，供应商列表页在左，数据来源页在右。

## 结论/Verdict

ready。Pencil 文档仅保留 5 个有效顶层画面，全画布 `snapshot_layout` 检查结果为 `No layout problems.`。

## 讨论/复盘

- 供应商页节点：`iRZKa`，坐标 `(0, 1144)`。
- 数据来源页节点：`JwbRv`，坐标 `(1560, 1144)`。
- 供应商表格按供应商聚合展示，示例行包括 NanoGPT、OpenRouter、Vercel AI Gateway、Azure OpenAI、OpenAI、Aliyun Bailian。
- 数据来源页展示 LiteLLM、aidy-models、model-price-hub 的来源角色与数据概况。
- 已删除早期无效调试画面 `gvgWg`。

## 产物

- `design/原型设计.pen`
- `outputs/prototype/iRZKa.png`
- `outputs/prototype/JwbRv.png`

## 交接/Next

原型可直接用于评审。实现时，侧边导航的“模型列表”“供应商”“数据来源”应分别绑定独立页面路由；模型详情与多供应商对比继续作为模型列表主流程中的下钻与弹框交互。
