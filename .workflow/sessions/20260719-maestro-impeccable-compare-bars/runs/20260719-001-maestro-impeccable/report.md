---
verdict: ready
summary: "模型对比页已统一全局 USD/CNY 价格体系，AAIndex、四类价格、上下文与能力参数均改为水平柱状图。"
constraints:
  - id: native-pricing
    text: "价格只读取当前币种原生报价，不做汇率换算；缺价显示 -，零价保留 0.00。"
    status: locked
  - id: accessible-bars
    text: "柱状图必须同时显示数值或支持状态，不得只依赖颜色传达信息。"
    status: locked
decisions:
  - id: row-relative-scale
    text: "数值柱按当前筛选结果中同列最大值归一化，非零最小柱宽为 4%。"
    status: accepted
  - id: isolated-next-build
    text: "Next.js 支持 NEXT_DIST_DIR 隔离验证构建，Vercel 未设置时仍使用默认 .next。"
    status: accepted
concerns: []
next: []
---
## 摘要

模型对比页由 USD/CNY 并列价格文本改为当前币种输入、输出、缓存读取、缓存创建 4 个价格柱，并将 AAIndex、上下文和 3 项能力全部统一为带文字值的水平柱。

## 结论/Verdict

ready。实现、隔离 production build、桌面/移动端 E2E 与 axe 扫描全部通过。

## 讨论/复盘

盘点时发现供应商预览和弹框读取了不存在的缓存键，已统一修正为数据源标准键 `textInput_cacheRead` / `textInput_cacheWrite`。移动端固定模型列并在局部容器横向滚动，document 无全局溢出。

## 产物

- `app/compare/page.tsx`：全局币种、四价格柱及全部参数柱状图。
- `app/globals.css`：对比柱、缺价和布尔能力柱样式。
- `components/provider-models-dialog.tsx`、`app/providers/[id]/page.tsx`：缓存价格键修正。
- `lib/i18n.ts`：支持/不支持中英文映射。
- `next.config.ts`：隔离构建目录支持。
- `tests/catalog.test.ts`、`tests/e2e/catalog.spec.ts`：缓存键、柱数量、币种切换与响应式验证。
- `evidence/screenshots/*-compare-bars*.png`：桌面与移动端首端、末端截图证据。

## 交接/Next

无需后续操作。用户正在使用的 3000 端口未被本次隔离构建与 E2E 占用。
