# Lighthouse 性能基线（改动前）

测量时间：2026-08-12 19:14 (UTC+8) · TASK-001（wave W1，任何代码改动之前）

| route | desktop_perf | mobile_perf | ttfb_ms | lcp_ms |
| --- | --- | --- | --- | --- |
| /models | 100 | 95 | 32 | 635 (desktop) / 2846 (mobile) |
| /models/302ai/chatgpt-4o-latest | 100 | 98 | 17 | 516 (desktop) / 2348 (mobile) |
| /compare | 100 | 94 | 46 | 640 (desktop) / 2967 (mobile) |
| /providers | 100 | 98 | 105 | 513 (desktop) / 2357 (mobile) |

注：ttfb_ms 取 desktop 轮 `server-response-time` 审计值；mobile 轮 TTFB 分别为 32/10/31/120 ms。

## 测量环境

- 本地生产模式：`npm run build`（Next.js 16.2.10 Turbopack，exit 0）+ `npm run start -- --port 3100`（http://127.0.0.1:3100）
- Lighthouse 13.4.1（npx），`--only-categories=performance`，`--chrome-flags="--headless=new"`
- desktop 轮：`--preset=desktop`；mobile 轮：不传 preset（Lighthouse 默认移动模拟）
- Chrome 来源：本机安装 `C:\Program Files\Google\Chrome\Application\chrome.exe`（未使用 CHROME_PATH 兜底）
- 详情页样本 URL：`/models/302ai/chatgpt-4o-latest`（/models 列表首行详情链接，页面渲染的 resolved canonicalId，无 redirect 干扰；复测必须复用同一 URL）
- 已知无害告警：lighthouse CLI 退出时清理 Chrome 临时目录报 EPERM（Windows 竞态），审计与 JSON 输出均正常完成，以 JSON score 非 null 为成功判据

## 假设声明

- 验收主线为 desktop 预设（假设 A1 / 开放问题 OQ-2 未与用户对齐，mobile 分数记录作参考）
- 核心页面集合 = /models、/models/[canonicalId]、/compare、/providers（假设 A3）

## 路线判定

4 个核心页面 desktop Performance 全部 100 ≥ 90，无 <90 页面；TTFB 最大值 /providers 120ms（mobile 轮）远低于 600ms 阈值。按决策规则 [1] 判定走保守路线。

route-decision: A-conservative
