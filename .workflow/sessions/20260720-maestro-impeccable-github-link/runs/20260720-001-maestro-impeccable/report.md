---
verdict: ready
summary: "应用已在桌面侧栏和移动导航抽屉增加本项目 GitHub 外链，并完成可访问性、响应式和外链属性验证。"
constraints:
  - id: global-repository-access
    text: "项目 GitHub 入口必须在桌面侧栏和移动导航抽屉中均可访问。"
    status: locked
  - id: safe-external-link
    text: "外链必须提供本地化可访问名称，并使用 target=_blank 与 rel=noreferrer。"
    status: locked
decisions:
  - id: secondary-sidebar-placement
    text: "GitHub 入口放在侧栏底部、数据状态上方，作为次级项目链接，不占用顶部高频工具栏。"
    status: accepted
concerns: []
next: []
---
# 全局项目 GitHub 入口

## 结果

- 在桌面侧栏底部增加 GitHub 外链，地址为 `https://github.com/zhao-wuyan/llm-info`。
- 移动端导航抽屉复用同一入口，并在点击后关闭抽屉。
- 使用 Lucide `Github` 与 `ExternalLink` 图标、可见 `GitHub` 文案和中英文可访问名称。
- 外链使用 `target="_blank"` 与 `rel="noreferrer"`，保留现有 focus-visible 样式和粗指针 44px 点击目标。

## 验证

- `npm test`：15 个数据测试、21 个 UI 单测通过。
- `NEXT_DIST_DIR=.next-github-link-verify npm run build`：通过。
- 正式 E2E 用例通过：desktop、mobile 共 2 个项目。
- Playwright 实际检查 1440x900 桌面视口与 390x844 移动视口：链接可见、属性正确、无 document 级横向溢出、无请求失败或运行时错误。
- 已检查桌面侧栏和移动抽屉截图，未发现遮挡、截断或布局偏移。

## 规范

- 新增 `S-20260720-agyi`：全局项目 GitHub 入口。
