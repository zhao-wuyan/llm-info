---
verdict: ready
summary: "9 项已确认修复均已定位到文件、符号、测试与可观察验收条件，可进入实施计划。"
constraints:
  - id: confirmed-nine-task-scope
    text: "仅实施 T1-T9；不做 broad refactor 或新功能。"
    status: locked
  - id: preserve-user-worktree
    text: "保留 next-env.d.ts、.workflow/state.json 及现有未跟踪 workflow 产物。"
    status: locked
  - id: authoritative-data-semantics
    text: "榜单归一化按数据源类型隔离；生命周期采用 official-first/any-active。"
    status: locked
decisions:
  - id: column-state-precedence
    text: "列状态优先级为显式 URL > 页面专属浏览器存储 > 页面默认值；空集合使用 none sentinel。"
    status: accepted
  - id: compare-server-pagination
    text: "Compare 对完整筛选集预计算并排序，再按 50 行分页。"
    status: accepted
  - id: exact-index-snapshot
    text: "索引校验必须绑定 models.json.generatedAt，匹配修复后重新生成 model-index.json。"
    status: accepted
concerns:
  - "ui-conventions-019 的 checkbox 表现形式被本次 multi-select 要求取代，但其筛选语义继续有效。"
  - "工作区已有 2 个修改文件与 4 个未跟踪路径，实施时不得覆盖。"
next:
  - command: plan
    reason: "分析已覆盖全部 9 项并给出锁定决策、风险、测试与验收边界。"
    needs: [current-analysis, risk-matrix, session-priors]
details:
  scope_verdict: large
  task_count: 9
  overall_confidence: 0.94
  open_questions: 0
---
## 摘要

已完成模型目录 UI 状态、Compare 渲染路径、榜单映射/索引一致性及 canonical lifecycle 的直接集成分析。9 项 Intent 均已覆盖，无待决范围；实现顺序应先完成数据正确性 T7-T9，再完成 UI T1-T6，最后统一验证持久化、分页与生成快照。

## 结论/Verdict

`ready / go_with_conditions`。任务、文件/符号证据、实施建议、受影响测试和可观察验收条件见 {{aref:current-analysis#/findings}}；锁定/自由决策见 {{aref:current-analysis#/decisions}}。风险以 owner 误匹配、陈旧索引和 lifecycle authority 为最高优先级，见 {{aref:risk-matrix#/risks}}。

## 讨论/复盘

本轮以已封存 review 的 E1-E11 为只读问题证据，并用当前源码重新定位集成点。压力测试确认：扩大通用 fuzzy matcher 不能同时解决 effort miss、semantic variant collapse 和 owner fallback；必须改为 board-typed strategy。适用 specs 与 knowhow 已整理到 {{aref:session-priors}}，其中 `ui-conventions-019` 仅控制形态被新要求覆盖，其 URL/current-currency/filter-before-page 语义保持不变。

Intent Coverage：T1 filter multi-select、T2 九列默认、T3 页面专属持久化、T4 四个 reset control、T5 Compare 分页/预计算、T6 banner 移除、T7 typed mapping/owner/official/max-score、T8 snapshot validation/regeneration、T9 official-first/any-active lifecycle，全部 `addressed`，详见 {{aref:current-analysis#/intent_coverage}}。

## 产物

- `outputs/findings.json`：9 项 implementation contract、3 个 subsystem 的各 3 个现有模式、测试、collision boundaries、验收条件与决策。
- `outputs/risk-matrix.json`：8 项风险、4 项假设、pressure test 与条件式 Go 结论。
- `outputs/priors.json`：6 条适用 spec 与 5 条可复用 wiki/knowhow。

## 交接/Next

下一步执行 `plan`，直接消费 `current-analysis`、`risk-matrix` 与 `session-priors`。计划必须保持 T7-T9 → index regeneration → T1-T6 → focused unit/E2E verification 的依赖顺序，并显式保护 {{aref:current-analysis#/collision_boundaries}}。
