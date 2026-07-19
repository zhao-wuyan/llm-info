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

<spec-entry category="ui" keywords="responsive table dialog overflow" date="2026-07-18" sid="S-20260718-sdp2" title="移动数据详情宽度约束" description="防止宽表撑大移动文档并破坏整页弹框居中" source="main@87d96d7">

### 移动数据详情宽度约束

包含最小宽度表格的移动详情布局 MUST 在 grid/flex 祖先链使用 minmax(0, 1fr) 与 min-width: 0，表格 MUST 在局部容器内滚动，打开应用级 dialog 前后 document.scrollWidth MUST 等于 document.clientWidth。

</spec-entry>

<spec-entry category="ui" keywords="模型列表,币种切换,缓存价格,llm-currency" date="2026-07-19" sid="S-20260719-zx1q" title="模型列表单币种价格体系" description="统一模型列表价格维度与全局币种偏好" source="main@87d96d7">

### 模型列表单币种价格体系

模型列表 MUST 使用 Topbar 的 USD/CNY 价格体系偏好，并通过 llm-currency cookie 持久化；MUST 按当前币种展示输入价、输出价、缓存读取价、缓存创建价四列，MUST NOT 在模型列表并列展示 USD/CNY 输入价；价格排序 MUST 使用当前币种；缺少当前币种报价的模型 MUST 保留、显示短横线并置底。供应商比较弹框 MAY 保留局部币种切换。

</spec-entry>

<spec-entry category="ui" keywords="provider-dialog,currency,pricing,cache-price" date="2026-07-19" sid="S-20260719-q28a" title="供应商模型弹框遵循全局价格体系" description="统一供应商模型弹框的币种与四类价格展示规则" source="main@87d96d7">

### 供应商模型弹框遵循全局价格体系

供应商详情的全部模型弹框必须直接读取顶部全局币种偏好，按当前币种展示输入、输出、缓存读取、缓存创建四类原生报价；当前币种缺价显示 - 且置于有价模型之后，不做汇率换算。移动端使用弹框内容区局部横向滚动并固定模型首列。

</spec-entry>

<spec-entry category="ui" keywords="provider-detail,preview,currency,pricing" date="2026-07-19" sid="S-20260719-982d" title="供应商详情预览遵循全局价格体系" description="统一供应商详情模型预览与全局四价格列规则" source="main@87d96d7">

### 供应商详情预览遵循全局价格体系

供应商详情页默认展示的模型预览表必须遵循顶部全局币种偏好，展示输入、输出、缓存读取、缓存创建四类当前币种原生报价；缺价显示 -，不得并列比较 USD/CNY。桌面端应在详情主栏内完整展示四类价格，移动端在表格容器内横向滚动且不得造成 document 级溢出。

</spec-entry>