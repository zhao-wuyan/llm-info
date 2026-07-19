---
verdict: ready
summary: "固定列宽表格中的长名称、ID、表头和标签已使用省略号，并保留实体完整文本提示。"
constraints:
  - id: visible-truncation
    text: "单行内容被截断时必须显示省略号，不得无提示裁切。"
    status: locked
  - id: full-entity-text
    text: "实体名称和 ID 的完整值必须保留在 title 与 DOM 中。"
    status: locked
decisions:
  - id: shared-entity-text
    text: "使用共享 EntityText 统一名称和 ID 的省略号，并省略与名称相同的冗余 ID。"
    status: accepted
concerns: []
next: []
---
# 固定列宽表格截断省略号

## 结果

- 新增共享 `EntityText`，覆盖模型、供应商、来源、详情预览和弹框实体单元格。
- 实体名称与 ID 使用单行省略号，完整文本保存在各自 `title` 属性中。
- 名称与 ID 完全相同时不重复渲染次级 ID。
- 固定宽度的原始表头、可排序表头文字和长标签均显示省略号。
- 说明文本、价格和可正常换行内容保持原有行为。

## 验证

- `npx tsc --noEmit`：通过。
- `npm test`：13 个数据测试、17 个 UI/排序测试通过。
- `NEXT_DIST_DIR=.next-ellipsis-verify npm run build`：通过。
- E2E 使用真实超长模型名验证 `scrollWidth > clientWidth`、`text-overflow: ellipsis` 和完整 `title`。
- 最终完整 Playwright 回归：23 个通过，1 个按项目条件跳过。
- axe 覆盖模型、供应商、来源、对比和供应商比较弹框，无 critical 或 serious 违规。
- 已检查桌面和移动端截图，省略号清晰且行高稳定。

## 规范

- 新增 `S-20260719-pywk`：固定列宽表格截断省略号。
