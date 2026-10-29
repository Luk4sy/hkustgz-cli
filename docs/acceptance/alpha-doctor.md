# Alpha封装第三批：doctor诊断（待用户审查）

日期：2026-10-29。第二批e124993已获用户验收。本批仅完成doctor、依赖加载前Node版本检查和诊断失败契约；第四批完整Skill与真实Codex调用未开始。

## 使用与契约

```bash
hkustgz-cli doctor
hkustgz-cli doctor --format table
```

默认JSON单结果；table保留诊断checks。DoctorReport包含cliVersion/nodeVersion/platform/arch、checks[]的id/status/code/remediation，以及四种能力状态计数。健康返回ControlResult/退出0；可继续的警告不会把ok变成false；阻塞条件返回ENVIRONMENT_NOT_READY/8、error.details含经schema验证的完整报告。不安全数据目录返回INVALID_DATA_HOME/2，也保留报告；未知异常仍INTERNAL_ERROR/1，不透传原始错误或任意details。schemaVersion保持1。

## 状态分级

| 条件 | 结果 |
| --- | --- |
| Node24、macOS、Chrome可用且选择Chrome、数据目录安全 | pass |
| 未创建数据目录 | pass，不创建目录 |
| 缺Chrome、选择其他浏览器、非macOS或非Node24 | fail；退出8，提供人工修复说明 |
| 忙profile锁、未知/过期锁 | warn；不删锁，不终止进程 |
| Skill缺失、过期、修改、未知归属或状态检查失败 | warn；不阻止终端查询，不自动安装/升级 |
| 数据目录未归属、路径符号链接或不安全结构 | fail；退出2，不修复或创建内容 |
| 未预期读取错误 | 退出1；仅固定公共错误信息 |

锁观察只读受限owner.json元数据、同机PID存在性；不读浏览器Cookie。所有已知浏览器profile的锁都会检查；任一未知锁保留unknown警告。诊断不证明学校会话有效，也不代替auth status或真实查询。

## 无副作用及隐私

复用既有selectedBrowser/browserAvailability、路径归属检查及Skill只读状态；浏览器可用性只检查可执行文件，不launch，不连学校、不下载。路径只作本机判断，不进入公开报告；无账号、Cookie、profile内容、原始认证响应或用户主目录。报告只从探针中选择所需状态，额外私有字段不透传。

生产路径保持不创建目录、不写配置、不删除锁。测试在HKUSTGZ_CLI_HOME、CODEX_HOME均为临时目录的环境检查前后存在性；活动锁和未知锁文件逐字保持。真实tgz安装版doctor运行时沿用禁止网络/子进程的探针，没有触发记录；未修改真实Codex或私人profile。

## Node早期检查

bin在加载dist/Commander/Zod/Playwright之前检查Node主版本；非24返回退出8和固定JSON或table提示。CLI版本通过Node内置fs读取package.json，不固定为当前开发版本；缺包元数据的独立fixture显示0.0.0。此分支没有加载能力表，报告中的能力计数0表示未加载，不能当作实际能力状态，应升级Node后重查。

本机nvm仅发现Node24.20.0，标准其他Node路径无旧引擎。测试使用单独Node24进程、预加载模拟22版本且只复制bin（不提供dist或第三方依赖），证明不加载依赖即可返回提示；这是注入回归，不是Node22真实引擎兼容验收。旧引擎实测仍标未验证。没有为本批安装新运行时。

## TDD与产物验证

- 新增8项诊断/CLI/隐私测试：健康、缺浏览器、不支持平台/Node、忙与未知锁、不安全目录、未知错误脱敏、JSON/table隐私、无依赖早期启动及包版本更新。
- 原入口仍pending、未有早期Node检查时先失败，再实现后通过；新增版本更新回归先复现硬编码版本问题，后改为包元数据读取并通过。
- 原13项Skill测试、3项实际打包/安装测试继续保留；安装测试增加安装版doctor，检查没有创建校园数据目录或客户端配置。
- 当前真实验证范围仅为本机macOS/Node24/Chrome与临时目录。未验证第二名学生、Windows/Linux、真实旧Node；本批不发布或分发。

## 本机与产物

本轮观察：macOS26.6.2、arm64、Node24.20.0、npm11.19.0、Chrome156.0.8078.48。仅记录版本，不包含学生身份或路径。这不是其他学生/平台已通过的证明。

实际npm pack产物包含91文件，SHA256：`27c0d5716045e15ced650a44375155ab658ad4a1c767dd93b0e2c2bc35fb918c`，保存在忽略工作目录task3-artifacts，版本仍为未发布本地0.1.0-alpha.1快照，未覆盖前两批产物。

首轮完整运行221/222通过，唯一失败为既有测试仍将doctor视为pending。查明是实现状态变化后，将该输入替换为仍pending的browser install chromium，保留原有未实现控制功能不得假成功的断言，不修改生产行为或放宽测试。修改后CLI＋doctor＋privacy的23项目标测试通过，再重跑完整套件；最终结果另列。

## 最终检查

- `HKUSTGZ_TEST_BROWSER=1 npm test`：222/222通过，0失败0跳过，含54项既有Chrome本地合成测试；包含构建。
- `npm run typecheck`、`git diff --check`：通过。
- 实际tgz隔离安装与安装版doctor通过，副作用探针无网络/子进程记录。
- 旧Node引擎实测仍未验证；六份既有未提交文档未改动，未发布、未对外分发、未写真实Codex配置。第四批未开始。
