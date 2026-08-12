---
verdict: ready
summary: 计划就绪——7 任务 × 5 wave 的 DAG 覆盖 G1/G2/G3 三目标：Lighthouse 基线先行（W1）→ token 层 + 纯函数收敛并行（W2）→ 组件抽取 + 动效层并行（W3）→ 保守性能优化（W4）→ 全套件回归 + 复测门禁（W5）；checker 自查 2 轮收敛无 critical，置信度 86%。
constraints:
  - { id: C1, text: "CSS 类名不可改名，只改规则内部与新增 token 引用（e2e 选择器锁定 accessibility.spec.ts:29,47）", status: locked }
  - { id: C2, text: "动效纯 CSS transition/animation、150-300ms、受既有 prefers-reduced-motion kill switch 覆盖，不引入动画库", status: locked }
  - { id: C3, text: "现有测试套件（node --test / vitest / playwright e2e）全程保持通过；中文文案与 URL 参数语义不可变", status: locked }
  - { id: C4, text: "核心 4 页面生产构建 Lighthouse Performance ≥ 90 为验收线；TASK-001 基线先行，TASK-007 复测出 verdict 门禁行", status: locked }
  - { id: C5, text: "out of scope：scripts/ 数据管道、data/ 语义、新功能、路由变更、品牌重设计、CI/CD；静态化路线 B 本轮不实施", status: locked }
  - { id: C6, text: "Lighthouse 验收预设与测量环境未与用户对齐（OQ-2）：计划采用假设 A1（本地 next start、desktop 主线 + mobile 参考）", status: open }
  - { id: C7, text: "error/not-found i18n 与 next/font 品牌字体两项按 findings deferred 排除出本轮范围", status: deferred }
decisions:
  - { id: D1, text: "wave 结构 = 基线单列 W1 先行，全部改码任务依赖 TASK-001（保证'改动前基线'产物不失真）", status: accepted }
  - { id: D2, text: "同文件跨任务写入（globals.css: 002→005→006；详情页与 dialog: 003→004）以 deps 边强制串行，同 wave 内 files[] 零交集", status: accepted }
  - { id: D3, text: "性能条件路线决策规则固化为可 grep 门禁行：基线 route-decision（A-conservative / A-conservative-watch / B-static-candidate）+ 复测 verdict（pass / below-target + escalate-to-static-route-B），post-execute 据此判断是否开静态化新 plan", status: accepted }
  - { id: D4, text: "providerStats 预计算解除 findings 的条件性 deferred、纳入 TASK-006 主线（session 规划指令明示 + 等价重构成本低于判断成本 + 执行时基线已知可回溯记录）", status: accepted }
  - { id: D5, text: "排序整页往返的 loading 指示（OQ-3）与两套分页 UI 合并不做：前者需 SortableHeader 转 client 组件（影响面大于收益），后者语义不同（URL 分页 vs client 状态分页）强行统一得不偿失", status: accepted }
  - { id: D6, text: "dialog 进出场用 @starting-style + allow-discrete（Chrome 117+/Safari 17.5+ 渐进增强，不支持浏览器 = 现状瞬开，零回归）", status: accepted }
concerns:
  - "降级 W001（延续 analyze 先例）：本环境无法 spawn 独立 planner/plan-checker 子代理——由执行器先以 planner 角色产出全部任务 JSON，再切 checker 视角按手册 Step 4 的 9 维度自查（outputs/plan-check.json，2 轮收敛：round 1 发现 1 处 minor 遗漏已修订，无 critical）；缺少独立第二模型审视，残余偏差风险由 convergence 判据的机械可验证性缓解"
  - "W003 相关：session-priors 已含 4 条 arch specs（直接复用未重跑 maestro spec load，遵手册 priors 规则）；wiki/doc-index 在 priors 中为空，未额外检索"
  - "Auto (-y) 模式：Step 2 Clarification 跳过、Step 5 Confirmation 自动通过（用户显式授权）；OQ-2（desktop/mobile 验收预设）以假设 A1 处理并写入 TASK-001 报告要求，属残余风险"
  - "design-ref/MASTER.md 不存在且未运行 maestro-impeccable：本任务为既有 UI 优化，findings 已锁定改造路线（保留类名 + 增 token 层），不涉及新视觉方向设计，跑 impeccable 构链无输入价值——决策理由记录于此"
  - "估时余量风险（plan-check CHK-W3）：TASK-002 全量字号/圆角替换与 TASK-006 逐表死代码甄别偏紧，可能超 55 分钟预估 10-15 分钟"
  - "环境前置（plan-check CHK-W2）：npx lighthouse 首次运行需网络取包；无系统 Chrome 时用 Playwright chromium 兜底（TASK-001 action 已给精确命令）"
next:
  - { command: execute, reason: plan ready, needs: [current-plan] }
---

## Summary

本 run 消费 `20260812-001-analyze` 的 findings（{{aref:current-analysis#/findings}}）与 session-priors（4 条 arch specs），把已确认的分析结论分解为 **7 任务 × 5 wave** 的可执行 DAG，覆盖三个 goal 与全部 locked 决策：

- **G3 先行**：TASK-001 在任何代码改动前对 4 核心页面（/models、/models/[canonicalId]、/compare、/providers）做生产构建 Lighthouse 基线测量（desktop+mobile 双预设），并按固化决策规则写出 `route-decision` 门禁行——这是 findings（F-G3-01：8/8 路由动态 SSR 是最大变量）与 risk R3（验收僵局）共同要求的首任务。
- **G1 两步走**：先地基（TASK-002 token 层：间距/圆角/字号/阴影/backdrop/z-index/动效 7 组 tokens 按现值一一映射替换，视觉零变化；TASK-003 纯函数收敛：one()/priceMetric/createSortLinks 三模块，URL 生成逐字节不变），后收敛（TASK-004 组件抽取：DetailHeader/DetailMetrics/ModalShell/行导航统一，DOM 类名逐字保留）。
- **G2 纯增量**：TASK-005 消费 --motion-* tokens 给既有交互面补 150/220ms 微交互（hover/focus 过渡、dialog/details 进场、topbar pending 反馈），既有 reduced-motion kill switch 自动覆盖。
- **G3 保守路线落地**：TASK-006（providerStats 模块级预计算 + 动态列表格 nth-child 死代码逐表甄别清理）；TASK-007 全套件回归 + Lighthouse 复测对比基线，产出 `verdict: pass|below-target` 门禁行。

### 计划摘要表

| 任务 | 标题 | Wave | 依赖 | 预估 | 写目标 |
|------|------|------|------|------|--------|
| TASK-001 | Lighthouse 基线测量（4 页面 × 2 预设 + route-decision） | W1 | — | 40min | .workflow/perf/baseline/ |
| TASK-002 | G1 token 层补全（7 组 tokens，值保真替换） | W2 | 001 | 55min | app/globals.css |
| TASK-003 | G1 纯函数/常量收敛（search-params/price-metrics/sort-links） | W2 | 001 | 45min | lib/ ×3 新建 + 6 页面 + 3 组件 |
| TASK-004 | G1 组件抽取（DetailHeader/DetailMetrics/ModalShell/行导航） | W3 | 003 | 55min | components/ ×2 新建 + 2 详情页 + 2 dialog |
| TASK-005 | G2 克制动效层（过渡/进场/pending 反馈） | W3 | 002 | 40min | app/globals.css + components/topbar.tsx |
| TASK-006 | G3 保守性能（providerStats 预计算 + CSS 死代码清理） | W4 | 001, 005 | 55min | lib/catalog.ts + app/globals.css |
| TASK-007 | 回归验证 + Lighthouse 复测门禁 | W5 | 002-006 | 45min | .workflow/perf/after/ |

合计约 5.5 小时。W2 与 W3 内部可并行（files[] 零交集，见 {{aref:current-plan}} 同目录 collision-report.json 的 internal_wave_check）。

## Conclusion/Verdict

**verdict: ready**。7 任务全部具备 Deep Work 四要素（read_first / grep 可验证 convergence / 含逐字值的 action / 分步 implementation），依赖图无环，每个 wave 均有 [UI-observable] 判据，checker 自查 2 轮收敛（1 minor 已修订、0 critical）。

### 置信度评分（5 维模型，总分 86%）

| 维度 | 得分 | 依据 |
|------|------|------|
| requirements_coverage | 0.92 | G1/G2/G3 + 3 条 locked 决策全部映射到任务；deferred 三项处置与 findings 一致并在 plan.json 声明 |
| task_quality | 0.88 | 四要素齐备；token 值/函数签名/CSS 规则/删除清单均逐字给出；minor：model-cells.tsx 未实读留了'以实读为准'弹性 |
| dependency_correctness | 0.95 | 7 节点 11 边拓扑验证无环；每边附真实依赖理由（数据依赖/产物依赖/同文件串行） |
| estimation_accuracy | 0.78 | TASK-002/006 有 10-15 分钟超时余量风险（替换面大、逐表甄别）|
| collision_safety | 0.95 | standalone 无跨 plan 碰撞源；同 wave files[] 零交集已逐对验证 |

加权因子：completeness .30×0.90 + specificity .25×0.88 + structural_validity .20×0.95 + user_validation .15×0.60（Auto 无用户轮次）+ consistency .10×0.92 = **0.86**。最弱项：estimation_accuracy 与 user_validation 因子（OQ-2 验收预设假设未对齐）。

## Discussion/Retrospective

**Planner→Checker 降级执行**：手册要求独立 planner agent 与 plan-checker agent，本环境不可 spawn 子代理（W001 先例），降级为同执行器双角色分阶段执行：planner 阶段基于 findings 的 file:line 锚点 + 本轮对 13 个关键源文件的实读核对（确认 one() 6 处、priceMetric 4+1 处变体、排序链接 6 处状态机一致仅 compare 有 sort=none 清除分支、两 dialog 骨架重复、死代码 specificity 陷阱）产出全部 JSON；checker 阶段按 9 维度自查。Round 1 发现 TASK-003 遗漏 compare 页 metricByColumn 同值变体（requirements_coverage warning）→ 修订 description/implementation/convergence 三处 → Round 2 通过。全程记录于 outputs/plan-check.json。

**Pressure Pass（对最高复杂度任务 TASK-004）**：四路施压——read_first 充分性（组件惯例源 + 4 被改文件行号锚点 + 行导航目标实现 + 2 条 e2e 锁定面，执行器不出 task JSON 即可复现模式）；浅实现防御（`<DetailHeader` 两页面各命中、`modal-layout` 全 components/ 仅 1 处、内联 `role="link"` 清零三条判据交叉拦截半途实现）；隐藏假设排查（ModalShell 的 close 经 render-prop 暴露、useId 替换硬编码 id 不影响 getByRole 定位、分页 footer 独立于 shell）；边界核查（arch spec 对比弹框入口/范围铁律已内联 description）。结论 pass，无修订。完整记录见 plan-check.json#pressure_pass。

**Devil's Advocate 三问**（记录于 plan-check.json）：两套分页 UI 不合并（语义不同）、动效 CSS 增量不反噬 G3（~2KB ≪ 死代码删除量，复测兜底）、providerStats 解除 deferred 的正当性（session 指令 + 成本低于判断成本 + 基线可回溯）。

**条件路线的决策规则设计**：性能路线 A/B 分岔不靠主观判断，固化为两个可 grep 的门禁行——TASK-001 的 `route-decision:`（三值：A-conservative / A-conservative-watch / B-static-candidate，判定条件含精确阈值 server-response-time > 600ms）与 TASK-007 的 `verdict:`（pass / below-target + `next-step: escalate-to-static-route-B`）。post-execute 门禁只需 Select-String 两行即可决策，静态化路线 B 本轮明确不实施。

## Artifacts

| 产物 | 路径（run_dir 相对） | 说明 |
|------|---------------------|------|
| plan.json | outputs/plan.json | primary（current-plan）；objective/requirement_refs/task_ids×7/wave_ids×5/confidence 86/constraints/acceptance_criteria + deferred_exclusions + decision_rules |
| TASK-001..007.json | outputs/tasks/ | 7 个任务定义，各含 Deep Work 四要素 + [UI-observable] 判据 + estimate_minutes |
| waves.json | outputs/waves.json | 5 wave 分组与并行/串行理由 |
| dependency-graph.json | outputs/dependency-graph.json | 7 节点 11 边 + 无环验证记录 |
| collision-report.json | outputs/collision-report.json | status: skipped-standalone + 替代性同 wave files[] 交集检查（clean） |
| plan-check.json | outputs/plan-check.json | checker 自查 2 轮记录 + Pressure Pass + Devil's Advocate + 置信度分解 |

任务与 wave 的唯一事实源为上述 JSON（本报告摘要表仅为索引，以 {{aref:current-plan#/task_ids}} 为准）。

## Handoff/Next

**→ execute（needs: current-plan）**。执行提示：

1. **严格按 wave 顺序**：W1 基线必须最先完成且期间不得改码；W2/W3 内部可并行；globals.css 的三次写入（002→005→006）与详情页/dialog 的两次写入（003→004）已由 deps 串行化，不得乱序。
2. **每任务收口跑 verify 命令清单**；TASK-002/003/004/006 各自单独 commit（TASK-006 拆 perf 与 style 两个 commit），便于回滚与归因。
3. **门禁行消费**：TASK-001 的 route-decision 与 TASK-007 的 verdict 是 post-execute 判断是否升级静态化路线 B（开新 plan）的唯一输入；below-target 时不得在本轮擅自实施路线 B。
4. **残余风险自查点**：TASK-006 删除死代码前先跑一轮 e2e 截图基线（implementation 步骤 3）；TASK-005 动效落地后关注 catalog.spec 的 console error 零容忍断言。
5. **OQ-2 未决**：若用户后续指定 mobile 为验收主线或指定部署环境测量，TASK-001/007 的报告结构无需变（双预设数据都在），仅门禁判定列切换。
