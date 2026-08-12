# TASK-003 摘要：G1 纯函数/常量收敛

状态：completed（2026-08-12 19:30 +08:00）

## 做了什么

- 新建 3 个共享模块：`lib/search-params.ts`（one/many）、`lib/price-metrics.ts`（priceMetric as const + PriceMetricKey）、`lib/sort-links.ts`（createSortLinks 工厂，含 basePath/baseQuery/onClear 参数吸收各页差异）
- 6 个页面删除本地 one/many 与 directionFor/sortLinkFor，改为 import + `createSortLinks(...)`：models（basePath "/models" + baseQuery）、compare（+ onClear 写 sort=none）、providers、sources、models 详情（动态 basePath、无 baseQuery）、providers 详情（同）
- compare 页 metricByColumn 字面量 → `const metricByColumn: Partial<Record<string, PriceMetric>> = priceMetric;` 引用赋值
- 两个 dialog 删除本地 priceMetric 改 import；model-cells.tsx 的等价映射 priceRates 收敛为 `const priceRates: Record<string, string> = priceMetric;`（保持宽类型索引行为，`priceRates[column.id]` 调用点零改动）
- dialog 内 SortableButtonHeader 的 toggleSort/nextSortState 客户端状态机未动（不在抽取范围）

## URL 等价性论证

全部 sort key 为纯字母（provider/input/output/cacheRead/cacheWrite/name/released/context/models/usd/cny/quality/records/board:*），URLSearchParams 序列化输出与原手写 `?sort=${key}&order=${nextOrder}` 拼接逐字节一致；e2e accessibility.spec URL 语义断言全过为实证。

## 验证

- 5 条静态判据全过（本地定义清零、引用赋值就位、6 页面接入）
- `npx tsc --noEmit` exit 0
- `npm run test` exit 0（node --test 38 pass + vitest 55 pass）
- `npm run build` exit 0
- `npx playwright test` exit 0（87 passed 1 skipped，含 accessibility.spec 96-187 行 reset 链接 URL 参数语义断言）

## 偏离

无。
