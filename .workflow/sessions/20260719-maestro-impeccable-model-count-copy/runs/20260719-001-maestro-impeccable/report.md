---
verdict: ready
summary: "模型计数标签已由规范模型改为模型数，相关中英文说明文案已同步去除内部 canonical 术语。"
constraints:
  - id: preserve-canonical-semantics
    text: "仅调整用户界面文案，不改变 canonicalId 聚合和统计口径。"
    status: locked
decisions:
  - id: plain-model-count-copy
    text: "中文计数标签使用模型数，英文使用 Models；说明文字使用模型。"
    status: accepted
caveats: []
open_questions: []
next: []
---
## 摘要

将模型目录、供应商列表和供应商详情共用的 `modelCount` 文案从“规范模型”改为“模型数”，并同步清理模型目录与模型对比说明中的同类术语。

## 结论/Verdict

Ready。页面文案已统一，底层模型聚合逻辑保持不变。

## 讨论/复盘

- `lib/i18n.ts` 中文 `modelCount` 改为“模型数”，英文改为 `Models`。
- 中文说明使用“模型”，不再暴露“规范模型”这一内部术语。
- 英文说明不再使用 `Canonical models`，但保留 `canonicalId` 以准确描述聚合依据。

## 产物

- `npx tsc --noEmit`：通过。
- `npm test`：13 个数据测试、17 个 UI 测试通过。
- 本地 `/models`：HTTP 200，包含“模型数”，不包含“规范模型”。
- UI spec：`S-20260719-c5og`（模型计数使用通俗文案）。

## 交接/Next

无需迁移数据或调整统计逻辑。本次未创建 Git 提交。
