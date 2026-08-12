# TASK-005 摘要：G2 克制动效层

状态：completed（2026-08-12 19:43 +08:00）

## 做了什么

- `app/globals.css` 在 prefers-reduced-motion kill switch 之前插入 /* motion (G2) */ 分区（纯追加，未改任何既有声明）：
  - 14 个交互控件选择器 + 表格行 + skip-link 的 hover/focus 过渡（--motion-fast 150ms）
  - dialog（.modal 与 .mobile-drawer）进出场：@starting-style + transition-behavior allow-discrete（--motion-base 220ms，Chrome 117+/Safari 17.5+ 渐进增强，老浏览器瞬开瞬关 = 现状）
  - details 弹层（help-menu/column-picker/model-filter-picker 面板）panel-in 进场动画（150ms）
  - .icon-button:disabled pending 视觉（cursor wait + opacity .65）
- `components/topbar.tsx`：changeLocale 与刷新按钮改走既有 useTransition 实例的 startTransition(() => router.refresh())，两按钮加 disabled={isPending}（对齐货币切换既有模式；主题按钮为本地即时切换不加）
- 克制裁量（记录，未做）：排序链接 RSC 往返 loading 指示（OQ-3 影响面大于收益，留后续轮次）；全局主题切换颜色过渡（重绘/首帧闪烁风险）

## 验证

- 静态判据全过：--motion-fast/base 引用 7/7、@starting-style×2、panel-in×1、icon-button:disabled×1、startTransition×3、disabled={isPending}×3、kill switch 完好
- [UI-observable] 生产渲染 computed style：`.icon-button` transitionDuration = 0.15s（exit 0）；reducedMotion 模拟下 = 1e-05s（kill switch 实证）
- `npm run build` exit 0；`npx playwright test` exit 0（87 passed；axe 无新增违规、dialog 流程与 console error 零容忍在动效下稳定）

## 偏离

- computed style 验证 URL 用 127.0.0.1:3100（判据原文 localhost:3000），与本 run 统一端口策略一致。
