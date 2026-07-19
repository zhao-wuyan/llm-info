---
verdict: ready
summary: "模型对比页 6 类连续数值柱已使用独立淡色，并完成明暗主题、响应式和无障碍验证。"
constraints:
  - id: color-is-secondary
    text: "颜色仅用于指标分类辅助，数值与 aria-label 必须保留。"
    status: locked
  - id: stable-tone-map
    text: "AAIndex、四类价格和上下文使用稳定的一一对应 tone。"
    status: locked
decisions:
  - id: theme-tokens
    text: "使用显式 OKLCH 明暗主题 token，避免透明色叠加造成不确定对比度。"
    status: accepted
concerns: []
next: []
---
# 模型对比数值柱分类配色

## 结果

- AAIndex、输入价、输出价、缓存读取价、缓存创建价、上下文分别使用淡紫、淡绿、淡粉、淡蓝、淡黄、淡青。
- 暗黑模式使用对应的低饱和深色 token，数值文字继续使用主题正文色。
- 固定柱轨、内联数值、缺价短横线和仅保留视觉理解能力列的行为不变。
- 组件通过 `data-tone` 建立稳定的指标到颜色映射，E2E 同时验证 tone 顺序和计算后的 6 种填充色。

## 验证

- `npx tsc --noEmit`：通过。
- `npm test`：13 个数据测试和 7 个 UI 测试通过。
- `NEXT_DIST_DIR=.next-compare-verify npm run build`：通过。
- 对比页 Playwright：桌面和移动端共 2 个场景通过。
- `/compare` axe：桌面和移动端均无 critical 或 serious 违规。
- 已检查明亮、暗黑、移动端横向末端截图，无文字遮挡或布局回归。

## 规范

- 新增 `S-20260719-a8l4`：模型对比数值柱分类淡色。
