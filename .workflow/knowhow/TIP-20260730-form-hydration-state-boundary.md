---
title: GET 表单已应用状态与 hydration 边界
description: 分离 picker 草稿与已应用 GET 状态，并将 ThemeProvider 收窄到真实消费者，避免 RSC hydration 竞态。
type: tip
category: review
explicitId: tip-20260730-form-hydration-state-boundary
created: 2026-07-30T08:40:27.832Z
keywords:
  - form
  - columns
  - hydration
  - rsc
  - theme-provider
specCategory: arch
---

# 表单状态与 hydration 边界

- GET toolbar 内的 picker 草稿控件不要携带提交 name；否则外部 select 自动提交会泄漏未 Apply 草稿。
- 用已应用状态生成 hidden 字段；仅在序列化值非空时渲染。默认列序列化为空时省略字段，空选择使用 none sentinel。
- ThemeProvider 等 client context 只包裹实际消费者。全页 client wrapper 会扩大 hydration 区域，使 native details 在 RSC 导航后的快速交互出现 open 属性竞态。
- E2E 在 URL 更新后还要等待新 RSC DOM 唯一且可见，再执行键盘交互。
