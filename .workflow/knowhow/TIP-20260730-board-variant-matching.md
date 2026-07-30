---
title: 榜单模型变体匹配必须按数据源收敛
description: 避免跨 owner 和跨 Base/Instruct/Thinking 语义变体错配
type: tip
category: review
explicitId: tip-20260730-board-variant-matching
created: 2026-07-30T03:02:06.386Z
keywords:
  - leaderboard
  - model-matching
  - canonicalId
  - owner
  - thinking
specCategory: review
---

外部榜单映射不可共用会删除 `base`、`instruct`、`thinking` 的全局噪声规则。评分榜只应折叠明确的推理强度后缀（如 `(high|medium|low|xhigh)` 和 thinking token budget），并在归一到同一 canonicalId 后取最高分；Hub 仓库匹配必须保留架构变体。上游提供 organization 时必须拒绝 owner 不兼容候选，不能让 exact 文本命中绕过 owner；owner 等价仅允许项目规范声明的分隔符规则。索引校验还应绑定 `catalogGeneratedAt` 与目录快照。证据：src/model-index/match.js、src/model-index/build.js。
