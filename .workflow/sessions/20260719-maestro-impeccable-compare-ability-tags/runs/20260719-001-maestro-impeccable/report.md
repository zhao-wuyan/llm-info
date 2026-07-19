---
verdict: ready
summary: "模型对比页已按数据类型修正视觉编码：连续数值保留柱状图，布尔能力恢复支持/不支持标签。"
constraints:
  - id: semantic-encoding
    text: "柱状图只用于连续数值，不得用于布尔能力并暗示数量关系。"
    status: locked
decisions:
  - id: ability-tags
    text: "工具调用、视觉理解、推理使用支持/不支持状态标签。"
    status: accepted
concerns: []
next: []
---
## 摘要

移除模型对比页 3 个布尔能力列中的柱状图，恢复为紧凑状态标签；AAIndex、4 类价格和上下文共 6 个连续数值维度继续使用柱状图。

## 结论/Verdict

ready。类型检查、测试、production build 和桌面/移动端 E2E 均通过。

## 讨论/复盘

旧规范错误地要求布尔能力使用柱状图，已由 `S-20260719-0mau` 替代并标记 deprecated，防止后续重复误用。

## 产物

- `app/compare/page.tsx`：能力柱改为支持/不支持标签。
- `app/globals.css`：移除二元柱样式，增加能力标签布局。
- `tests/e2e/catalog.spec.ts`：每行 6 个数值柱 + 3 个能力标签断言。
- `evidence/screenshots/*-compare-bars-end.png`：桌面与移动端末端列截图。

## 交接/Next

无需后续操作。
