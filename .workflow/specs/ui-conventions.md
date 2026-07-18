---
title: "UI Conventions"
readMode: optional
priority: medium
category: ui
keywords:
  - ui
  - design
  - color
  - typography
  - layout
  - animation
  - component
---

# UI Conventions

## Color & Theme

## Typography

## Layout & Spacing

## Motion & Animation

## Component Patterns

## Entries



<spec-entry category="ui" keywords="product,register,users,anti-references" date="2026-07-18" sid="S-20260718-qn96" title="LLM Info 产品设计语境" description="LLM Info 的产品界面设计语境" source=".workflow/impeccable/PRODUCT.md">

### LLM Info 产品设计语境

Product Context: llm-info. Register: product. Users: 需要发现模型并比较 API 接入渠道的开发者与技术决策者。Brand personality: 冷静、专业、透明。Design principles: 先模型后渠道、扫描优先、数据透明、熟悉胜过新奇、克制表达。Anti-references: 营销 hero、装饰性卡片堆叠、夸张渐变、无依据推荐。

</spec-entry>

<spec-entry category="ui" keywords="design,colors,typography,components,visual-system" date="2026-07-18" sid="S-20260718-47lk" title="LLM Info Seed 视觉系统" description="LLM Info Pencil 原型的种子视觉系统" source=".workflow/impeccable/DESIGN.md">

### LLM Info Seed 视觉系统

Design System: LLM Info. Color strategy: 中性底加青绿强调色。Typography: 单一技术型 Sans，模型 ID 辅以 Mono。Elevation: 默认扁平，仅弹框使用轻微阴影。Key components: 搜索、筛选、表格、标签页、弹框。North star: The Clear Ledger。

</spec-entry>

<spec-entry category="ui" keywords="供应商,模型,详情,点击导航" date="2026-07-18" sid="S-20260718-8h74" title="实体列表到详情的点击导航" description="统一供应商行和模型行进入对应详情页的交互规则" source="main@ed84c25">

### 实体列表到详情的点击导航

多供应商对比弹框中的供应商行 MUST 可点击，并直接进入对应 providerId 的供应商详情页；供应商模型列表弹框中的模型行 MUST 可点击，并直接进入对应 canonicalId 的模型详情页。整行作为点击目标，行尾使用 chevron-right 提示可下钻，搜索与筛选操作不得触发详情跳转。

</spec-entry>

<spec-entry category="ui" keywords="弹框,整页居中,侧边栏,遮罩" date="2026-07-18" sid="S-20260718-t9mp" title="应用级弹框相对整页居中" description="应用级弹框不受侧边栏影响并相对完整页面居中" source="main@ed84c25">

### 应用级弹框相对整页居中

覆盖侧边栏和主内容区的应用级弹框 MUST 相对完整页面视口居中，不得只相对侧边栏之后的主内容区域居中。对于 1440 宽页面与 1100 宽弹框，水平位置 MUST 为 x = 170；遮罩 MUST 覆盖完整页面。

</spec-entry>