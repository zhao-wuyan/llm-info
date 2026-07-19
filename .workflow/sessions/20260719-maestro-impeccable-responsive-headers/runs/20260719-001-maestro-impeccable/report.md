---
session_id: 20260719-maestro-impeccable-responsive-headers
run_id: 20260719-001-maestro-impeccable
status: ready
verdict: ready
summary: 价格表头已改为短主标题加币种 subtitle，窄屏表格采用弹性首列、多行实体文本和局部横向滚动。
concerns: []
---

# 价格表头与响应式表格适配

所有价格表格使用“输入、输出、缓存读、缓存写”主标题，USD/CNY 在第二行以小号次级文字显示。desktop 列宽保持不变；小于 900px 时，各表首列和数据列使用更紧凑的响应式宽度，名称与 ID 可多行换行，无法继续收紧时由局部表格容器横向滚动。

## 验证

- `npm test`：30 项通过。
- `npx tsc --noEmit`：通过。
- 独立 `NEXT_DIST_DIR` production build：通过。
- Playwright：23 项通过，1 项按 desktop 条件跳过。
- 1440px desktop 与 Pixel 7 mobile 截图已回读，确认表头层级、首列换行、横向滚动与整页无溢出。
