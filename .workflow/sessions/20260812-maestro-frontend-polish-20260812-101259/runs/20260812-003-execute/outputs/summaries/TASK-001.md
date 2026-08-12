# TASK-001 摘要：Lighthouse 基线测量

状态：completed（2026-08-12 19:16 +08:00）

## 做了什么

- `npm run build` exit 0（Next.js 16.2.10 Turbopack，14.2s，8 条路由全部 Dynamic SSR，与 findings F-G3-01 一致）
- `npm run start -- --port 3100` 起本地生产服务（端口按 run 指令用 3100，与 playwright webServer 一致）
- 详情页样本取 /models 列表首行：`/models/302ai/chatgpt-4o-latest`
- 4 URL × desktop/mobile 共 8 轮 `npx lighthouse`（13.4.1，本机 Chrome，--headless=new），JSON 落盘 `.workflow/perf/baseline/`
- 汇总写 `.workflow/perf/lighthouse-baseline.md`，含环境说明、假设声明（desktop 主线 = A1/OQ-2 未对齐）与门禁行
- 测毕停 3100 服务

## 基线结果

| route | desktop | mobile | ttfb(desktop) |
| --- | --- | --- | --- |
| /models | 100 | 95 | 32ms |
| /models/302ai/chatgpt-4o-latest | 100 | 98 | 17ms |
| /compare | 100 | 94 | 46ms |
| /providers | 100 | 98 | 105ms |

**route-decision: A-conservative**（4 页面 desktop 全 100 ≥ 90，TTFB 远低于 600ms 阈值）

## 偏离

- 服务端口 3000 → 3100（run 指令要求，避免 dev server 冲突）
- lighthouse CLI 在 Windows 退出时清理临时目录 EPERM 报 exit 1，属无害竞态；审计完整、JSON 有效，以 score 非 null 为成功判据

## 对后续任务的影响

- TASK-006 commit message 需记录 /providers TTFB 105ms（实测远低于阈值，providerStats 预计算属低成本对症优化而非必需项）
- TASK-007 复测必须复用同一详情页样本 URL 与同一命令参数
