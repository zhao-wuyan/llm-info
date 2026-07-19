---
verdict: ready
summary: "系统数据列表已统一固定列宽，并为符合条件的名称和数值列接入三态全量排序。"
constraints:
  - id: fixed-column-geometry
    text: "排序状态变化不得改变表格列宽。"
    status: locked
  - id: sort-before-slice
    text: "有分页或预览截断时必须先排序完整筛选结果集再切片。"
    status: locked
decisions:
  - id: sortable-scope
    text: "仅实体名称和可比较数值列排序，状态、License、来源和操作列保持静态。"
    status: accepted
concerns: []
next: []
---
# 系统数据表固定列宽与三态排序

## 结果

- 所有 `data-table` 使用固定表格布局，各业务表按实体、数值、状态和操作列定义稳定宽度。
- 模型目录、供应商目录、数据来源、模型对比接入 URL 驱动的三态排序。
- 供应商详情模型预览、模型详情供应商预览先排序完整集合，再分别截取前 8 条和前 6 条。
- 供应商模型弹框、多供应商比较弹框接入客户端三态排序，替代单一输入价格方向按钮。
- 通用排序工具统一处理状态循环、稳定排序和缺失值置底。
- 移动端继续使用表格或弹框内部横向滚动，无 document 级溢出。

## 验证

- `npx tsc --noEmit`：通过。
- `npm test`：13 个数据测试、17 个 UI/排序测试通过。
- `NEXT_DIST_DIR=.next-system-sort-verify npm run build`：通过。
- Playwright 完整回归：23 个通过，1 个按项目条件跳过。
- axe 覆盖模型、供应商、来源、对比和供应商比较弹框，无 critical 或 serious 违规。
- E2E 直接比较排序前后表头像素宽度，结果完全一致。
- 已检查桌面模型目录、供应商弹框、模型对比和移动供应商弹框截图。

## 规范

- 新增 `S-20260719-para`：系统数据表固定列宽与三态排序。
