---
title: "Architecture Constraints"
readMode: required
priority: high
category: arch
keywords:
  - architecture
  - module
  - layer
  - boundary
  - dependency
  - structure
---

# Architecture Constraints

## Module Structure

## Layer Boundaries

## Dependency Rules

## Technology Constraints

## Entries



<spec-entry category="arch" keywords="canonicalid,模型列表,供应商" date="2026-07-18" sid="S-20260718-apm3" title="规范模型目录边界" description="定义模型列表与渠道展开的信息架构边界" source="finish-work">

### 规范模型目录边界

模型列表页 MUST 以 canonicalId 聚合后的规范模型为主要展示对象；供应商渠道 MUST 在详情页和对比弹框中展开。

</spec-entry>

<spec-entry category="arch" keywords="供应商对比,模型详情,canonicalid" date="2026-07-18" sid="S-20260718-vyay" title="详情内供应商对比边界" description="限定供应商对比的入口与比较范围" source="finish-work">

### 详情内供应商对比边界

多供应商对比弹框 MUST 从规范模型详情页进入，且 MUST 只比较当前 canonicalId 下的渠道；本阶段 MUST NOT 混入跨模型能力对比。

</spec-entry>