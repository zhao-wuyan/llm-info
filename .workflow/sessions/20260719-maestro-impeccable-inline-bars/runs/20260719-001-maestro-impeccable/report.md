---
verdict: ready
summary: "模型对比数值柱已改为固定轨道内联数值，并将能力结果精简为仅展示视觉理解。"
constraints:
  - id: fixed-track
    text: "数值字符长度不得参与柱宽计算。"
    status: locked
  - id: vision-only
    text: "能力结果只展示视觉理解是否支持。"
    status: locked
decisions:
  - id: overlay-value
    text: "填充层与数值层均绝对定位在固定宽度轨道内。"
    status: accepted
concerns: []
next: []
---
## 摘要

参考用户截图，将 AAIndex、价格和上下文的柱状单元格改为固定轨道，数值覆盖在轨道右侧；移除工具调用和推理结果列，仅保留视觉理解状态标签。

## 结论/Verdict

ready。类型检查、测试、production build、桌面/移动端、暗黑模式与 axe 验证均通过。

## 讨论/复盘

旧布局将数值作为独立 grid 列，长数字会缩短可用柱轨。新布局使轨道占满单元格，数值不再改变柱长。规范 `S-20260719-v434` 已替代上一版对比页视觉规则。

## 产物

- `app/compare/page.tsx`：数值覆盖层结构，移除工具调用和推理列。
- `app/globals.css`：固定轨道、绝对定位填充与数值标签。
- `tests/e2e/catalog.spec.ts`：内联布局、列精简、暗黑模式和响应式断言。
- `evidence/screenshots/*-compare-bars*.png`：桌面、移动端与暗黑模式证据。

## 交接/Next

无需后续操作。
