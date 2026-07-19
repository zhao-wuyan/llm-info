---
verdict: ready
summary: "模型目录新增按当前币种生效的只看有报价筛选，并完整保留排序与分页状态。"
constraints:
  - id: native-current-currency
    text: "筛选只依据当前币种原生 displayPrices，不做汇率转换或跨币种回退。"
    status: locked
decisions:
  - id: priced-url-state
    text: "使用 priced=1 URL 参数持久化筛选，筛选先于排序和分页执行。"
    status: accepted
caveats: []
open_questions: []
next: []
---
## 摘要

模型目录工具栏新增“只看有报价”复选框。筛选跟随 Topbar 的 USD/CNY 当前币种，搜索、排序和分页均保留该状态，取消筛选后恢复缺价模型。

## 结论/Verdict

`done`。生产构建、完整单元/UI 测试和桌面/移动 E2E 均通过。

## 讨论/复盘

复用供应商比较弹框既有的 `displayPrices[currency] !== null` 判定、`check-control` 样式和 `AutoSubmitForm` 自动提交模式，未引入新的价格语义或组件。

## 产物

- `app/models/page.tsx`：筛选逻辑、URL 状态和复选框。
- `tests/e2e/catalog.spec.ts`：币种、筛选、排序、分页、响应式与溢出回归测试。
- `.workflow/specs/ui-conventions.md`：项目级 UI 约束 `S-20260719-ae0l`。

## 交接/Next

无需后续动作。
