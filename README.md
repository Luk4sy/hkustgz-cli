<p align="center">
  <img src="docs/assets/hkustgz-cli-logo.png" width="220" height="220" alt="hkustgz-cli：红鸟日晷与终端提示符组成的图标">
</p>

<h1 align="center">hkustgz-cli</h1>

<p align="center"><strong>把港科广校园信息带进终端与 Codex。</strong></p>

<p align="center">
  <a href="docs/installation.md"><img src="docs/assets/badges/version.svg" alt="版本 0.1.0-alpha.6"></a>
  <a href="LICENSE"><img src="docs/assets/badges/license.svg" alt="MIT 许可证"></a>
  <a href="docs/installation.md"><img src="docs/assets/badges/node.svg" alt="需要 Node.js 24"></a>
  <a href="#codex-集成"><img src="docs/assets/badges/codex.svg" alt="提供 Codex Skill"></a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#codex-集成">Codex 集成</a> ·
  <a href="#隐私与查询边界">查询边界</a> ·
  <a href="#文档导航">文档</a>
</p>

面向香港科技大学（广州）学生的非官方校园命令行工具。查询课程、课表、公告、作业和图书馆房间，在终端查看表格，或把 JSON 结果交给脚本与 Agent。

```bash
hkustgz-cli catalog search AIAA5032 --format table
```

> **Alpha 阶段**：当前版本为 `0.1.0-alpha.6`，CLI 与 Skill 已完成本地同步，尚未发布到 npm。macOS + Chrome 已有实测记录；Windows 已有旧版验证记录，alpha.6 的 Windows 升级和回归待验证。Linux 暂不支持。

## 核心能力

| 系统 | 可以完成的任务 | 当前范围 |
| --- | --- | --- |
| **Catalog** | 搜索课程，查看详情、班次和来源名额 | 公开查询，无需登录；名额非实时 |
| **SIS** | 查看学期、本人计划课表和今日课程 | 计划安排，临时调整未核实 |
| **Portal** | 查应用入口、公告、校内正文和日程 | 公告来源覆盖有限，外部正文不支持 |
| **Canvas** | 查当前课程、课程公告、作业和 Planner 日程 | 个人截止时间、提交状态可能无法确认 |
| **Booking / Library** | 查预约入口、图书馆房间、指定日开放与占用、本人预约记录 | 可查询，不保证可订；本人记录仅覆盖来源默认状态 |
| **Codex** | 用自然语言调用 CLI，解释结果与查询范围 | 提供随包 Skill，需显式安装并匹配版本 |

目前有 **17 项已验证的校园查询**和 **5 项图书馆实验能力**，包括详情、创建预览、创建、取消预览和取消。四楼 403 已完成一次本人单人预约和取消实测，适用范围为已验证的四楼研修间规则。多人预约暂缓，SIS 课程历史和成绩仍为 `pending`。

其他预约供应商目前只提供入口信息。已验证表示读取路线有验证记录，不保证所有账号权限或来源覆盖都相同。

查看逐项能力状态：

```bash
hkustgz-cli capabilities --format table
```

## 快速开始

### 1. 准备与安装

需要 **Node.js 24.x、npm 和 Google Chrome**。取得维护者提供的 `0.1.0-alpha.6` 安装包及SHA-256校验值，核对文件后从本地绝对路径安装：

```bash
npm install --global '/absolute/path/hkustgz-cli-0.1.0-alpha.6.tgz'
hkustgz-cli --version
hkustgz-cli doctor
```

将示例路径替换为实际文件路径。安装不会下载浏览器、发起学校登录或写入 Skill；`doctor` 只检查运行环境，不访问学校，也不代表已经登录。

以上为 macOS 命令。Windows 请使用 [PowerShell 与 `.cmd` 入口指南](docs/windows.md)；升级、卸载和路径配置见[安装指南](docs/installation.md)。

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

### 5. 查询和预约图书馆房间

先查看房间目录，使用返回的房间 ID 查询指定日期的开放与占用情况：

```bash
hkustgz-cli booking providers --format table
hkustgz-cli booking rooms --provider library --format table
hkustgz-cli booking availability --provider library --room '<房间ID>' --date YYYY-MM-DD --format table
hkustgz-cli booking mine --provider library --format table
```

将 `YYYY-MM-DD` 换成实际查询日期。图书馆查询沿用专用会话中的学校 SSO；若提示需要登录，先执行 `hkustgz-cli auth login portal`，由本人完成认证后再查。当前不支持单独执行 `auth login booking-library`。

开放、未占用不等于符合预约条件；可订时段为空也不代表没有空闲，具体限制见[查询边界](#隐私与查询边界)。

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
$hkustgz-cli 列出图书馆的房间
$hkustgz-cli 帮我预览图书馆四楼 403 的本人预约
```

私人查询仍需本人在学校认证窗口登录。**CLI 与 Skill 版本必须精确一致**；升级 CLI 后，再运行 `skill install --target codex` 同步。`skill status` 检查安装文件状态，不代表当前 Codex 会话已经发现 Skill；浏览器执行还取决于客户端权限，不能以安装成功代替实际调用验证。

## 隐私与查询边界

**本机与认证。** 使用专用浏览器会话，不读取日常浏览器的 Cookie。登录由本人完成，无需在聊天中提供密码、验证码或 Token。会话默认保存在 `~/.hkustgz-cli`，同一会话目录的浏览器命令需串行运行。`hkustgz-cli auth logout` 清理本工具保存的登录会话，不代表学校所有设备全局退出。

**图书馆预约和取消。** 创建和取消各有一份预览，各需确认后提交一次。学校最终校验额度、权限和冲突。结果为 `unknown` 时，用 `booking operation <操作ID> --refresh` 只读核对。完整流程见[图书馆操作示例](skills/hkustgz-cli/references/examples.md)。

**按来源理解结果。**

- **SIS**：课表是计划安排，不保证包含临时调课、补课或取消；今日课程按 `Asia/Shanghai` 日期筛选。
- **Portal**：当前公告扫描只保留前两个已确认来源的 8 条，返回 `partial`，不代表全校公告。外部链接正文需在官方入口查看。
- **Canvas**：无法确认个人有效截止时间或提交证据时保留 `unknown`，不能据此判断已交、未交或无截止日期。Planner 仅代表所选时间窗口的可见项，不是全部作业；“标记完成”不等于“已提交”。

- **图书馆**：`availability` 提供开放与占用信息；`rulesCoverage=unknown` 时，`availableIntervals=[]` 只表示尚不能确认可订。`mine` 仅覆盖来源默认的 `8454` 状态筛选，不是全部预约历史。图书馆通用认证状态仍可能显示 `unknown`，应以实际查询结果判断是否需要登录。

| 状态 | 如何理解 |
| --- | --- |
| `partial` / 退出码 `7` | 只取得部分结果；保留可信数据，同时查看覆盖范围和截断原因 |
| `unknown` / `null` | 该字段尚无法确认，不能当成否定或空记录 |
| `CAPABILITY_PENDING` / 退出码 `8` | 该能力尚未开放，不表示查询结果为空或操作已经执行 |

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

升级回归测试会读取 alpha.3 提交 `3be2d3b`，浅克隆需先补齐 Git 历史。安装与升级测试使用临时目录，不更新日常 CLI / Skill，也不访问学校。

[CI 配置](.github/workflows/ci.yml)包含 macOS 的 Chrome 合成测试、Windows 的命令契约与安装升级检查，以及本机回环页面测试；这些检查不替代学校账号的实测。

本地安装包和校验文件由维护者提供，`artifacts/` 不纳入 Git；GitHub 源码更新不等于 npm 发布。

## 文档导航

| 用途 | 文档 |
| --- | --- |
| 安装与平台 | [安装、升级与卸载](docs/installation.md) · [Windows 使用与验证](docs/windows.md) |
| 命令与结果 | [完整命令参考](skills/hkustgz-cli/references/commands.md) · [CLI 输出协议](docs/cli-contract.md) · [错误处理](docs/errors.md) |
| Codex 与隐私 | [随包 Skill 指引](skills/hkustgz-cli/SKILL.md) · [隐私说明](skills/hkustgz-cli/references/privacy.md) |
| 开发与设计 | [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md) · [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md) · [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md) |
| 第二阶段 | [图书馆预约 Spec](docs/superpowers/specs/2026-11-01-library-booking-phase-2-spec.md) · [M5 实现验收](docs/acceptance/library-booking-phase-2-m5.md) · [alpha.6 实测验收](docs/acceptance/library-booking-alpha6-live.md) |
| 查询验收 | [Catalog](docs/acceptance/catalog.md) · [SIS](docs/acceptance/sis.md) · [Portal](docs/acceptance/portal.md) · [Canvas](docs/acceptance/canvas.md) · [Booking / Library](docs/acceptance/booking-library.md) |
| Alpha 与平台验证 | [交付准备](docs/acceptance/alpha-release.md) · [独立学生验收](docs/acceptance/alpha-students.md) · [Codex 调用记录](docs/acceptance/alpha-agent.md) · [Windows 验证记录](docs/acceptance/windows-alpha.md) |

验收记录保留各阶段的版本与验证环境；当前功能以本版本的 `capabilities` 输出和上述范围说明为准。

## 灵感与许可

受 [AwesomeHou/szu-cli](https://github.com/AwesomeHou/szu-cli) 启发，借鉴其命令行产品形式和分层适配思路，围绕港科广的实际系统独立开发。

本项目采用 [MIT 许可证](LICENSE)，是非官方项目。
