<p align="center">
  <img src="docs/assets/hkustgz-cli-logo.png" width="220" height="220" alt="hkustgz-cli：红鸟日晷与终端提示符组成的图标">
</p>

<h1 align="center">hkustgz-cli</h1>

<p align="center"><strong>把港科广校园信息带进终端与 Codex。</strong></p>

<p align="center">
  <code>0.1.0-alpha.2</code> · <a href="LICENSE">MIT</a> · 本机运行 · 校园业务只读
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#codex-集成">Codex 集成</a> ·
  <a href="#隐私与查询边界">查询边界</a> ·
  <a href="#文档导航">文档</a>
</p>

面向香港科技大学（广州）学生的非官方校园命令行工具。查询课程、课表、公告和作业，在终端查看表格，或把 JSON 结果交给脚本与 Agent。

```bash
hkustgz-cli catalog search AIAA5032 --format table
```

> **Alpha 阶段**：尚未发布到 npm，独立学生试用仍待完成。macOS + Chrome 已有实测记录；Windows 11 适配候选待真机验证，Linux 暂不支持。

## 核心能力

| 系统 | 可以完成的任务 | 当前范围 |
| --- | --- | --- |
| **Catalog** | 搜索课程，查看详情、班次和来源名额 | 公开查询，无需登录；名额非实时 |
| **SIS** | 查看学期、本人计划课表和今日课程 | 计划安排，临时调整未核实 |
| **Portal** | 查应用入口、公告、校内正文和日程 | 公告来源覆盖有限，外部正文不支持 |
| **Canvas** | 查当前课程、课程公告、作业和 Planner 日程 | 个人截止时间、提交状态可能无法确认 |
| **Codex** | 用自然语言调用上述 CLI 查询 | 提供随包 Skill，需显式安装并匹配版本 |

四个校园系统共 **13 项查询已有验证记录**。SIS 课程历史、成绩，以及 Booking 的供应系统、房间、可用时段、本人预约记录，共 6 项能力尚未接通。验证通过不代表所有账号权限或来源覆盖都相同。

查看逐项能力状态：

```bash
hkustgz-cli capabilities --format table
```

## 快速开始

### 1. 准备与安装

需要 **Node.js 24.x、npm 和 Google Chrome**。取得维护者确认的 `0.1.0-alpha.2` 安装包及校验值后，核对文件，从本地绝对路径安装：

```bash
npm install --global '/absolute/path/hkustgz-cli-0.1.0-alpha.2.tgz'
hkustgz-cli --version
hkustgz-cli doctor
```

将示例路径替换为实际文件路径。安装不会下载浏览器、发起学校登录或写入 Skill；`doctor` 只检查运行环境，不访问学校，也不代表已经登录。

以上为 macOS 命令。Windows 候选请使用 [PowerShell 与 `.cmd` 入口指南](docs/windows.md)；升级、卸载和路径配置见[安装指南](docs/installation.md)。

### 2. 查询公开课程

课程目录无需学校登录，但仍需要本机 Chrome：

```bash
hkustgz-cli catalog search AIAA5032 --format table

# 将占位内容替换为搜索结果中的 id
hkustgz-cli catalog course '<搜索结果中的id>' --format table
```

### 3. 登录并查看课表

在弹出的专用浏览器窗口中，由本人完成学校认证：

```bash
hkustgz-cli auth login sis
hkustgz-cli sis timetable --format table
hkustgz-cli sis today --format table
```

需要指定学期时，先用 `hkustgz-cli sis terms --format table` 获取学期 ID，再传给 `sis timetable --term <id>`。

### 4. 查询公告或作业

按需登录对应系统。Canvas 作业使用课程列表返回的课程 ID：

```bash
hkustgz-cli auth login portal
hkustgz-cli portal notices --format table

hkustgz-cli auth login canvas
hkustgz-cli canvas courses --format table
hkustgz-cli canvas assignments --course '<课程ID>' --format table
```

**输出方式**：默认 JSON，便于脚本和 Agent 读取；`--format table` 用于终端阅读，两者保留相同的数据与查询范围。更多命令及参数见 `hkustgz-cli --help` 和各子命令的 `--help`。

## Codex 集成

随包 Skill 为 Codex 提供命令选择、认证提示和结果解释规则，实际查询由本机 CLI 执行。

确认 CLI 已在 Codex 可用的 `PATH` 中，再预览并安装 Skill：

```bash
hkustgz-cli skill install --target codex --dry-run
hkustgz-cli skill install --target codex
hkustgz-cli skill status
```

刷新或重启 Codex 后，显式使用 `$hkustgz-cli` 调用：

```text
$hkustgz-cli 查一下 AIAA5032 的课程信息
$hkustgz-cli 看看我今天的课表
```

私人查询仍需本人在学校认证窗口登录。**CLI 与 Skill 版本必须精确一致**；升级 CLI 后，再运行 `skill install --target codex` 同步。`skill status` 检查安装文件状态，不代表当前 Codex 会话已经发现 Skill；浏览器执行还取决于客户端权限，不能以安装成功代替实际调用验证。

## 隐私与查询边界

**本机与认证。** 使用专用浏览器会话，不读取日常浏览器的 Cookie。登录由本人完成，无需在聊天中提供密码、验证码或 Token。会话默认保存在 `~/.hkustgz-cli`，同一会话目录的浏览器命令需串行运行。`hkustgz-cli auth logout` 清理本工具保存的登录会话，不代表学校所有设备全局退出。

**只读校园业务。** 不选退课、不提交作业、不创建或取消预约，也不修改公告已读或 Planner 状态。Skill 安装与卸载属于显式的本地文件操作。

**按来源理解结果。**

- **SIS**：课表是计划安排，不保证包含临时调课、补课或取消；今日课程按 `Asia/Shanghai` 日期筛选。
- **Portal**：当前公告扫描只保留前两个已确认来源的 8 条，返回 `partial`，不代表全校公告。外部链接正文需在官方入口查看。
- **Canvas**：无法确认个人有效截止时间或提交证据时保留 `unknown`，不能据此判断已交、未交或无截止日期。Planner 仅代表所选时间窗口的可见项，不是全部作业；“标记完成”不等于“已提交”。

| 状态 | 如何理解 |
| --- | --- |
| `partial` / 退出码 `7` | 只取得部分结果；保留可信数据，同时查看覆盖范围和截断原因 |
| `unknown` / `null` | 该字段尚无法确认，不能当成否定或空记录 |
| `CAPABILITY_PENDING` / 退出码 `8` | 查询能力尚未接通，不是查询结果为空 |

完整字段语义见 [CLI 输出协议](docs/cli-contract.md)，登录、限流和会话占用等问题见[错误处理](docs/errors.md)。

## 开发

在源码目录运行：

```bash
npm ci
npm run build
node bin/hkustgz-cli.mjs --help
npm test
npm run typecheck
```

`npm test` 包含构建，默认不启动浏览器。可选的 Chrome 合成页面测试不登录学校；`npm pack` 会重新构建并生成本地安装包：

```bash
HKUSTGZ_TEST_BROWSER=1 npm test
npm pack
```

## 文档导航

| 用途 | 文档 |
| --- | --- |
| 安装与平台 | [安装、升级与卸载](docs/installation.md) · [Windows 11 候选试用](docs/windows.md) |
| 命令与结果 | [完整命令参考](skills/hkustgz-cli/references/commands.md) · [CLI 输出协议](docs/cli-contract.md) · [错误处理](docs/errors.md) |
| Codex 与隐私 | [随包 Skill 指引](skills/hkustgz-cli/SKILL.md) · [隐私说明](skills/hkustgz-cli/references/privacy.md) |
| 开发与设计 | [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md) · [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md) · [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md) |
| 查询验收 | [Catalog](docs/acceptance/catalog.md) · [SIS](docs/acceptance/sis.md) · [Portal](docs/acceptance/portal.md) · [Canvas](docs/acceptance/canvas.md) |
| Alpha 与平台验证 | [交付准备](docs/acceptance/alpha-release.md) · [独立学生验收](docs/acceptance/alpha-students.md) · [Codex 调用记录](docs/acceptance/alpha-agent.md) · [Windows 验证记录](docs/acceptance/windows-alpha.md) |

验收记录保留各阶段的版本与验证环境；当前功能以本版本的 `capabilities` 输出和上述范围说明为准。

## 灵感与许可

受 [AwesomeHou/szu-cli](https://github.com/AwesomeHou/szu-cli) 启发，借鉴其命令行产品形式和分层适配思路，围绕港科广的实际系统独立开发。

本项目采用 [MIT 许可证](LICENSE)，是非官方项目。
