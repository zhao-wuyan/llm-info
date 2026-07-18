---
title: "Coding Conventions"
readMode: required
priority: high
category: coding
keywords:
  - style
  - naming
  - import
  - pattern
  - convention
  - formatting
---

# Coding Conventions

## Formatting

## Naming

## Imports

## Patterns

## Entries



<spec-entry category="coding" keywords="displayprices,pricing,价格追溯" date="2026-07-18" sid="S-20260718-p062" title="展示价与报价追溯规则" description="定义供应商价格对比的主展示口径" source="finish-work">

### 展示价与报价追溯规则

对比弹框主表 MUST 使用 displayPrices.USD/CNY；MUST 显示价格来源与观测时间；原始 pricing SHOULD 通过次级展开区提供。

</spec-entry>

<spec-entry category="coding" keywords="缺失价格,免费报价,null" date="2026-07-18" sid="S-20260718-qkge" title="缺价与零价展示语义" description="区分缺失价格与有效零价的界面语义" source="finish-work">

### 缺价与零价展示语义

缺少当前币种展示价的供应商行 MUST 保留、显示短横线并置底；有效零价 MUST 显示免费和 0.00；null 与 0 MUST NOT 使用相同视觉表达。

</spec-entry>