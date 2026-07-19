---
title: "Debug Notes"
readMode: optional
priority: medium
category: debug
keywords:
  - debug
  - issue
  - workaround
  - root-cause
  - gotcha
---

# Debug Notes

## Entries



<spec-entry category="debug" keywords="nextjs,playwright,next_dist_dir,build_id" date="2026-07-19" sid="S-20260719-lb5g" title="Next.js 并行服务隔离构建目录" description="并行 Next.js 服务下隔离生产验证目录" source="main@63e82c7">

### Next.js 并行服务隔离构建目录

仓库已有 next dev 进程时，production build 与 Playwright webServer 验证 MUST 使用独立 NEXT_DIST_DIR；MUST NOT 复用默认 .next，因为并行 dev 进程可能移除 BUILD_ID 并导致 next start 报 production-start-no-build-id 或 Playwright webServer 超时。

</spec-entry>