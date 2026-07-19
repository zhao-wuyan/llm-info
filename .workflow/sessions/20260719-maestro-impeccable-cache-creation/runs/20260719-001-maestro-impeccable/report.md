---
session_id: 20260719-maestro-impeccable-cache-creation
run_id: 20260719-001-maestro-impeccable
status: ready
verdict: ready
summary: 模型详情供应商预览与多供应商对比弹框已补齐四类当前币种价格、三态排序和响应式验证。
concerns: []
---

# 缓存创建价展示补齐

模型详情页供应商预览与多供应商对比弹框现已统一展示当前币种的输入价、输出价、缓存读取价和缓存创建价。四类价格均支持三态排序，缺价继续显示 `-` 并置底；来源与观测时间保持原样。

## 验证

- `npm test`：30 项通过。
- `npx tsc --noEmit`：通过。
- 独立 `NEXT_DIST_DIR` 生产构建：通过。
- Playwright：23 项通过，1 项按 desktop 条件跳过。
- desktop/mobile 截图回读：固定列宽、弹框定位、局部横向滚动与整页无溢出均符合现有规范。
