# TASK-002 摘要：G1 token 层补全（globals.css）

状态：completed（2026-08-12 19:30 +08:00）

## 做了什么

- 在 `app/globals.css` 的 `:root` 中 `--font-mono` 之后追加 6 组 token（带分组注释，值与现状硬编码一一对应）：spacing×11、radius×5、font-size×10、shadow-popover + backdrop-drawer/modal、z-index×7、motion×3（--motion-* 本任务只定义不使用，留给 TASK-005）
- 值保持替换：border-radius 27 处（`0`/`50%`/`inherit` 保留）、font-size 属性 35 处 + font 简写 18 处（line-height 数值不动）、box-shadow 2 处、backdrop 2 处（两个不一致颜色分别对应两个 token，未统一）、z-index 13 处（1/2/3/20/30/60/100 七级全量）、间距仅 13 处清单内结构容器（clamp()/负 margin/11px 表格微调值全部保留）
- dark 主题零新增覆盖；CSS 类名零改动
- 实施方式：一次性 Node 替换脚本（run_dir/work/task-002-tokens.cjs）带内置计数断言，任何一处计数不符即整体不写盘

## 验证

- 6 条静态判据全过（token 定义存在、5 类硬编码残留全部为 0）
- `npm run build` exit 0
- `npx playwright test` exit 0（87 passed 1 skipped；无横向滚动断言 + axe 扫描 = 视觉等价证明）

## 偏离

无。
