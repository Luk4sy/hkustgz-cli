# Alpha 安装与使用

当前本地候选为 `0.1.0-alpha.6`，CLI 与随包 Skill 已完成本地同步和隔离安装验证，尚未上传 npm。macOS 已验证四楼 403 本人单人预约和取消，alpha.6 的 Windows 升级和回归待验证。许可证为 MIT。

## 安装明确版本产物

在维护者确认分发后，取得对应版本tgz及SHA256，从本机绝对路径安装：

```bash
npm install --global '/absolute/path/hkustgz-cli-0.1.0-alpha.6.tgz'
hkustgz-cli --version
hkustgz-cli doctor
hkustgz-cli --help
hkustgz-cli capabilities --format table
```

包使用生产依赖；安装需要npm依赖下载或已填充缓存。无需克隆仓库、运行TypeScript或在源码目录操作。不要使用尚未发布的npx地址。若npm提示全局目录权限不足，使用自己拥有的npm prefix并配置相应PATH；不要盲目sudo。

本包安装不下载/启动浏览器、不发起学校请求、不登录、不安装Skill或修改Codex配置。doctor与Skill管理现已实现；browser install仍pending，完整校园查询Skill现已随包提供，客户端发现和实际调用范围见第四批验收记录。

## 首次查询和登录

公开目录无需登录，但需要本机Chrome：

```bash
hkustgz-cli catalog search AIAA5032 --format table
```

私人系统在专用窗口本人正常登录：

```bash
hkustgz-cli browser use chrome
hkustgz-cli auth login sis
hkustgz-cli auth status sis --format table
hkustgz-cli sis today --format table
```

Portal或Canvas使用对应service。会话默认保存于~/.hkustgz-cli，不读取日常Chrome Cookie；一次运行一条浏览器命令，已有进程未结束时不要重复启动。无需向维护者发送密码、Token或profile。

## 升级与卸载

取得后续确认版本tgz后用同样npm install --global命令替换；升级不清理专用会话，也不保证学校登录永远有效。升级后需显式重新运行skill install同步Skill；修改冲突不会被自动覆盖。

```bash
# 如需主动清理本工具的登录会话，在卸载前执行：
hkustgz-cli auth logout
npm uninstall --global hkustgz-cli
```

npm卸载只移除CLI包；不删除会话或其他客户端内容。logout不等于撤销学校所有设备的会话。

## 开发者构建

源码目录使用npm ci、npm run build。npm pack会先清理dist并重新构建，生成只包含运行时代码和公开文档的tgz。安装消费者无需scripts目录；构建脚本只在生产包的打包方执行。

## Skill管理（第二批）

安装CLI不会自动写Skill。显式运行以下命令，默认使用CODEX_HOME下的skills目录，未设置时为~/.codex/skills；不修改Codex配置。

```bash
hkustgz-cli skill path
hkustgz-cli skill status
hkustgz-cli skill install --target codex --dry-run
hkustgz-cli skill install --target codex
hkustgz-cli skill uninstall --target codex
```

自定义skills根目录使用--dir绝对路径，与--target互斥；卸载也支持--dry-run。现有用户编辑和未知文件会保留，发生冲突时按错误提示先自行备份处理，不能直接删除未知锁。包内现有校园查询指引与四份按需引用文件。安装后刷新或重启Codex；已验证新启动的Codex CLI发现和读取Skill，当前桌面会话热刷新未单独验收。若要清理Skill，在npm卸载CLI前显式执行skill uninstall；npm卸载不会替你清理Skill。

## 只读环境检查

运行hkustgz-cli doctor（或--format table）检查运行时、Chrome、专用目录和Skill状态，不启动浏览器或访问学校。警告如缺Skill/忙锁可先查看建议；fail退出8，需处理缺Chrome、不支持的平台/Node或浏览器选择；不安全数据路径退出2。doctor不自动安装软件、删除锁或证明学校认证有效。Node24要求在加载依赖前检查；旧引擎实际兼容测试仍未完成。Windows11兼容NT build只显示候选警告，不表示实机通过。

## 通过Codex查询

CLI需已在当前终端PATH中，Skill与CLI版本精确一致；可用skill status检查文件状态，文件已安装不代表当前会话已刷新。输入`$hkustgz-cli 查公开课程AIAA5032`，Agent应先检查版本、doctor、capabilities，再运行对应查询。私人查询由本人在正常学校窗口完成认证，不要求Token。Agent串行调用，保留partial/unknown，遇限流停止。

命令参考由构建时的真实注册表生成；Skill不抓网页或猜接口。完整CLI协议见cli-contract.md，错误及恢复边界见errors.md。第四批的CLI安装使用隔离prefix，不自动改用户全局PATH；日常使用仍需按本指南显式安装。定向试用前需由维护者确认交付渠道；面向更多同学的alpha交付还需完成独立学生验收。MIT许可与实际发布授权分别记录。

Windows用户使用npm.cmd/hkustgz-cli.cmd入口，完整PowerShell与loopback检查见[Windows候选](windows.md)。不改变执行策略、不自动安装Chrome，不把Windows候选当作已完成独立学生验收。

2026-11-01个人本地alpha.3同步：CLI与Skill精确同版本，包含已验收的17项只读路线及图书馆规则/状态限制指引。旧alpha.1/alpha.2候选保留；本次不是npm发布、Windows真机或第二位学生验收。

## alpha.6 安装与操作状态

本版有 17 项已验证查询、5 项图书馆实验能力和 2 项待开发能力。图书馆详情、创建预览、创建、取消预览和取消均为 `experimental`。预约适用于本人单人及已验证的四楼研修间规则。实测范围见[验收记录](acceptance/library-booking-alpha6-live.md)。

升级 CLI 后，显式安装同版本 Skill，再刷新客户端以确认识别。升级、卸载或退出登录后，未决预约操作仍需通过原操作 ID 核对。本机防重仅覆盖同一 CLI 数据目录。

创建和取消分别生成预览并取得确认。操作结果为 `unknown` 时，使用 `booking operation <操作ID> --refresh` 只读核对。命令示例见[随包 Skill 指引](../skills/hkustgz-cli/references/examples.md)。
