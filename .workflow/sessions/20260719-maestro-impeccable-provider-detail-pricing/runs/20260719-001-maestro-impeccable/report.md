---
verdict: ready
summary: "供应商详情模型预览已同步全局 USD/CNY 价格体系，并展示输入、输出、缓存读取、缓存创建四类原生报价。"
constraints:
  - id: native-pricing
    text: "只读取当前币种原生报价，不做汇率换算；缺价显示为 -。"
    status: locked
  - id: spacing-scope
    text: "只调整供应商预览表格的列布局，不改变其他区域间距。"
    status: locked
decisions:
  - id: shared-currency
    text: "供应商预览与全部模型弹框共同服从顶部 llm-currency 偏好。"
    status: accepted
  - id: responsive-table
    text: "桌面使用 840px 紧凑固定列宽完整显示四类价格，移动端使用局部横向滚动。"
    status: accepted
concerns: []
next: []
---
## 摘要

供应商详情页前 8 个模型的预览表由 USD/CNY 输入价并列展示，改为当前币种下的输入、输出、缓存读取、缓存创建 4 列。

## 结论/Verdict

ready。实现、production build、桌面与移动端浏览器验证均通过。

## 讨论/复盘

预览表使用专属紧凑列宽，避免复用模型目录 1120px 宽表格导致桌面端隐藏缓存价格。NanoGPT 切换到 CNY 后保留全部预览行，并将缺失的四类报价显示为 `-`。

## 产物

- `app/providers/[id]/page.tsx`：供应商预览接入当前币种四价格列。
- `app/globals.css`：供应商预览专属桌面列宽、固定首列和移动端滚动规则。
- `tests/e2e/catalog.spec.ts`：详情预览四表头、缺价、页面溢出和移动端滚动断言。
- `evidence/screenshots/desktop-provider-detail-pricing.png` 与 `mobile-provider-detail-pricing.png`：渲染证据。

## 交接/Next

无需后续操作。标准 `next build` 已验证，可继续用于 Vercel 部署。
