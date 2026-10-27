# hkustgz-cli

## 简单介绍

面向香港科技大学（广州）学生的校园服务命令行工具。希望把分散在不同系统里的课程、课表、通知和作业，变成终端里可以直接查询的命令，也方便 Agent 调用。

工具在用户电脑上运行，使用本人的学校账号和专用浏览器会话，查询结果直接来自学校使用的服务。支持 JSON 和表格输出，首期只做查询。

这是非官方项目，目前为 `0.1.0-alpha.1`：前五个开发模块已验收，**课程目录（Catalog）的搜索与详情已可用**；SIS 学期、本人计划课表与今日课程已验收；第六模块 Portal 查询已实现，等待审查。作业查询仍待开发。项目尚未发布到 npm。

## 快速开始

### 环境准备

- Node.js **24.x** 和 npm。
- 本机已安装 Google Chrome。当前已在 macOS 验证，Windows/Linux 尚未完成实机验收。
- 进入本地 `hkustgz-cli` 项目目录。

安装依赖并构建：

```bash
npm ci
npm run build
node bin/hkustgz-cli.mjs --help
```

安装依赖不会下载浏览器或发起学校登录。当前请使用本地入口运行。

### 查询一门课

Catalog 使用公开课程目录，可以先不登录试用：

```bash
# 检查浏览器和当前能力
node bin/hkustgz-cli.mjs browser status
node bin/hkustgz-cli.mjs capabilities --format table

# 搜索课程，默认输出 JSON
node bin/hkustgz-cli.mjs catalog search AIAA5032

# 按指定学期搜索，输出表格
node bin/hkustgz-cli.mjs catalog search AIAA5032 --term '2026-27 Fall' --format table

# 使用搜索结果中的 id 查看完整详情
node bin/hkustgz-cli.mjs catalog course '2026-27 Fall:AIAA5032' --format table
```

学期名称使用来源标签，课程是否开设以当次查询为准。搜索最多扫描 **20 个学科批次 / 2000 门源课程**；未扫描完整时会标记 `partial`、说明截断原因，并以 **7** 退出。课程名额通常每 15–20 分钟更新。

### 本人计划课表

```bash
node bin/hkustgz-cli.mjs auth login sis
node bin/hkustgz-cli.mjs sis terms --format table
node bin/hkustgz-cli.mjs sis timetable --format table
node bin/hkustgz-cli.mjs sis today --format table
```

`--term` 使用 `sis terms` 返回的来源 ID，例如 `2610`。未提供时使用学校确认的当前学期；无法确认时要求显式选择。今日课程按上海时区筛选计划，不保证临时调课或取消已反映。

### Portal 查询（第六模块待审）

```bash
node bin/hkustgz-cli.mjs portal apps --format table
node bin/hkustgz-cli.mjs portal notices --query "keyword" --format table
node bin/hkustgz-cli.mjs portal notice '<列表返回的source:id>'
node bin/hkustgz-cli.mjs portal agenda --from 2026-10-27 --to 2026-11-03 --format table
```

公告搜索匹配已读取的标题和分类。真实全分类扫描目前在第三来源遇到未确认结构，保留前两来源8条并返回 `partial`/退出7；不代表全校公告全量。详情支持已确认的校内文章正文，外部钉钉链接需在官方入口查看。日程按来源保留；原始事件ID缺失为 `null`，相似事件只标记，不删除。

### 登录与会话检查

```bash
node bin/hkustgz-cli.mjs browser use chrome
node bin/hkustgz-cli.mjs auth login portal
node bin/hkustgz-cli.mjs auth status --all --format table

# 清理本工具保存的本地登录会话
node bin/hkustgz-cli.mjs auth logout
```

登录会打开专用浏览器窗口，由本人完成认证。会话默认保存在 `~/.hkustgz-cli`，也可以通过 `HKUSTGZ_CLI_HOME` 指定新的空绝对目录。工具不读取日常浏览器的 Cookie；同一 profile 同时只允许一个 CLI 进程使用。

Portal、SIS、Canvas 的认证状态已支持检查和复用。Catalog 是公开目录，其认证状态为 `unknown` 不影响公开查询；Booking 和图书馆预约系统的认证仍待验证。**登录成功不代表对应业务查询已经接通**，以 `capabilities` 为准。

## 功能

### 当前可用

| 功能 | 说明 |
|---|---|
| 课程搜索 | 按代码、标题、教师或助教匹配，支持指定学期和返回条数 |
| 学期与课表 | `sis terms`、`sis timetable [--term <id>]`、`sis today [--date YYYY-MM-DD]`；计划课表，调课/取消覆盖未知，学分为空 |
| 课程详情 | 查询学分、班次、上课日期与时间、地点、教师及来源名额 |
| Portal（第六模块待审） | 应用、公告列表/校内正文、分来源日程；公告全分类当前返回 partial，外部详情不支持 |
| 浏览器与认证 | 浏览器检测和选择、专用会话、Portal/SIS/Canvas 登录与状态检查、本地退出登录 |
| 结构化输出 | JSON / table，明确返回读取数量、覆盖范围及截断原因 |
| 查询基础层 | 超时预算、有限重试、分页上限、部分结果保留和凭据脱敏 |
| 能力清单 | 逐项显示业务能力是否已验证，未接通的命令返回 `CAPABILITY_PENDING`（退出码 8） |

Catalog 的课程与班次来自同一份完整、绑定目标学期的响应批次，学科全集也按目标学期校验。当前未启用运行时缓存。

### 后续计划

| 模块 | 计划能力 | 当前状态 |
|---|---|---|
| SIS | 学期、课表、今日课程已验收；课程历史与成绩仍 pending | 第五模块已验收 |
| Portal | 应用、公告列表/详情、日程已实现；来源覆盖限制见下文 | 第六模块待审 |
| Canvas | 课程、公告、作业、日程 | 待开发 |
| Booking | 分类发现、图书馆房间、可用时段、本人预约记录 | 待开发 |
| 发行支持 | doctor、浏览器安装、跨平台及安装验收 | 待开发 |

目前 **9/19 项业务能力已验证**（Portal 四项所属模块待审）。不提供选退课、提交作业、预约或取消等写入操作。每个模块完成后先审查验收，再进入下一个模块。

### 开发与文档

```bash
npm test                         # 包含构建；默认不启动浏览器
npm run typecheck
HKUSTGZ_TEST_BROWSER=1 npm test   # 本机 Chrome 合成页面测试，不登录学校
```

- [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md)
- [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md) · [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md)
- 验收记录：[CLI 基础](docs/acceptance/cli-foundation.md) · [认证](docs/acceptance/session-auth.md) · [查询基础层](docs/acceptance/query-core.md) · [Catalog](docs/acceptance/catalog.md) · [SIS](docs/acceptance/sis.md) · [Portal](docs/acceptance/portal.md)
- [读取证据索引](docs/research/evidence-index.json) · [会话复用验证](docs/acceptance/session-reuse.md)
- [Git 阶段记录与验收标签](docs/git-history.md)

## 灵感来源

本项目的直接灵感来自 [AwesomeHou/szu-cli](https://github.com/AwesomeHou/szu-cli)：将校园系统中的常用查询整理成独立 CLI，让终端用户和 Agent 都能使用。

`hkustgz-cli` 借鉴其命令行产品形式和分层适配思路，围绕港科广的实际系统独立开发，逐项核实登录、数据来源和查询完整性。相关设计取舍记录在[技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md)中。
