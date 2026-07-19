---
verdict: ready_with_concerns
summary: "模型对比页已默认按 AAIndex 倒序排列，并通过显式 sort=none 保留用户主动取消排序的状态。"
constraints:
  - id: preserve-three-state-sort
    text: "AAIndex 表头必须继续提供不排序、正序、倒序三态循环。"
    status: locked
  - id: explicit-unsorted-state
    text: "用户主动取消排序后，筛选和分页必须保留显式无排序状态。"
    status: locked
decisions:
  - id: default-quality-desc
    text: "URL 未提供排序参数时使用 quality desc；sort=none 表示用户主动取消排序。"
    status: accepted
concerns:
  - "Playwright 功能断言通过，但远端新增的 Vercel Analytics 与 Speed Insights 脚本在本地环境返回 404，导致控制台错误检查失败。"
next: []
---
# 模型对比默认按 AAIndex 倒序

## 结果

- 模型对比页在没有 `sort` 参数时默认使用 `quality desc`，初始结果按 AAIndex 从高到低排列。
- 用户点击 AAIndex 表头取消排序时写入 `sort=none`，筛选表单与链接继续保留该显式状态。
- 现有不排序、正序、倒序三态循环保持不变，重置页面恢复默认 AAIndex 倒序。
- 新增 E2E 断言，覆盖初始 `aria-sort`、AAIndex 数据顺序和取消排序链接。

## 验证

- `npm test`：15 个数据测试、21 个 UI 单测通过。
- `NEXT_DIST_DIR=.next-aaindex-sort-verify npm run build`：通过。
- Playwright 桌面与移动端均确认 AAIndex 初始为倒序，数据顺序为 `60, 59, 57, 56...`，取消排序链接包含 `sort=none`。
- Playwright 最终退出失败仅来自本地环境中的 `/_vercel/insights/script.js` 和 `/_vercel/speed-insights/script.js` 404；对应功能断言与截图检查均已通过。

## 规范

- 新增 `S-20260719-fpun`：模型对比默认 AAIndex 倒序。
