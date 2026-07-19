# LLM Info

LLM Info 是一个聚合大语言模型、供应商渠道、原生币种价格和 Quality 证据的 Next.js 应用。系统把同一基础模型在不同供应商下的渠道记录聚合为一个 `canonicalId`，同时保留每条原始报价和来源，便于比较价格并追溯数据。

仓库地址：<https://github.com/zhao-wuyan/llm-info>

## 当前功能

- **模型目录** `/models`：按 `canonicalId` 聚合模型，支持搜索、能力筛选、全量排序、分页和 USD/CNY 价格体系切换。
- **模型详情** `/models/<canonicalId>`：展示上下文、能力、Quality、展示价格、置信度、来源证据和供应商渠道。
- **供应商比较**：在模型详情内比较同一模型的不同供应商报价，支持币种切换、搜索、仅看有价格渠道和排序。
- **供应商目录** `/providers`：查看官方与第三方供应商、API 类型、模型数、币种覆盖和 Quality 覆盖。
- **数据来源** `/sources`：查看来源角色、记录数、观测时间、仓库及自动检测的 SPDX License。
- **模型对比** `/compare`：比较带 `AAIndex` 的模型质量、输入/输出/缓存价格、上下文和视觉能力。
- **界面偏好**：支持简体中文/英文、USD/CNY 和 system/light/dark 主题，设置保存在 Cookie 中。

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm ci
npm run dev
```

开发服务器默认运行在 <http://localhost:3000>，根路径会跳转到 `/models`。

生产运行：

```bash
npm run build
npm start
```

## 当前数据快照

以下统计来自 `data/models.json`，生成时间为 `2026-07-19T15:01:59.502Z`。数据会由自动化任务持续更新，最新值以文件中的 `generatedAt` 和 `stats` 为准。

| 指标 | 当前值 | 说明 |
| --- | ---: | --- |
| 数据源记录 | 10,853 | 4 个上游数据集的记录数合计 |
| 供应商 | 306 | 官方厂商和第三方渠道 |
| 渠道模型记录 | 10,007 | 保留供应商维度的 `models[]` 记录 |
| 聚合模型 | 7,665 | 按最终 `canonicalId` 去重 |
| 报价证据 | 9,960 | `pricing[]` 中保留的原始报价 |
| USD 渠道记录 | 8,038 | 存在原生 USD 展示报价 |
| CNY 渠道记录 | 696 | 存在原生 CNY 展示报价 |
| Quality 模型 | 22 | 映射到 `AAIndex` 的聚合模型 |
| Quality 渠道记录 | 189 | 附着 Quality 证据的渠道记录 |
| 已应用 alias | 76 | 1 条人工 alias + 75 条自动 alias |
| alias 候选 | 0 | 当前严格规则下无待审查候选 |

## 数据来源

| 数据源 | 角色 | 当前记录数 | License |
| --- | --- | ---: | --- |
| [LiteLLM](https://github.com/BerriAI/litellm) | USD 基准价格和模型信息 | 2,967 | MIT |
| [aidy-models](https://github.com/ImSingee/aidy-models) | CNY 主数据、供应商和模型元数据 | 7,188 | MIT |
| [model-price-hub](https://github.com/Microllin/model-price-hub) | 中国区渠道、区域和价格补充验证 | 676 | 未标注（`NOASSERTION`） |
| [ai-pricing](https://github.com/nuxdie/ai-pricing) | `AAIndex` Quality 外部证据 | 22 | MIT |

生成脚本通过 GitHub License API 检查每个来源仓库。`sources[].license` 保存 SPDX 类型，`licenseFile` 表示是否发现授权文件，`licenseUrl` 指向证据。只有明确的 404 会记为 `NOASSERTION`；限流或服务错误会中止生成，避免把请求失败误报为未授权。

## 数据模型

生成产物为 `data/models.json`，机器可读约束位于 `schemas/models.schema.json`。

```text
上游数据
  -> src/adapters/* 标准化
  -> alias 发现与 canonicalId 归并
  -> 价格、Quality 和来源证据合并
  -> src/validate.js 校验
  -> data/models.json
  -> lib/catalog.ts 聚合模型并计算展示价格置信度
  -> Next.js 页面
```

核心字段：

- `providers[]`：供应商或渠道资料，包括官网、文档、API 协议和来源引用。
- `models[]`：供应商维度的渠道模型；`id`、`providerId` 和 `modelId` 不因 canonical 聚合而丢失。
- `models[].canonicalId`：基础模型的聚合键，格式通常为 `owner/model-id`。
- `models[].pricing[]`：全部原始报价及币种、单位、区域、观测时间和来源，是价格证据的事实来源。
- `models[].displayPrices.USD/CNY`：从单个渠道模型的报价证据中选出的原生币种展示报价。
- `modelAliases[]`：生成时实际应用的人工和自动 alias。
- `modelAliasCandidates[]`：保留给未来审查流程；当前严格规则不会通过删除 model ID 分隔符生成候选。
- `quality`：来自 ai-pricing 的 `AAIndex`、来源模型、开发者、数据 revision 和观测时间。
- `sourceRefs[]`：模型、供应商和 Quality 证据的来源引用。

系统不做汇率换算。USD 和 CNY 分别使用上游原生报价；缺少对应币种时值为 `null`，界面显示 `-`。

## 展示价格与置信度

渠道模型保留自己的完整报价。聚合模型的 `displayPrices` 会从真实供应商报价中选择一条完整记录，不会把不同供应商的输入、输出或缓存费率拼接成一条虚构价格。

选择优先级：

1. **明确官方**：供应商或所选报价明确标记为官方，置信度固定为 `100`，优先级最高。
2. **推定官方**：没有明确标记时，根据 provider/owner 身份、域名、model ID、名称和多来源证据评分；达到 `80` 才进入推定官方层。
3. **供应商共识**：相同输入/输出价格签名得到越多独立供应商支持，置信度越高。
4. **辅助证据**：综合来源多样性、观测时间、费率完整度，并处罚缺少共识且偏离中位数的单供应商离群报价。

推定官方评分规则：

| 证据 | 分值 |
| --- | ---: |
| Provider 与 owner 身份匹配 | +60 |
| Provider 域名匹配 owner | +20 |
| `modelId` 包含 owner | +10 |
| 模型名称包含 owner | +5 |
| 同一渠道报价得到多个数据源支持 | +10 |

Provider 身份不匹配时推定分封顶为 `40`，因此 OpenRouter、Poe 等第三方渠道不会因为 model ID 中包含 `anthropic` 等 owner 名称而被误判为官方。

非官方价格共识的主要分值为：

```text
consensus = 60 * (1 - exp(-(providerCount - 1) / 1.5))
```

最终再叠加最多 15 分的来源多样性、15 分的新鲜度、10 分的完整度，以及最多 15 分的离群处罚。界面同时展示被选中的供应商、官方状态和置信度。

## Model Alias

### 为什么需要 alias

不同上游可能用不同 owner 或 model ID 表示同一模型，例如：

```text
anthropic/claude-opus-4.6
anthropic/claude-opus-4-6
```

如果不归并，这些记录会在模型目录中变成两个模型，第三方渠道条目的价格也可能被误读为该模型的主价格。Alias 只统一 `canonicalId`；原始 `providerId`、`ownerId`、`modelId`、`pricing[]` 和 `sourceRefs[]` 仍然保留。

### 两类 alias

1. **人工 alias**：维护在 `src/model-aliases.json`，优先于自动发现，用于人工确认映射、固定目标 canonical ID 或提供统一展示名称。当前文件只有 1 条：

   ```text
   anthropic/claude-opus-4.8 -> anthropic/claude-opus-4-8
   ```

2. **自动 alias**：每次生成数据时由 `src/model-alias-discovery.js` 扫描实际模型记录，写入 `data/models.json` 的 `modelAliases[]`。当前有 75 条。

因此，`src/model-aliases.json` 中只有 1 条，不代表实际只应用 1 条；当前生成数据实际应用 76 条。

### 自动识别边界

owner 和 model ID 使用不同规则：

| 部分 | 自动规则 | 示例 |
| --- | --- | --- |
| owner | 忽略 `.`、`-`、`_` 的插入、删除和替换 | `x-ai` = `xai`，`z-ai` = `zai` |
| model ID | 只允许相同位置、相同数量的 `.`、`-`、`_` 一对一替换 | `4.8` = `4-8` |
| model ID | 禁止插入或删除分隔符 | `4-8` != `48`，`qwen-3` != `qwen3` |

实现上，owner 会移除这些分隔符后比较；model ID 只把每一个现有分隔符替换成统一字符，不会压缩、插入或删除分隔符。因此版本结构不会因为 alias 扫描而丢失。

同一自动 alias 组的目标 canonical ID 按以下证据依次确定：

1. 官方直连模型记录数；
2. 官方报价数；
3. 独立数据源数；
4. 独立供应商数；
5. 渠道记录数；
6. canonical ID 字典序，作为确定性兜底。

任何不满足严格规则的映射都不会自动合并，也不会通过删除 model ID 分隔符进入候选；必须人工核实后加入 `src/model-aliases.json`。

### 审计 alias

```bash
npm run aliases
```

当前输出：

```text
Applied aliases: 76 (75 automatic)
Review candidates: 0
```

修改人工 alias 后应重新生成并验证：

```bash
npm run generate
npm run aliases
npm run validate
npm test
```

## Quality 证据

Quality 适配器只读取 ai-pricing 的 `AAIndex`、模型名和开发者，并通过显式映射关联到本地 `canonicalId`。它不会使用 ai-pricing 的价格、上下文或能力字段覆盖本地模型数据。

每条 Quality 证据保留：

- `sourceModel` 和 `sourceDeveloper`；
- `aaIndex`；
- 数据文件 commit `revision`；
- `observedAt`；
- 对应的 `sourceRefs`。

新增但未映射的 Quality 模型会计入 `stats.unmatchedQualityModels`，不会被静默忽略。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发服务器 |
| `npm run build` | 类型检查并构建生产应用 |
| `npm start` | 启动已构建的生产应用 |
| `npm run generate` | 拉取 4 个上游并生成 `data/models.json` |
| `npm run aliases` | 审计已应用 alias 和候选 |
| `npm run validate` | 校验生成数据的引用、报价、Quality 和 alias 完整性 |
| `npm run test:data` | 运行 Node.js 数据管线测试 |
| `npm run test:ui` | 运行 Vitest 组件和目录逻辑测试 |
| `npm test` | 运行数据测试和 Vitest 测试 |
| `npm run test:e2e` | 运行桌面端、移动端和无障碍 Playwright 测试 |

`npm run test:e2e` 使用生产服务器，首次执行前应先运行 `npm run build`。

生成数据会访问 GitHub API。可设置 `GITHUB_TOKEN` 提高 API 限额：

```powershell
$env:GITHUB_TOKEN = "<token>"
npm run generate
```

## 自动更新

`.github/workflows/update-model-data.yml` 每天 `09:37 UTC`（北京时间 `17:37`）运行，也支持手工触发。工作流会：

1. 运行测试；
2. 拉取并生成最新模型数据；
3. 校验生成产物；
4. 将数据统计和 alias 扫描写入 Job Summary；
5. 仅在模型、价格、Quality、License 或 alias 等有效数据发生变化时创建更新 PR。

生成器忽略 `generatedAt`、观测时间和 Quality revision 等纯时间元数据的变化，避免无业务变化的更新 PR。

## 项目结构

```text
app/                         Next.js 页面和路由
components/                  表格、对话框、导航和交互组件
lib/catalog.ts               canonical 模型聚合
lib/price-confidence.ts      展示价格置信度与官方推定
lib/model-aliases.ts         页面侧 alias 解析
src/adapters/                上游数据适配器
src/model-alias-discovery.js 自动 alias 发现
src/model-aliases.json       人工确认的 alias 表
src/merge.js                 数据合并和生成字段
src/validate.js              数据完整性校验
scripts/                     生成、校验和 alias 审计命令
schemas/models.schema.json   机器可读数据约束
data/models.json             生成的数据快照
tests/                       Vitest 和 Playwright 测试
test/                        Node.js 数据管线测试
```
