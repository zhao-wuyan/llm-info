---
title: 模型列表价格体系与四价格列
status: done
run_id: 20260719-001-maestro-impeccable
session_id: 20260719-maestro-impeccable-currency-mode
command: maestro-impeccable
summary: >-
  将模型列表改为由 Topbar USD/CNY 持久化偏好驱动的单币种价格体系，
  并展示输入、输出、缓存读取、缓存创建四个价格维度，完成桌面与移动端验证。
decisions:
  - id: D-001
    status: accepted
    text: 模型列表不再并列比较 USD/CNY，价格列、排序和指标统一使用 llm-currency 当前值。
  - id: D-002
    status: accepted
    text: 供应商比较弹框保留自身币种控件，因为它属于显式比较工作流。
concerns: []
verdict: ready
---

# 交付摘要

- Topbar 新增 USD/CNY segmented control，使用 `llm-currency` cookie 持久化。
- 模型列表移除 USD/CNY 并列输入价和币种筛选，统一按当前价格体系展示输入、输出、缓存读取、缓存创建 4 个价格维度。
- 价格排序使用当前币种；缺少当前币种报价的模型保留并置底。
- 表头、指标和排序选项明确显示当前币种；缓存创建术语已纳入中英文 i18n。
- 移动端隐藏冗余 breadcrumb，Topbar 控件不重叠；价格表在局部容器横向滚动并固定模型列。

# 验证

- `npm test`: 19 项通过。
- 本地 `tsc --noEmit`: 通过。
- `npm run build`: Next.js production build 通过，8 个路由生成成功。
- `npm run test:e2e`: 21 项通过，1 项按 desktop 条件跳过。
- Playwright 覆盖 Desktop Chrome 与 Pixel 7：币种切换、cookie 持久化、语言、主题、移动导航、局部横向滚动和全局 overflow。
- axe-core：模型、供应商、数据来源、Quality 对比与模型比较弹框在桌面/移动端均无 serious/critical 违规。
- 浏览器 console/page errors：0。

# 视觉检查

- 桌面：四价格列完整可扫读，CNY 控件与现有 Topbar 控件保持一致。
- Pixel 7：Topbar 无重叠；模型列固定，价格列通过局部横向滚动访问；页面无全局横向溢出。
- 截图：`evidence/screenshots/desktop-currency-system.png`、`evidence/screenshots/mobile-currency-system.png`。

# 边界

- 供应商比较弹框保留自身币种 segmented control，因为它是显式比较工作流。
- `models.json` 原始价格字段与币种保持不变；本功能只改变展示体系和偏好状态。
