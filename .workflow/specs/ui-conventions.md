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

<spec-entry category="ui" keywords="compare,currency,bar-chart,pricing" date="2026-07-19" sid="S-20260719-43wq" title="模型对比使用全局币种参数柱" description="统一模型对比页价格体系与参数视觉编码" source="main@cdbd58a" status="deprecated" superseded-by="S-20260719-0mau">

### 模型对比使用全局币种参数柱

模型对比页必须服从顶部 llm-currency 偏好，不得并列展示 USD/CNY；必须展示当前币种输入、输出、缓存读取、缓存创建四类原生报价。AAIndex、四类价格、上下文和布尔能力参数必须使用带明确数值或状态文字的水平柱状图；缺价显示 -，零价显示 0.00，能力状态不得只依赖颜色。表格在移动端局部横向滚动并固定模型列。

</spec-entry>

<spec-entry category="ui" keywords="compare,currency,bar-chart,boolean-tag" date="2026-07-19" sid="S-20260719-0mau" title="模型对比按数据类型选择视觉编码" description="区分连续数值柱状图与布尔能力状态标签" source="main@cdbd58a" supersedes="S-20260719-43wq" status="deprecated" superseded-by="S-20260719-v434">

### 模型对比按数据类型选择视觉编码

模型对比页必须服从顶部 llm-currency 偏好，展示当前币种输入、输出、缓存读取、缓存创建四类原生报价。仅 AAIndex、四类价格、上下文等连续数值使用带明确数值的水平柱状图；工具调用、视觉理解、推理等布尔能力必须使用支持/不支持状态标签，不得使用柱状图暗示数量关系。缺价显示 -，零价显示 0.00；移动端局部横向滚动并固定模型列。

</spec-entry>

<spec-entry category="ui" keywords="compare,bar-chart,inline-value,vision" date="2026-07-19" sid="S-20260719-v434" title="模型对比数值柱内联标签" description="固定柱轨内联数值并精简能力列" source="main@cdbd58a" supersedes="S-20260719-0mau">

### 模型对比数值柱内联标签

模型对比页连续数值柱必须使用固定宽度轨道，填充层和数值标签均绝对定位在轨道内，数值字符长度不得参与柱宽计算；缺价在同一轨道内显示 -。能力结果只展示视觉理解是否支持，使用支持/不支持状态标签；不得展示工具调用和推理结果列。

</spec-entry>

<spec-entry category="ui" keywords="compare,bar-chart,color,tone,dark-mode" date="2026-07-19" sid="S-20260719-a8l4" title="模型对比数值柱分类淡色" description="为模型对比连续数值柱建立明暗主题分类淡色映射" source="session-run:20260719-maestro-impeccable-bar-colors/20260719-001-maestro-impeccable">

### 模型对比数值柱分类淡色

模型对比页的 AAIndex、输入价、输出价、缓存读取价、缓存创建价、上下文数值柱 MUST 分别使用稳定的淡紫、淡绿、淡粉、淡蓝、淡黄、淡青 tone；暗黑模式 MUST 使用对应的低饱和色。颜色仅辅助分类，数值标签和 aria-label MUST 保留，不得依赖颜色单独传递数值或支持状态。

</spec-entry>

<spec-entry category="ui" keywords="models,table,sorting,pagination,url,three-state" date="2026-07-19" sid="S-20260719-e5d9" title="模型列表表头全量三态排序" description="模型列表对完整筛选结果集执行表头三态排序" source="session-run:20260719-maestro-impeccable-global-sort/20260719-001-maestro-impeccable">

### 模型列表表头全量三态排序

模型列表的模型名称、上下文、供应商数、输入价、输出价、缓存读取价、缓存创建价表头 MUST 可点击排序，并按正序、倒序、不排序三态循环。排序 MUST 在筛选后的完整结果集上执行且先于分页；数值缺失项在正序和倒序中 MUST 始终置底。排序状态 MUST 使用 URL sort/order 参数，分页和筛选 MUST 保留当前有效排序，切换排序 MUST 回到第 1 页。

</spec-entry>

<spec-entry category="ui" keywords="table,fixed-layout,column-width,sorting,three-state,pagination,responsive" date="2026-07-19" sid="S-20260719-para" title="系统数据表固定列宽与三态排序" description="统一系统数据列表固定列宽和三态全量排序" source="session-run:20260719-maestro-impeccable-system-table-sort/20260719-001-maestro-impeccable">

### 系统数据表固定列宽与三态排序

系统内数据列表 MUST 使用 table-layout: fixed 和按表定义的稳定列宽，排序状态变化不得改变表头或数据列宽。实体名称列及数量、价格、上下文、质量分等可比较数值列 MUST 提供正序、倒序、不排序三态表头；能力、状态、License、来源说明和操作列 MUST NOT 为统一而强行排序。有分页或预览截断的列表 MUST 先对完整筛选结果集排序再切片；数值缺失项在两个方向均置底。移动端 MUST 保持局部横向滚动且不得产生 document 级溢出。

</spec-entry>

<spec-entry category="ui" keywords="table,ellipsis,truncation,title,overflow,fixed-width" date="2026-07-19" sid="S-20260719-pywk" title="固定列宽表格截断省略号" description="表格单行内容截断时显示省略号并保留完整文本" source="session-run:20260719-maestro-impeccable-table-ellipsis/20260719-001-maestro-impeccable">

### 固定列宽表格截断省略号

固定列宽表格中被限制为单行的实体名称、实体 ID、表头和长标签一旦超出可用宽度，MUST 使用 text-overflow: ellipsis 明确显示省略号，不得无提示裁切。实体名称和 ID MUST 在 title 中保留完整文本；名称与 ID 完全相同时 SHOULD 省略重复 ID。可正常换行的说明文本 MUST NOT 为统一样式而强制截断。

</spec-entry>

<spec-entry category="ui" keywords="table-header,subtitle,currency,responsive,clamp,mobile" date="2026-07-19" sid="S-20260719-amai" title="价格表头双行与窄屏弹性列宽" description="统一双行币种表头和移动端弹性表格列宽" source="main@5f54315">

### 价格表头双行与窄屏弹性列宽

价格表头 MUST 将输入、输出、缓存读、缓存写作为主标题，将当前 USD/CNY 作为第二行小号次级文字；中文价格标签 MUST 使用输入、输出、缓存读、缓存写。桌面端 MUST 保持既有固定列宽；小于 900px 时实体首列 MUST 使用 clamp 弹性缩窄并允许名称与 ID 多行换行，其他列与单元格间距 SHOULD 同步收紧；达到各表最小宽度后 MUST 在局部容器横向滚动且不得产生 document 级溢出。

</spec-entry>

<spec-entry category="ui" keywords="table,ability,column-order,responsive" date="2026-07-19" sid="S-20260719-ep0i" title="列表能力列统一置后" description="统一所有列表的能力列顺序" source="session-run:20260719-maestro-impeccable-ability-last/20260719-001-maestro-impeccable">

### 列表能力列统一置后

所有包含能力数据的列表 MUST 将能力列放在最后一个有标题的数据列；无标题操作列 MAY 继续位于能力列之后。模型对比若仅展示单项布尔能力，该能力列同样 MUST 位于最后。移动端横向滚动后 MUST 可完整查看能力标签和操作入口。

</spec-entry>

<spec-entry category="ui" keywords="copy,model-count,canonical,i18n" date="2026-07-19" sid="S-20260719-c5og" title="模型计数使用通俗文案" description="区分界面模型计数文案与内部 canonical 术语" source="session-run:20260719-maestro-impeccable-model-count-copy/20260719-001-maestro-impeccable">

### 模型计数使用通俗文案

面向用户的模型计数标签 MUST 使用模型数，说明文案 MUST 使用模型而非规范模型或 Canonical models；canonicalId、canonicalModels 等术语 MAY 保留在代码、数据结构和技术文档中。英文计数标签 MUST 使用 Models。

</spec-entry>

<spec-entry category="ui" keywords="模型列表,报价筛选,币种,分页,url" date="2026-07-19" sid="S-20260719-ae0l" title="模型目录当前币种报价筛选" description="模型目录按当前币种筛选有报价模型并保留 URL 状态" source="main@c11b14e">

### 模型目录当前币种报价筛选

模型目录 MUST 提供“只看有报价”复选框，并按 Topbar 当前 USD/CNY 币种判断 displayPrices[currency] 是否存在；筛选 MUST 在排序和分页前执行。启用、搜索或切换能力筛选 MUST 回到第 1 页；排序和分页 MUST 通过 priced=1 URL 参数保留筛选状态；取消筛选 MUST 恢复缺价模型并继续以短横线展示。

</spec-entry>

<spec-entry category="ui" keywords="compare,aaindex,default-sort,three-state,url" date="2026-07-19" sid="S-20260719-fpun" title="模型对比默认 AAIndex 倒序" description="模型对比默认按 AAIndex 倒序并保留显式无排序状态" source="session-run:20260720-maestro-impeccable-aaindex-sort/20260720-001-maestro-impeccable">

### 模型对比默认 AAIndex 倒序

模型对比页在 URL 未提供 sort 参数时 MUST 默认按 AAIndex（quality）倒序排列；用户主动取消排序时 MUST 使用 sort=none 显式保存无排序状态，筛选表单和分页链接 MUST 保留该状态。AAIndex 表头 MUST 继续提供不排序、正序、倒序三态循环，重置页面 MUST 恢复默认 AAIndex 倒序。

</spec-entry>

<spec-entry category="ui" keywords="github,repository,external-link,sidebar,mobile,a11y" date="2026-07-20" sid="S-20260720-agyi" title="全局项目 GitHub 入口" description="在桌面侧栏和移动抽屉提供可访问的项目 GitHub 外链" source="session-run:20260720-maestro-impeccable-github-link/20260720-001-maestro-impeccable">

### 全局项目 GitHub 入口

应用 MUST 在桌面侧栏底部提供本项目 GitHub 外链，并在移动端导航抽屉复用同一入口；链接 MUST 显示 GitHub 文案和平台图标，提供本地化可访问名称，并使用 target=_blank 与 rel=noreferrer 安全打开新窗口。该入口 MUST 作为次级项目链接，不得挤占主导航或顶部高频工具。

</spec-entry>