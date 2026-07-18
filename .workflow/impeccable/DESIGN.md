<!-- SEED: re-run /maestro-impeccable document once there's code to capture the actual tokens and components. -->
---
name: LLM Info
description: 冷静、专业、透明的 LLM 模型目录与供应商价格比较工具
---

# Design System: LLM Info

## Overview

**Creative North Star: "The Clear Ledger"**

界面像一份可信、持续更新的模型账本：结构稳定，数据密集但不拥挤，任何价格都能看到来源和缺失状态。视觉成熟度参考 Stripe 的数据可信感、Linear 的紧凑层级与 Vercel 的开发者工具清晰度。

动效只解释状态变化，不承担装饰。界面明确拒绝营销 hero、装饰性卡片堆叠、夸张渐变和无依据推荐。

**Key Characteristics:**

- 冷静的中性表面
- 稀少而明确的青绿强调色
- 高密度、强对齐的数据布局
- 可追溯的价格与来源语义
- 熟悉的产品工具交互

## Colors

使用中性白与冷灰承载主要信息，青绿只用于主操作、焦点和选择态；成功、警告、错误保持独立语义色。具体色值在 Pencil 实现后回填。

**The One Accent Rule.** 青绿强调色在单屏中的视觉占比不得超过 10%，禁止用于大面积装饰背景。

## Typography

**Display Font:** 单一技术型 Sans `[implementation: Inter / Segoe UI]`
**Body Font:** 单一技术型 Sans `[implementation: Inter / Segoe UI]`
**Label/Mono Font:** 等宽字体仅用于模型 ID、代码标识和紧凑数值 `[implementation: JetBrains Mono / Cascadia Mono]`

**Character:** 字体应准确、克制、易扫描。标题通过字重和间距建立层级，不通过夸张字号制造戏剧感。

**The Dense Clarity Rule.** 表格与工具栏保持紧凑字号，但正文和说明不得低于可读基线。

## Elevation

默认扁平，通过背景层级与 1px 边界区分区域。阴影只用于弹框等临时浮层，不用于普通页面区块。

**The Flat by Default Rule.** 静态内容没有阴影；只有需要遮挡上下文的临时层可以获得轻微浮起感。

## Components

组件采用成熟工具型模式：8px 或更小圆角，清晰边界，稳定尺寸。按钮、筛选器、表格、标签页和弹框必须具备 hover、focus、active、disabled 等完整状态。具体组件 tokens 将在 Pencil 原型完成后通过扫描模式提取。

## Do's and Don'ts

### Do:

- **Do** 使用标准搜索、筛选、排序、标签页和弹框模式。
- **Do** 让价格来源、币种、更新时间和缺失状态保持可见。
- **Do** 使用文字或图标配合颜色表达状态，满足 WCAG 2.2 AA。
- **Do** 保持表格列、数字和单位严格对齐。

### Don't:

- **Don't** 做营销型 hero、口号先行或首屏宣传页。
- **Don't** 使用装饰性卡片堆叠、夸张渐变、霓虹发光或无功能价值的动效。
- **Don't** 把模型目录做成促销 marketplace，或使用“最佳”“最强”等无数据依据推荐语。
- **Don't** 为追求新奇而改造表格、筛选器、弹框等标准产品交互。
