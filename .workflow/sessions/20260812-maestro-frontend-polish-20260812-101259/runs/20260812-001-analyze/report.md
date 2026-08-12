---
verdict: ready
summary: 前端三目标（样式统一/克制动效/加载性能）分析完成——tokens 与组件化有既有基础、动效为零可纯增量补齐、全站 8 路由均为动态 SSR 是性能最大变量；scope=medium，推荐 go，下游 plan 首任务应建 Lighthouse 基线。
constraints:
  - { id: C1, text: "动效克制：150-300ms、纯 CSS transition/animation、尊重 prefers-reduced-motion（globals.css:77 kill switch 已在位）", status: locked }
  - { id: C2, text: "不引入重型动画库（framer-motion 等）", status: locked }
  - { id: C3, text: "现有测试套件（node --test、vitest、playwright e2e）保持通过；e2e 硬锁定 CSS 类名/中文文案/URL 参数语义", status: locked }
  - { id: C4, text: "不破坏 URL 与 SEO 元数据；核心页面 Lighthouse Performance ≥ 90（生产构建）", status: locked }
  - { id: C5, text: "out of scope：scripts/ 数据管道、data/ 语义、新功能、路由结构、品牌视觉重设计、CI/CD", status: locked }
  - { id: C6, text: "Lighthouse 验收预设（desktop/mobile）与测量环境未与用户对齐（OQ-2）", status: open }
decisions:
  - { id: D1, text: "优化范围 = 全部 11 个页面（用户锁定，class=locked）", status: accepted }
  - { id: D2, text: "性能验收 = 生产构建核心页面 Lighthouse Performance ≥ 90（用户锁定，class=locked）", status: accepted }
  - { id: D3, text: "动效风格 = 克制（微交互、150-300ms、悬停反馈、prefers-reduced-motion）（用户锁定，class=locked）", status: accepted }
  - { id: D4, text: "CSS 类名保持不变，以'改规则+增 token'方式统一（e2e 类名耦合证据驱动，class=free 推荐）", status: proposed }
  - { id: D5, text: "性能主路线先保守（SSR 微优化），视 Lighthouse 基线决定是否升级静态化改造（class=free 推荐）", status: proposed }
  - { id: D6, text: "error/not-found i18n 补齐、next/font 品牌字体启用、providerStats 预计算 三项延迟（class=deferred，未写外部 issue store）", status: proposed }
concerns:
  - "W001 降级：本环境无 cli-explore-agent 与外部 CLI delegate，交叉验证由执行器自身 3 轮 Glob/Grep/Read 深度探索替代；事实类结论均有 file:line 或构建实测证据，推断类结论（冷启动耗时量级、Lighthouse 变量权重）confidence 已降至 ≤0.85 并需 plan 阶段实测复核"
  - "npm run build 成功（exit 0，17.6s，Next 16.2.10 Turbopack）；但 Next 16 构建输出不再打印路由级 First Load JS 明细，以 .next/static 实测（JS 总 982KB/19 chunks、CSS 33.5KB 单文件）替代"
  - "Lighthouse 基线未实测：8/8 路由动态 SSR 下能否达 90 取决于部署环境 TTFB，存在'优化后差几分'的验收僵局风险（risk-matrix R3），plan 首任务必须先建基线"
  - "readiness gate 以 Auto 模式自动覆盖：无用户交互轮次，residual risk = 验收预设（desktop/mobile）与测量环境未与用户对齐（open_questions OQ-1/OQ-2）"
  - "Deferred 决策共 3 条仅记录于 findings.json，未写 .workflow/issues/issues.jsonl（Auto 模式无用户确认，遵守手册 6.5 约束）"
next:
  - { command: plan, reason: analysis ready, needs: [current-analysis] }
---

## Summary

本 run 对 llm-info（Next.js 16 App Router + React 19，纯 CSS 无 Tailwind）完成 macro 分析，topic 为前端样式统一/动效/加载性能，覆盖 app/ 全部 11 个页面、components/ 13 个组件、globals.css（188 行/37.9KB）与生产构建实测。核心结论：

1. **G1 样式统一**：设计 tokens 呈"半成品"状态——颜色（双主题含 oklch bar 色板，globals.css:1-28）与字体 family 完整，但间距/圆角/字号/阴影/z-index/动效 tokens 全缺，硬编码值散布（圆角 5 种、字号 10 档）。重复模式清单明确：`one()` searchParams helper 重复 6 处、`priceMetric` 映射 5 处、排序链接构造 6 处、`.column-picker` 与 `.model-filter-picker` CSS 近乎复制块（globals.css:159-183）、两个 modal 骨架高度雷同、行导航 3 种实现。globals.css 存在演进死代码层：nth-child 固定列宽规则（:61,83-139）对已转 `table-layout:auto` 动态列模式（:140-149）的两张主表已失效。已有 `components/ui.tsx` 8 个共享组件的组件化惯例可延续。

2. **G2 动效**：全代码库 `transition` 属性 **0 处**、动画仅 skeleton pulse 1 处（globals.css:77）——所有 hover/details 展开/dialog 弹出均为瞬间跳变。`prefers-reduced-motion` 全局 kill switch 已在位且同时覆盖 transition 与 animation，新增 CSS 动效自动合规。交互反馈不对称：货币切换有 `useTransition` pending 态（topbar.tsx:15,27-29），语言/主题/刷新与表格排序整页往返均无反馈。G2 是纯增量工作，无需动画库。

3. **G3 加载性能**：生产构建实测 **8/8 路由全部动态 SSR**（cookies 读 locale/currency + searchParams 驱动列表页，lib/server-i18n.ts:5-13），零静态页面。11.4MB models.json 由服务端静态 import（lib/catalog.ts:1），不进客户端 bundle（已验证无客户端组件引用），但 serverless 冷启动需解析它且 `providerStats` 每请求全量扫描（catalog.ts:75-84）。客户端资产健康：JS 总 982KB（未压缩）、CSS 单文件 33.5KB、无重依赖、未用网络字体（零字体阻塞）。Lighthouse 达标的主要变量是 SSR TTFB，而非 bundle。

## Conclusion/Verdict

**推荐 go，scope_verdict = medium**（单一前端子系统，11 页面 + 13 组件 + globals.css；三 goal 可并行/弱串行，无 3+ 独立子系统或硬串行屏障），下游走 **plan**。

### 六维评分

| 维度 | 得分 | 置信度 | 证据引用 |
|------|------|--------|----------|
| Feasibility | 4.5/5 | 90% | token 地基已有（globals.css:1-28 双主题颜色体系）；组件化惯例在位（ui.tsx:10-78 共 8 组件）；构建健康（build 17.6s exit 0）；动效纯增量（transition 0 处 → 只加不改） |
| Impact | 4/5 | 85% | 消除 6+5+6 处三类代码重复（findings F-G1-03）；CSS 死代码清理直接瘦身全站单文件 33.5KB CSS（F-G1-02/F-G3-03）；动效从 0 到微交互层的体感跃升（F-G2-01/03） |
| Risk | 3/5 | 85% | e2e 硬锁定类名/文案/URL（accessibility.spec.ts:29,47；catalog.spec.ts:29）→ 类名不可改；静态化路线触碰 cookie 语义（server-i18n.ts:5-13 + e2e locale 测试）→ 默认保守路线；Lighthouse 基线未实测（R3） |
| Complexity | 3/5 | 85% | 11 页面 × 13 组件统一遍历工作量中等；死代码甄别需逐表判断（nth-child 规则对 model-price/compare 表已死、对 provider-model/source 表仍活，globals.css:75-76,97,140-149）；modal 骨架统一需回归两条 e2e 流程 |
| Dependencies | 2/5（低依赖，好） | 90% | 零新依赖需求（package.json:22-29 已含所需全部）；hyparquet 仅数据管道（src/fetch.js）；唯一软依赖是 Lighthouse 测量工具链（plan 阶段引入 CLI 即可） |
| Alternatives | 已评 | 85% | 动效：CSS transition（选，成本最低+自动合规）vs framer-motion（违反锁定约束 3）vs View Transitions API（跨页动效，可作增强 spike）；性能：A 保守 SSR 微优化（推荐先行）vs B 静态化+个性化下沉（基线不达标再升级）vs C Next16 cacheComponents/PPR（需 spike）；样式：现有 CSS+token 强化（选，e2e 零风险）vs 引入 Tailwind（改写全部类名，违反测试通过约束的风险不可接受）vs CSS Modules（拆分收益低于风险） |

**总体置信度：88%**（Auto 模式收敛值，各维度加权：findings_depth .30 × 高、evidence_strength .25 × 高、coverage_breadth .20 × 全覆盖、user_validation .15 × 无交互扣分、consistency .10 × 无矛盾）。

### Intent Coverage Matrix

| # | 原始意图 | 状态 | 覆盖位置 | 备注 |
|---|----------|------|----------|------|
| 1 | 统一样式与组件（G1） | ✅ Addressed | F-G1-01~04；decisions free #4/#5/#6 | token 缺口清单 + 重复模式清单 + 抽取建议齐备 |
| 2 | 添加克制动效（G2） | ✅ Addressed | F-G2-01~03；locked 决策 3 | 现状为零 + kill switch 在位 + 高价值落点（pending 反馈）identified |
| 3 | 优化加载速度 Lighthouse ≥ 90（G3） | ✅ Addressed（带 residual risk） | F-G3-01~04；R3/R4；OQ-1/OQ-2 | 瓶颈画像完整；基线未实测为 residual risk，转 plan 首任务 |
| 4 | 全部 11 页面范围（锁定 1） | ✅ Addressed | 11 页面全部读取并纳入 findings | 含 error/loading/not-found 状态页 |
| 5 | 测试保持通过约束 | ✅ Addressed | F-BOUNDARY-01；R1/R2 | e2e 锁定面已摸清并转化为'保留类名'推荐决策 |

无未处理 ❌ 项。

## Discussion/Retrospective

Auto (-y) 模式执行，无用户交互轮次；深度探索 3 轮（≤3 上限），置信度演进如下：

**Round 1（广度扫描）→ ~55%**：定位全部源文件（11 页面/13 组件/13 lib 模块）、specs 4 条命中、glossary 不存在；关键线索浮出——data/models.json 11.4MB、"use client" 仅 9 文件、prefers-reduced-motion 已有全局处理、无 tailwind 纯 CSS。

**Round 2（链路追踪）→ ~75%**：追踪 models.json 加载链（静态 import → lib/catalog.ts 模块级聚合 → 仅服务端消费，客户端零引用）；通读 globals.css 全文确认 token 缺口、复制块与死代码层；通读全部页面与组件确认三类重复模式与动效空白；确认 cookies() 传染性（AppShell 全站包裹 → 全站动态渲染推断）。

**Round 3（构建实测与边界验证）→ ~88%**：npm run build 实证 8/8 路由 ƒ Dynamic（推断转事实）；实测 .next/static JS 982KB/CSS 33.5KB；e2e 测试通读确认类名/文案/URL 锁定面。

**Pressure Pass（对最高置信度结论"全站动态渲染是 Lighthouse 主要风险"施压）**：
- *证据要求*：build 输出 8/8 ƒ Dynamic ✅（terminals/592080.txt:28-39）；cookies() 调用点 ✅（server-i18n.ts:6,11）。
- *假设探查*：动态渲染 ≠ 必然不达标——数据在进程内存（无 DB 往返），渲染本身快；若部署低延迟且暖启动，90 分可能已达或接近。
- *边界/权衡*：静态化收益最大但被 cookie 个性化阻碍，激进改造的 e2e 回归面（locale/currency 语义）大于收益确定性。
- *根因检查*：全站动态的根因是"locale/currency 存 cookie 且在 RSC 顶层读取"——这是双语双币产品的设计选择而非缺陷。
- **压后修正**：结论从"动态渲染是主要瓶颈"降级为"动态渲染是主要*不确定性来源/风险放大器*（叠加 serverless 冷启动 11.4MB JSON parse 时恶化）"；行动含义从"必须静态化"修正为"先测基线，保守优化优先，静态化作为备选升级"。该修正直接塑造了 decisions 中的性能路线推荐。

**Devil's Advocate（挑战"G2 纯增量零风险"）**：若给 `.sortable-header`/`.icon-button` 等加 transition 后 e2e 的 boundingBox/可见性断言因过渡中间态而 flaky？→ 检查发现 e2e 断言均在 networkidle 后执行且 axe 扫描不受 CSS transition 影响；Playwright 默认 auto-wait 会等待元素稳定。风险确认为低，但保留在 R6。

**Readiness Gate（Auto 覆盖记录）**：无用户确认轮次即收敛，residual risks = ①验收预设与测量环境未对齐（OQ-1/OQ-2）②推断类结论未经第二模型交叉验证（W001/R7）。接受置信度 88% 收敛。

## Artifacts

| 产物 | 路径（run_dir 相对） | 说明 |
|------|---------------------|------|
| findings.json | outputs/findings.json | primary；mode=macro，11 条 findings（全部含 file:line 证据）、10 条 decisions（3 locked / 4 free / 3 deferred）、scope_verdict=medium、recommendation=go |
| risk-matrix.json | outputs/risk-matrix.json | evidence；7 risks（概率×影响×缓解）、4 assumptions、3 open questions |
| priors.json | outputs/priors.json | evidence；4 条 arch specs 命中及其对本次改造的约束解读；doc_index/wiki 空 |

数据锚点引用示例：scope 判定见 `{{aref:current-analysis#/scope_verdict}}`，决策清单见 `{{aref:current-analysis#/decisions}}`（JSON 为唯一事实源，本报告不复制其内容）。

## Handoff/Next

**→ plan（needs: current-analysis）**。移交给 plan 的关键输入：

1. **首任务必须是 Lighthouse 基线测量**（OQ-1/OQ-2，R3）：next build + next start，对 /models、/models/[canonicalId]、/compare、/providers 跑 desktop+mobile 双预设；基线结果决定性能路线 A（保守）/B（静态化）分岔。
2. **G1 建议任务序**：token 层扩充（间距/圆角/字号/阴影/z-index/动效 6 类，纯增量）→ 纯函数抽取（one()/priceMetric/排序链接 builder，零 UI 风险）→ CSS 复制块合并与死代码清理（逐表甄别，独立 commit）→ 组件抽取（DetailHeader/DetailMetrics/ModalShell，需 e2e 回归）。
3. **G2 建议任务序**：动效 token（--transition-fast: 150ms / --transition-base: 200-250ms）→ hover/focus 过渡补齐 → details/dialog 进出场 → 排序/切换 pending 反馈（OQ-3 设计点）。
4. **硬约束提醒**：CSS 类名不可改（e2e 锁定）；中文默认文案不可改；URL 参数语义不可改；comparison-dialog 入口与比较范围受 arch spec 约束（priors.json）。
5. **Deferred 三项**（error/not-found i18n、next/font 品牌字体、providerStats 预计算）不进本轮 plan 主线，字体项需用户表态（触及品牌边界）。
