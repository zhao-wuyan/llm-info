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

<spec-entry category="coding" keywords="缺失价格,免费报价,null" date="2026-07-18" sid="S-20260718-qkge" title="缺价与零价展示语义" description="区分缺失价格与有效零价的界面语义" source="finish-work" status="deprecated" superseded-by="S-20260719-7qa9">

### 缺价与零价展示语义

缺少当前币种展示价的供应商行 MUST 保留、显示短横线并置底；有效零价 MUST 显示免费和 0.00；null 与 0 MUST NOT 使用相同视觉表达。

</spec-entry>

<spec-entry category="coding" keywords="显式免费,free,零价,official" date="2026-07-19" sid="S-20260719-7qa9" title="显式免费证据展示规则" description="零价与显式免费证据分离" source="main@87d96d7" supersedes="S-20260718-qkge" status="deprecated" superseded-by="S-20260719-e0sb">

### 显式免费证据展示规则

缺少当前币种展示价的供应商行 MUST 保留、显示短横线并置底；数值零价 MUST 显示 0.00，但 MUST NOT 自动显示免费；仅当选中的报价证据包含明确布尔标记 free: true、isFree: true 或 is_free: true 时，UI 才 MUST 额外显示免费。official 字段 MUST NOT 作为免费判断依据。

</spec-entry>

<spec-entry category="coding" keywords="free token,零价,免费证据,正则" date="2026-07-19" sid="S-20260719-e0sb" title="免费报价证据推断规则" description="显式标记与零价名称联合判定免费" source="main@87d96d7" supersedes="S-20260719-7qa9">

### 免费报价证据推断规则

缺价 MUST 显示短横线；数值零价 MUST 显示 0.00。报价满足以下任一条件时 UI MUST 额外显示免费：上游存在明确布尔标记 free: true、isFree: true 或 is_free: true；或者模型 ID/名称匹配独立 free token 正则 (?:^|[^a-z0-9])free(?:$|[^a-z0-9]) 且该报价全部数值费率为 0。任一费率非零时 MUST NOT 由名称推断免费；描述字段 MUST NOT 参与正则推断；official 字段 MUST NOT 参与免费判断。

</spec-entry>