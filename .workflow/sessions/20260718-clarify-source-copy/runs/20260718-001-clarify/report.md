---
verdict: ready
summary: "同步修正 07 数据来源页与 08 模型对比页的数据源、Quality 和 License 文案。"
constraints: []
decisions:
  - id: D-001
    status: accepted
    text: 数据来源页以当前 models.json 的四源统计和自动 License 校验结果为准。
  - id: D-002
    status: accepted
    text: Quality 统一描述为 ai-pricing 自动拉取的 AAIndex 外部证据，并使用“映射”术语。
caveats: []
open_questions: []
next: []
---
## 摘要

修正原型中落后于数据管线实现的数据来源文案，新增 ai-pricing 来源行，并同步 License、记录数和 Quality 映射状态。

## 结论/Verdict

Ready。`07` 与 `08` 均通过截图检查，完整画布返回 `No layout problems`。

## 讨论/复盘

旧原型仍将 LiteLLM 与 model-price-hub 标记为“待确认”，且只展示 3 个数据源。当前生成数据已通过 GitHub License API 和授权文本识别得到实际结果，因此原型改为 3 个 MIT、1 个未标注，并明确 AAIndex 的自动拉取与证据边界。

## 产物

- `outputs/prototype/JwbRv.png`：更新后的数据来源页。
- `outputs/prototype/brVYS.png`：更新后的模型对比页。
- `outputs/copy-changes.md`：文案变更清单。

## 交接/Next

前端实现时直接读取 `sources[].licenseLabel`、`sources[].recordCount` 与 `models[].quality`，避免静态写死来源数量和授权状态。
