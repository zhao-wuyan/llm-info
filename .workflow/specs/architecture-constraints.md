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

<spec-entry category="arch" keywords="quality,aaindex,canonicalid,license,数据源" date="2026-07-18" sid="S-20260718-iu7n" title="Quality 数据源与模型映射边界" description="约束 Quality 自动拉取、规范模型映射、证据追溯与数据源授权校验" source="main@c387672" status="deprecated" superseded-by="S-20261102-1lk7">

### Quality 数据源与模型映射边界

模型对比默认集合 MUST 取 ai-pricing 中含 AAIndex 的记录与本地 models.json canonicalId 的交集，并按 canonicalId 去重。AAIndex MUST 作为 models[].quality 外部证据附着，不得覆盖本地价格、上下文、能力或供应商字段。映射 MUST 使用显式别名；每条 Quality 证据 MUST 保留 sourceModel、sourceDeveloper、observedAt 与上游数据文件 revision。Quality 数值自动拉取，新增未映射模型 MUST 计入 unmatchedQualityModels。数据源 license MUST 通过 GitHub License API 自动校验；存在文件时保存实际 SPDX 类型，无文件时保存 NOASSERTION 且 licenseLabel 显示未标注；非 404 错误不得降级为未标注。

</spec-entry>

<spec-entry category="arch" keywords="alias canonicalid owner 模型数据" date="2026-07-19" sid="S-20260719-6la0" title="模型 alias 自动发现边界" description="自动 alias 与候选审查的安全边界" source="main@860c486" status="deprecated" superseded-by="S-20260719-zuhr">

### 模型 alias 自动发现边界

模型生成 MUST 自动识别 canonical ID alias：owner 中 .、-、_ 分隔符的插入、删除、替换视为等价；model ID 仅自动合并分隔符替换。目标 canonical ID MUST 优先选择官方直连证据，其次按来源数、供应商数和记录数确定。仅在去除 model ID 分隔符后相同的记录 MUST 写入 modelAliasCandidates，MUST NOT 未经确认自动合并。

</spec-entry>

<spec-entry category="arch" keywords="alias canonicalid owner modelid" date="2026-07-19" sid="S-20260719-zuhr" title="模型 alias 严格分隔符边界" description="owner 与 model ID 采用不同的分隔符等价规则" source="main@860c486" supersedes="S-20260719-6la0">

### 模型 alias 严格分隔符边界

模型生成 MUST 自动识别 canonical ID alias：owner 中 .、-、_ 分隔符的插入、删除、替换视为等价；model ID 只允许等量分隔符替换，MUST NOT 插入或删除分隔符。4-8 与 48 等结构 MUST 保持独立且 MUST NOT 因删除分隔符进入候选。目标 canonical ID MUST 优先选择官方直连证据，其次按来源数、供应商数和记录数确定；其他映射必须人工确认后写入显式 alias 表。

</spec-entry>

<spec-entry category="arch" keywords="quality,aaindex,canonicalid,精确匹配,覆盖告警,数据源" date="2026-11-02" sid="S-20261102-1lk7" title="Quality 映射与外部榜单覆盖边界" sourceRef="fix/aaindex-aliases-2026-11@eaa3620" relatedPaths="src/adapters/ai-pricing.js,src/model-index/build.js" supersedes="S-20260718-iu7n">

### Quality 映射与外部榜单覆盖边界

AAIndex MUST 作为 models[].quality 外部证据附着，不得覆盖本地价格、上下文、能力或供应商字段。Quality 映射 MUST 优先使用显式别名；未配置别名时 MAY 使用显式 developer→owner 对照和同 owner 的唯一规范化精确模型 ID 或名称命中。规范化仅统一大小写、空白及点号、下划线、连字符分隔符，MUST NOT 删除日期、版本、参数规模、Full、Base、Instruct、Thinking 等语义；未知 owner、歧义或无命中 MUST 保留为 unmapped 并计入 unmatchedQualityModels，不得使用宽松或相似度匹配。每条 Quality MUST 保留 sourceModel、sourceDeveloper、observedAt 和上游 revision。AAIndex 榜单 MUST 直接复用目录已确认 canonicalId，不得按来源名称二次推断身份；其他榜单 MUST 保持各自 owner 与变体边界。覆盖不足或零匹配 MUST 不阻断其他模型和价格更新，MUST 在生成日志、Actions Summary 与数据 PR 展示告警及有界未映射名称；无评分 MUST 展示真实空态，不得沿用旧分数冒充新数据。schema、非法分数、未知 canonicalId、快照时间不配对、抓取和格式异常 MUST 继续阻断发布。模型对比 MUST 按 canonicalId 聚合多榜单，缺失评分留空。数据源 license MUST 通过 GitHub License API 校验；存在文件保存实际 SPDX，无文件保存 NOASSERTION 且 licenseLabel 显示未标注，非 404 错误不得降级。

</spec-entry>