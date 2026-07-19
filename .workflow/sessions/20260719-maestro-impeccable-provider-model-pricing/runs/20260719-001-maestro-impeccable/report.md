---
verdict: ready
summary: "供应商全部模型弹框已接入全局 USD/CNY 价格体系，并展示输入、输出、缓存读取、缓存创建四类原生报价。"
constraints:
  - id: native-pricing
    text: "models.json 原始报价不做汇率换算；缺失的当前币种报价显示为 -。"
    status: locked
  - id: spacing-scope
    text: "仅调整弹框模型表格布局，不改变其他页面间距。"
    status: locked
decisions:
  - id: global-currency
    text: "弹框直接服从顶部 llm-currency 偏好，不增加第二套局部币种开关。"
    status: accepted
  - id: missing-price-order
    text: "按当前币种输入价排序，缺价模型在升序和降序时都置底。"
    status: accepted
concerns: []
next: []
---
## 摘要

供应商详情页现在把服务端读取的全局币种传入全部模型弹框。弹框以当前币种展示输入、输出、缓存读取、缓存创建 4 个价格列，并保留缺价模型。

## 结论/Verdict

done。实现、production build、桌面与移动端浏览器验证均通过。

## 讨论/复盘

NanoGPT 当前没有 CNY 原生报价，因此切换到 CNY 后仍展示全部 617 个模型，4 个价格列显示 `-`。表格固定模型首列，移动端仅在 `.modal-content` 内横向滚动。

## 产物

- `app/providers/[id]/page.tsx`：读取并传递全局币种。
- `components/provider-models-dialog.tsx`：当前币种排序与 4 类价格展示。
- `app/globals.css`：弹框表格宽度、固定首列和局部滚动适配。
- `tests/e2e/catalog.spec.ts`：CNY 表头、缺价、溢出及移动端滚动验证。
- `evidence/screenshots/desktop-provider-dialog.png` 与 `mobile-provider-dialog.png`：渲染证据。

## 交接/Next

无需后续操作。Vercel 使用标准 `next build` 可完成部署构建。
