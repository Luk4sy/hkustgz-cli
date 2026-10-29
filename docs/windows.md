# Windows 11 候选试用（alpha.2）

范围：Windows11＋Google Chrome稳定版＋Node24＋Codex。代码适配已提供，Windows真机结果尚未取得；不是已验证Windows稳定支持。Windows10/Server、WSL、Edge和其他Agent不在本次范围。macOS已有旧版本实测证据，本次Mac回归不替代Windows验收。

## 安装前与校验

请同学本人在PowerShell运行，只回报版本和别名，不发送账号、Cookie或课程内容：

```powershell
(Get-CimInstance Win32_OperatingSystem).Caption
(Get-CimInstance Win32_OperatingSystem).Version
node --version
npm.cmd --version
$Tgz = (Resolve-Path '.\hkustgz-cli-0.1.0-alpha.2.tgz').Path
Get-FileHash $Tgz -Algorithm SHA256
```

校验值必须与同包SHA256SUMS一致。Chrome请通过正常官方安装方式自行安装；不自动下载浏览器，不用日常Chrome profile。本候选查找PROGRAMW6432、ProgramFiles、ProgramFiles(x86)、LOCALAPPDATA下固定Google\Chrome\Application\chrome.exe，优先系统安装，再用户安装；不搜索任意PATH或接受任意exe参数。中文和内部空格正常保留，网络盘/UNC、device、盘符相对路径不支持。

## 显式安装和诊断

```powershell
npm.cmd install --global $Tgz
hkustgz-cli.cmd --version
hkustgz-cli.cmd doctor
hkustgz-cli.cmd browser status
hkustgz-cli.cmd capabilities
```

使用.cmd入口避免要求修改PowerShell脚本执行策略；不用Set-ExecutionPolicy或管理员模式。若命令未找到，确认用户npm prefix已在当前PATH，不自动改shell。需要时显式执行browser use chrome。doctor对10.0且build>=22000显示WINDOWS_CANDIDATE警告；这只是兼容构建线索，不证明Windows11的SKU/版本或浏览器实机成功，仍需本人确认Caption。未知/旧build、缺Chrome或其他浏览器仍阻塞。

## 本机合成浏览器检查

```powershell
$NpmRoot = (npm.cmd root --global).Trim()
$Smoke = Join-Path $NpmRoot 'hkustgz-cli\bin\windows-smoke.mjs'
node $Smoke
```

检查仅新建临时工具目录、启动Chrome访问127.0.0.1合成页面、正常关闭并重新获取profile锁；不访问学校、不读取已登录profile。期望ok:true、scope=loopback-only、browserClosed=true、profileLockReacquired=true。失败只回报错误码；不要删未知锁、杀未知进程或关闭安全机制。安装本身不会自动执行此检查。非Windows运行会退出2，不拿Mac拒绝分支算Windows浏览器通过。

## 本人正常登录与查询

只有前述浏览器检查通过后再由同学本人运行：

```powershell
hkustgz-cli.cmd catalog search AIAA5032 --limit 3
hkustgz-cli.cmd auth login canvas
hkustgz-cli.cmd canvas courses
```

登录在正常学校窗口完成，不在聊天中填密码/验证码/Token。只回报exitCode、coverage、returnedCount和truncationReason，partial不能称全量。Canvas成功只证明当前账号课程路线，不代替其他13项逐项验收。SIS可另以auth login sis、sis today验证；无权限或未知状态如实记录。

## Codex与退出/升级

```powershell
hkustgz-cli.cmd skill install --target codex --dry-run
hkustgz-cli.cmd skill install --target codex
hkustgz-cli.cmd skill status
```

默认安装至CODEX_HOME\skills\hkustgz-cli，未设置时为用户主目录的.codex\skills\hkustgz-cli；仅本地盘符路径，拒绝junction/symlink祖先，保留用户改动。刷新Codex后用$hkustgz-cli触发，并核对CLI/Skill均alpha.2。客户端沙箱若阻止Chrome，走客户端正常审批或标未验证，不绕过限制。

正常完成后关闭命令，再运行一次公开查询验证profile锁已释放。另在查询期间按一次Ctrl+C，待清理结束后重查；Windows真实中断退出码/句柄行为需实际记录，不照搬Mac的130断言。遇PROFILE_BUSY等待原进程，不强删锁。

升级新版本tgz不会自动同步Skill；先看到outdated，再显式skill install成为current。卸载前按需要执行auth logout清理本工具会话（不代表学校全局注销），再skill uninstall和npm.cmd uninstall --global hkustgz-cli。保留会话时跳过logout；其他Skill和配置应保持。

## 仅回报这些验收信息

系统Caption/NT build、架构、Node/npm/Chrome版本、包版本与SHA256、测试者别名；安装、doctor、loopback smoke、公开查询、本人登录/课程、Codex发现、Ctrl+C重查、升级/卸载各自pass/partial/unknown/错误码/未测。不附标题、ID、正文、截图、原始响应或profile。

依据：[Playwright Chrome通道](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge)、[Node进程与Windows.cmd](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows)、[Microsoft Windows11构建信息](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information)。构建号只是候选判断，真实支持以本项目实机结果为准。
