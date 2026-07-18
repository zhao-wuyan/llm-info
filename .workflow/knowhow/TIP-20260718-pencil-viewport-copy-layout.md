---
title: Pencil 视口外页面复制的布局偏移规避
description: 在无限画布视口外扩展复杂页面时，通过复制稳定页面并原位更新来避免子树偏移。
type: tip
category: debug
created: 2026-07-18T22:14:53+08:00
tags: [Pencil, 原型, 布局偏移, 页面复制]
status: active
---

# Pencil 视口外页面复制的布局偏移规避

Pencil MCP 在当前视口外直接新建复杂 flex 子树时，节点可能整体偏移约 50 px。扩展同一套桌面页面时，稳定做法是复制已经通过布局检查的顶层页面，设置准确的根节点坐标，再只更新复制页中的既有节点内容与属性，避免重新插入布局子树。

完成后同时执行顶层坐标检查、`snapshot_layout(..., problemsOnly: true)` 和整图截图确认；保留正式页面前删除调试副本。

## Context

- `design/原型设计.pen`
- 适用于多画面、相同导航与主区域骨架的 Pencil 原型扩展。
