---
verdict: ready
summary: "所有包含能力数据的列表均已将能力列调整为最后一个有标题的数据列，并完成桌面端与移动端验证。"
constraints:
  - id: action-column-after-ability
    text: "无标题操作列继续保留在能力列之后。"
    status: locked
  - id: responsive-table-overflow
    text: "移动端保持模型首列固定，其余列通过局部横向滚动查看。"
    status: locked
decisions:
  - id: ability-last-data-column
    text: "模型目录与供应商模型弹框移动能力列；模型对比的视觉理解原本已是末列，仅补充回归断言。"
    status: accepted
caveats: []
open_questions: []
next: []
---
## 摘要

模型目录的能力列移动到四类价格之后，供应商模型弹框的能力列移动到四类价格之后；两处操作箭头仍位于最末。同步更新桌面端和小于 900px 的稳定列宽规则。

## 结论/Verdict

Done。桌面端、移动端的列顺序、排序、局部横向滚动和页面级无溢出均通过验证。

## 讨论/复盘

- `app/models/page.tsx`：列顺序调整为模型、上下文、供应商数、四类价格、能力、操作。
- `components/provider-models-dialog.tsx`：列顺序调整为模型、上下文、四类价格、能力、操作。
- `app/compare/page.tsx`：视觉理解已是最后一列，无需实现改动。
- `app/globals.css`：重新映射两张表在桌面端与移动端的列宽。
- `tests/e2e/catalog.spec.ts`：增加末列顺序断言与横向滚动末端截图。

## 产物

- TypeScript：`npx tsc --noEmit` 通过。
- 单元测试：13 个数据测试和 17 个 UI 测试通过。
- 生产构建：`NEXT_DIST_DIR=.next-ability-last-verify npm run build` 通过。
- Playwright：完整回归 13 passed、1 skipped；相关用例复跑 4 passed。
- 截图：`evidence/screenshots/*-model-global-sort-end.png`、`evidence/screenshots/*-provider-dialog-end.png`。
- UI spec：`S-20260719-ep0i`（列表能力列统一置后）。

## 交接/Next

实现未单独提交，保留在用户当前未提交的响应式表头改动之上。
