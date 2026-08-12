# TASK-004 摘要：G1 共享组件抽取（DetailHeader/DetailMetrics/ModalShell + TableRowLink 统一）

状态：completed（2026-08-12 19:43 +08:00）

## 做了什么

- 新建 `components/detail.tsx`（服务端组件）：DetailHeader（detail-header/identity/identity-mark/detail-actions 骨架，tags/actions 槽位）+ DetailMetrics（四格指标条），类名逐字保留
- 新建 `components/modal-shell.tsx`（client）：触发按钮 + dialog[modal] + modal-layout/modal-header + backdrop 点击关闭 + useId 的 aria-labelledby + 关闭按钮，children 以 render-prop 暴露 close
- `app/models/[...canonicalId]/page.tsx` 与 `app/providers/[id]/page.tsx`：detail-header/detail-metrics 段替换为 <DetailHeader/>/<DetailMetrics/>，三种条件 tag 与 actions 原样以 ReactNode 传入（顺序与条件渲染逐字保留）
- `comparison-dialog.tsx`/`provider-models-dialog.tsx`：外层换 ModalShell，删除各自 dialog ref/showModal/close 样板；tbody 行导航从内联 `<tr role="link">`（无防误触）换成 TableRowLink（Enter+Space+closest 防误触，行为超集）；provider-models 的按钮式分页 footer 原样保留在 children 内
- arch spec 边界保持：比较弹框入口仍在详情页 detail-actions、比较范围仍仅当前 canonicalId 渠道

## 验证

- 6 条静态判据全过（modal-layout 骨架仅存 1 处、内联 role=link 清零、类名抽样保留）
- `npx tsc --noEmit` exit 0；`npm run test:ui` 55 pass
- `npx playwright test` exit 0（87 passed；"比较供应商"/"查看全部模型" dialog 打开/排序/交互/关闭流程 + 全路由 axe 通过）

## 偏离

- ModalShell 给 provider-models-dialog 补上了 backdrop 点击关闭与 aria-labelledby（原缺失）、comparison-dialog 的固定 id 变为 useId——任务 action 设计内的纯增强；已 grep 确认 e2e 无对固定 id 的硬编码。
