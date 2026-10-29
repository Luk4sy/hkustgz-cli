# hkustgz-cli

## Alpha 安装与 Codex 使用

许可证采用[MIT](LICENSE)。macOS＋Chrome已有验收证据；新增Windows11＋Chrome＋Node24＋Codex适配候选`0.1.0-alpha.2`，实机尚待验证。Windows步骤见[候选指南](docs/windows.md)，Linux不在范围。

目前提供13项已验证的只读查询（Catalog/SIS/Portal/Canvas），另6项仍pending；具体范围以`hkustgz-cli capabilities`为准。未发布npm，也未完成第二名学生验收。完整安装、升级和卸载见[安装指南](docs/installation.md)。

```bash
npm install --global '/absolute/path/hkustgz-cli-0.1.0-alpha.2.tgz'
hkustgz-cli doctor
hkustgz-cli capabilities
hkustgz-cli skill install --target codex --dry-run
hkustgz-cli skill install --target codex
```

tgz需由维护者确认后交付。CLI安装不会自动写Skill或启动学校登录。安装Skill后刷新Codex，使用`$hkustgz-cli 查公开课程AIAA5032`；私人查询先由本人在专用窗口正常认证。版本必须与随包Skill精确一致；升级CLI后需显式同步Skill。

Agent使用默认JSON，保留partial的可信子集，说明截断范围；unknown不等于未交/已交，Planner不代表全部作业。全部学校查询只读，不支持成绩、选退课、提交作业或创建预约。[第四批验收记录](docs/acceptance/alpha-agent.md)区分客户端发现、合成场景与真实查询。

面向香港科技大学（广州）学生的非官方校园命令行工具。在终端里查课程、课表、公告和作业，也方便 Agent 调用。

工具在本机运行，使用本人的学校账号查询，支持 JSON 和表格输出。目前只提供查询功能，不支持选退课、提交作业或预约。

> 当前版本为 `0.1.0-alpha.2`，尚未发布到 npm。已在 macOS + Chrome 上验证，Windows / Linux 尚未完成实机验收。

## 目前能做什么

| 系统 | 已实现的查询 |
|---|---|
| Catalog 课程目录 | 搜索课程、查看课程详情和班次 |
| SIS 教务系统 | 学期、本人计划课表、今日课程 |
| Portal 校园门户 | 应用入口、公告列表与校内正文、日程 |
| Canvas 教学平台 | 当前课程、课程公告、作业、Planner 日程 |

Catalog 和 SIS 已验收；Portal 已实测并进入后续开发；Canvas 四项查询已通过用户复审验收。SIS 课程历史与成绩、Booking 和图书馆预约查询尚未接通。

## 快速开始

需要 **Node.js 24.x、npm 和本机 Google Chrome**。在项目目录安装依赖并构建：

```bash
npm ci
npm run build
node bin/hkustgz-cli.mjs --help
```

源码开发可使用上面的本地入口；安装 tgz 后可直接运行 `hkustgz-cli`。安装依赖不会下载浏览器，也不会发起学校登录。

### 先查一门课

课程目录是公开的，无需登录：

```bash
node bin/hkustgz-cli.mjs catalog search AIAA5032 --format table

# 按学期搜索
node bin/hkustgz-cli.mjs catalog search AIAA5032 --term '2026-27 Fall' --format table

# 使用搜索结果中的 id 查看详情
node bin/hkustgz-cli.mjs catalog course '2026-27 Fall:AIAA5032' --format table
```

### 登录学校账号

```bash
node bin/hkustgz-cli.mjs browser use chrome
node bin/hkustgz-cli.mjs auth login sis
node bin/hkustgz-cli.mjs auth status --all --format table
```

登录会打开专用浏览器窗口，由本人完成认证。查询 Portal 或 Canvas 时，将登录命令中的 `sis` 换成 `portal` 或 `canvas`。

会话默认保存在 `~/.hkustgz-cli`，不读取日常浏览器的 Cookie。同一会话目录一次只能运行一个 CLI 进程。清理本工具保存的登录会话：

```bash
node bin/hkustgz-cli.mjs auth logout
```

### 常用查询

```bash
# 学期与本人计划课表
node bin/hkustgz-cli.mjs sis terms --format table
node bin/hkustgz-cli.mjs sis timetable --format table
node bin/hkustgz-cli.mjs sis today --format table

# 校园门户
node bin/hkustgz-cli.mjs portal apps --format table
node bin/hkustgz-cli.mjs portal notices --query 'keyword' --format table
node bin/hkustgz-cli.mjs portal notice '<列表返回的source:id>'
node bin/hkustgz-cli.mjs portal agenda --format table

# Canvas：先查课程，再使用返回的课程 ID
node bin/hkustgz-cli.mjs canvas courses --format table
node bin/hkustgz-cli.mjs canvas assignments --course '<课程ID>' --format table
node bin/hkustgz-cli.mjs canvas announcements --course '<课程ID>' --format table
node bin/hkustgz-cli.mjs canvas agenda --format table
```

默认输出 JSON，适合脚本和 Agent；加 `--format table` 可在终端查看表格。更多参数可通过各命令的 `--help` 查看。

## 使用时留意

- **课表是计划安排**：临时调课或取消可能未反映。指定学期时，使用 `sis terms` 返回的 ID；今日课程按上海时区筛选。
- **公告覆盖有限**：Portal 目前只确认读取到前两个来源的 8 条公告，会返回 `partial`，不代表全校公告。外部链接的正文需到官方入口查看。
- **作业信息可能不完整**：Canvas 的个人截止时间来源和提交状态无法确认时标为 `unknown`；Planner 日程只包含所选时间窗口内的可见项，不代表全部作业，“标记完成”也不等于“已提交”。
- **部分结果会明确标注**：查询受分页和读取上限约束。返回 `partial` 时请查看截断原因，退出码为 `7`；尚未接通的能力返回 `CAPABILITY_PENDING`，退出码为 `8`。

查看当前能力状态：

```bash
node bin/hkustgz-cli.mjs capabilities --format table
```

## 开发与文档

```bash
npm test                         # 包含构建，默认不启动浏览器
npm run typecheck
HKUSTGZ_TEST_BROWSER=1 npm test   # 本机 Chrome 合成页面测试，不登录学校
```

- [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md) · [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md) · [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md)
- 验收记录：[CLI 基础](docs/acceptance/cli-foundation.md) · [认证](docs/acceptance/session-auth.md) · [查询基础层](docs/acceptance/query-core.md) · [Catalog](docs/acceptance/catalog.md) · [SIS](docs/acceptance/sis.md) · [Portal](docs/acceptance/portal.md) · [Canvas](docs/acceptance/canvas.md)
- [读取证据索引](docs/research/evidence-index.json) · [会话复用验证](docs/acceptance/session-reuse.md) · [Canvas 认证记录](docs/acceptance/canvas-auth.md) · [Git 阶段记录](docs/git-history.md)

## 灵感来源

本项目受 [AwesomeHou/szu-cli](https://github.com/AwesomeHou/szu-cli) 启发，借鉴其命令行形式和分层适配思路，围绕港科广的实际系统独立开发。
