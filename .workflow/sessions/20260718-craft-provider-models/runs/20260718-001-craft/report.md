---
verdict: ready
summary: "将 06 重构为可检索的供应商全模型列表弹框，并修正 03/06 的整页居中。"
decisions:
  - id: D-001
    status: accepted
    text: 06 展示当前供应商的全部模型，支持名称或 Model ID 搜索、能力筛选、上下文筛选、价格排序和分页。
  - id: D-002
    status: accepted
    text: 03 的供应商行进入 05 供应商详情页，06 的模型行进入 02 模型详情页。
  - id: D-003
    status: accepted
    text: 03 与 06 弹框均相对完整 1440 页面居中，不受 224 宽左侧边栏影响。
concerns: []
next:
  - command: maestro-impeccable craft
    reason: 实现供应商行、模型行的详情路由以及 06 的检索筛选状态。
    needs:
      - design/原型设计.pen
      - .workflow/specs/ui-conventions.md
---
## 摘要

将 `06` 从供应商摘要弹框改为与 `03` 同类的宽表格弹框，展示 NanoGPT 的 617 个模型，并修正两个弹框因侧边栏产生的右偏。

## 结论/Verdict

ready。`03` 与 `06` 均为 `1100 × 852`，在 `1440 × 1024` 页面中的位置为 `(170, 86)`；单页与全画布检查均返回 `No layout problems.`。

## 讨论/复盘

- `06 供应商模型列表弹框`：节点 `U91MZZ`。
- 弹框提供搜索、能力筛选、上下文筛选、价格排序、结果计数和分页。
- 表格展示真实 NanoGPT 模型、Model ID、上下文、能力、USD 输入/输出价和 aidy-models 来源。
- 每个模型行行尾使用 `chevron-right`，表示点击后进入 `02 模型详情页`。
- `03 多供应商对比弹框` 的供应商行点击后进入 `05 供应商详情页`。
- 点击导航规则已记录为 UI spec：`S-20260718-8h74`。
- 整页弹框居中规则已记录为 UI spec：`S-20260718-t9mp`。

## 产物

- `design/原型设计.pen`
- `outputs/prototype/EbK1U.png`
- `outputs/prototype/U91MZZ.png`
- `.workflow/specs/ui-conventions.md`

## 交接/Next

前端实现时，供应商行使用 `providerId` 进入供应商详情；模型行使用 `canonicalId` 进入模型详情。搜索和筛选控件必须阻止行点击事件冒泡。
