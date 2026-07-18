---
kind: quality-source-analysis
source: nuxdie/ai-pricing
revision: 5ab51479cd8cae12e0c63dec14200ed75ef480cd
---
# Quality 数据源分析

## 结论

- `nuxdie/ai-pricing` 的 Quality 列直接读取 `src/data/llm-data.json` 中的 `AAIndex`，不是运行时计算结果。
- 上游 `update_prices.js` 只更新价格，不更新 `AAIndex`；README 明确说明模型数据存在持续人工更新，因此该字段属于上游维护的快照证据。
- 本项目只导入 `AAIndex`、上游模型名和开发者，不导入其价格、上下文、能力或其他 benchmark 字段。
- 22 条含 `AAIndex` 的上游记录全部映射到本地 `canonicalId`，生成后覆盖 22 个规范模型和 180 条渠道 listing，未匹配数为 0。
- 每条 Quality 证据保留上游模型名、开发者、数据文件 commit 和观测时间。当前 revision 为 `5ab51479cd8cae12e0c63dec14200ed75ef480cd`。

## 自动化边界

生成脚本从 ai-pricing 的 raw JSON 拉取数据，并通过 GitHub commits API 获取 `src/data/llm-data.json` 最新 revision。显式别名表负责把上游名称映射到本地 `canonicalId`；新增但未映射的上游模型不会错误附着，而会计入 `stats.unmatchedQualityModels`。

`generatedAt`、抓取时间、Quality revision 和 license 检查时间不单独触发数据更新；`AAIndex`、映射结果或 license 结果变化才会产生新的 `models.json`。

## License 校验

| 数据源 | SPDX | 展示 | LICENSE 文件 |
| --- | --- | --- | --- |
| LiteLLM | MIT | MIT | 有，GitHub 未识别时由授权文本回退识别 |
| aidy-models | MIT | MIT | 有 |
| model-price-hub | NOASSERTION | 未标注 | 无 |
| ai-pricing | MIT | MIT | 有 |

License API 返回 404 时才标记为未标注；限流、认证或服务错误会中止生成，避免误判授权状态。

## 验证

- `npm test`：12/12 通过。
- `npm run generate`：22 个 Quality 模型、180 条 Quality listing、0 个未匹配模型。
- 第二次 `npm run generate`：正确报告无模型、价格或 Quality 变化。
- `npm run validate`：生成数据有效。
- Pencil 全画布：`No layout problems`。
