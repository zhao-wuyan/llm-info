---
verdict: ready
summary: "模型列表已支持名称和 6 类数值表头的正序、倒序、不排序三态全量排序。"
constraints:
  - id: global-before-pagination
    text: "排序必须作用于筛选后的完整结果集，并先于分页切片。"
    status: locked
  - id: missing-last
    text: "数值缺失项在正序和倒序中始终置底。"
    status: locked
decisions:
  - id: url-sort-state
    text: "使用 sort/order URL 参数保存排序，表头链接负责三态循环并重置页码。"
    status: accepted
concerns: []
next: []
---
# 模型列表表头全量三态排序

## 结果

- 模型名称、上下文、供应商数、输入价、输出价、缓存读取价、缓存创建价均可点击表头排序。
- 每列按正序、倒序、不排序循环；切换到其他列时从该列正序开始。
- 排序在筛选后的完整模型数组上执行，随后才计算分页和截取当前页。
- 数值缺失项在两个方向均置底；价格排序使用当前 USD/CNY 原生价格体系。
- 排序状态通过 URL 保存，筛选和分页保留有效状态，点击表头时自动回到第 1 页。
- 表头使用方向图标、`aria-sort` 和中英文操作标签；原工具栏排序下拉已移除。

## 验证

- `npx tsc --noEmit`：通过。
- `npm test`：13 个数据测试、15 个 UI/排序测试通过。
- `NEXT_DIST_DIR=.next-sort-verify npm run build`：通过。
- Playwright：桌面和移动端三态循环及跨分页全量排序通过。
- `/models` axe：桌面和移动端均无 critical 或 serious 违规。
- 已检查桌面和移动端截图，无表头文字溢出或页面级横向溢出。

## 规范

- 新增 `S-20260719-e5d9`：模型列表表头全量三态排序。
