# Grill Report: 模型目录与多供应商价格对比原型

**Session**: `20260718-grill-model-prototype`
**Run**: `20260718-001-grill`
**Depth**: shallow（3 个分支）
**Date**: 2026-07-18
**Upstream**: none

## Discovery Summary

### Project Context

项目当前只实现模型与价格数据管线，页面尚未定义。原型范围是使用 Pencil MCP 设计模型列表页、模型详情页和多供应商对比弹框。

### Codebase Surface

- `data/models.json` 当前包含 306 个供应商、10,004 条渠道模型记录和 7,741 个 `canonicalId`。
- 709 个 `canonicalId` 对应多个渠道；单个模型最多有 26 个渠道。
- `models[]` 保留不同 `providerId/modelId` 的渠道记录，`canonicalId` 用于聚合同一模型。
- `pricing[]` 保留原始报价，`displayPrices.USD/CNY` 提供页面展示价；不做汇率换算，缺失价格展示 `-`。

### Upstream Material

N/A

---

## Branch Log

| # | Branch | Status | Decisions | Open Questions |
|---|--------|--------|-----------|----------------|
| 1 | Scope & Boundaries | Complete | 2 | 0 |
| 2 | Data Model & State | Complete | 2 | 0 |
| 3 | Edge Cases & Failure Modes | Complete | 2 | 0 |

---

## Branch 1: Scope & Boundaries

**Status**: Complete
**Questions asked**: 2
**Decisions locked**: 2

### Q1.1: 列表页的一行或一卡代表什么？

**Answer**: 规范模型（按 `canonicalId` 聚合）。
**Evidence**: 用户明确确认；`README.md:19` 规定 `canonicalId` 用于页面聚合同一模型。当前 10,004 条渠道模型记录聚合为 7,741 个规范模型。
**Decision**: locked
**Constraint**: 模型列表页 MUST 以 `canonicalId` 聚合后的规范模型为主要展示对象；供应商渠道 MUST 在详情页和对比弹框中展开。

### Q1.2: 多供应商对比弹框从哪里进入？

**Answer**: 仅从模型详情页进入。
**Evidence**: 用户明确确认；`README.md:19` 将供应商差异限定为同一模型的多渠道记录。
**Decision**: locked
**Constraint**: 多供应商对比弹框 MUST 从规范模型详情页进入，且 MUST 只比较当前 `canonicalId` 下的渠道；本阶段 MUST NOT 混入跨模型能力对比。

---

## Branch 2: Data Model & State

**Status**: Complete
**Questions asked**: 2
**Decisions locked**: 2

### Q2.1: 对比弹框的主价格采用哪种口径？

**Answer**: 展示价优先。
**Evidence**: 用户明确确认；`README.md:17` 定义了 `displayPrices.USD/CNY`，同时要求不做汇率换算并保留 `pricing[]` 追溯。
**Decision**: locked
**Constraint**: 对比弹框主表 MUST 使用 `displayPrices.USD/CNY`；MUST 显示价格来源与观测时间；原始 `pricing[]` SHOULD 通过次级展开区提供。

### Q2.2: 对比弹框如何承载最多 26 个供应商？

**Answer**: 供应商按行展示。
**Evidence**: 用户明确确认；真实数据中 `moonshotai/kimi-k2.6` 有 26 个渠道记录。
**Decision**: locked
**Constraint**: 对比弹框 MUST 以供应商为行、比较指标为列；MUST 支持搜索、筛选和排序；MUST NOT 以固定数量的供应商横向卡片作为唯一结构。

---

## Branch 3: Edge Cases & Failure Modes

**Status**: Complete
**Questions asked**: 2
**Decisions locked**: 2

### Q3.1: 当前币种缺价时是否保留供应商行？

**Answer**: 保留并置底。
**Evidence**: 用户明确确认；`README.md:17` 要求缺失原生价格显示 `-`。Kimi K2.6 的官方渠道只有 CNY 展示价，多数第三方只有 USD 展示价。
**Decision**: locked
**Constraint**: 缺少当前币种展示价的供应商行 MUST 保留并显示 `-`；默认排序 MUST 将其置于有价行之后；界面 SHOULD 提供“只看有报价”筛选。

### Q3.2: 零价与缺价如何区分？

**Answer**: 零价显示“免费 + 0.00”，缺价显示 `-`。
**Evidence**: 用户明确确认；schema 允许价格为 0，真实数据包含 1,953 个零费率项，且存在 `*-free` 模型。
**Decision**: locked
**Constraint**: 有效零价 MUST 显示“免费”语义和精确 `0.00`；`null` MUST 显示 `-`；两者 MUST NOT 使用相同视觉表达。

---

## Synthesis

### Decision Summary

| # | Decision | Status | Branch | RFC 2119 |
|---|----------|--------|--------|----------|
| 1 | 列表按 `canonicalId` 展示规范模型 | Locked | Scope & Boundaries | MUST |
| 2 | 对比弹框仅从详情页进入且只比较当前模型 | Locked | Scope & Boundaries | MUST |
| 3 | 主价格使用 USD/CNY 展示价并保留追溯入口 | Locked | Data Model & State | MUST |
| 4 | 供应商按行，指标按列 | Locked | Data Model & State | MUST |
| 5 | 当前币种缺价行保留、显示 `-` 并置底 | Locked | Edge Cases & Failure Modes | MUST |
| 6 | 零价显示“免费 + 0.00”，不与缺价混淆 | Locked | Edge Cases & Failure Modes | MUST |

### Verified Constraints

- 列表、详情和弹框 MUST 形成“浏览规范模型 -> 查看模型详情 -> 比较同一模型供应商”的单向主任务流。
- 原型 MUST 遵循 `canonicalId`、`providerId/modelId`、`displayPrices` 和 `pricing[]` 的层级，不得把渠道价格提升成规范模型的唯一事实。
- 对比表 MUST 支持最多 26 个以上供应商，不得依赖固定 4 列布局。

### Open Questions

无阻塞性问题。品牌命名、移动端布局和实际筛选字段可在 Pencil 视觉设计中按现有数据保守确定。

### Risk Register

| # | Risk | Branch | Severity | Mitigation |
|---|------|--------|----------|------------|
| 1 | `canonicalId` 聚合质量错误会让不相同模型被合并 | Data Model & State | Medium | 详情页保留渠道模型标识与来源，便于发现异常聚合 |
| 2 | USD/CNY 覆盖稀疏会导致某币种下大量缺价 | Edge Cases & Failure Modes | Medium | 保留缺价行、置底，并提供“只看有报价”筛选 |
| 3 | 供应商数量过多导致弹框纵向扫描成本高 | Data Model & State | Medium | 提供搜索、筛选、排序与粘性表头 |

### Recommended Next Step

根据已锁定约束，直接使用 Pencil MCP 绘制模型列表页、模型详情页和多供应商对比弹框原型。
