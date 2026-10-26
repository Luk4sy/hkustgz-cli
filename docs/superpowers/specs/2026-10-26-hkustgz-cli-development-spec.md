# hkustgz-cli 开发 Spec v0.1

日期：2026-10-26（Asia/Shanghai）  
状态：用户已授权按模块开发；Task 1 已验收，2026-10-27 已批准已验证SSO恢复边界及 Task 2 认证模块开发；其余业务取证仍进行中，发布未获授权。
上位设计：[技术方案](2026-10-26-hkustgz-cli-design.md)  
执行配套：[分阶段开发计划](../plans/2026-10-26-hkustgz-cli-development-plan.md)

本文将技术方案转换为需求编号、模块边界、输入输出契约和验收用例。技术方案与本文冲突时不得自行选择，应先更新两者并记录范围变更。文中内部类型、目录、错误码细分和日期语义是为实施补充的工程决定，尚未实测的接口仍须通过证据门槛。

## 1. 产品边界

| ID | 要求 | 验收依据 |
|---|---|---|
| P-01 | 独立 npm CLI，程序名 `hkustgz-cli`；用户无需安装 Codex、REA 或浏览器扩展 | 在干净安装目录执行版本、帮助和查询 |
| P-02 | 面向港科广学生，每人使用自己的学校账号与本地数据目录 | 专用 profile 登录、关闭后复用；第二名学生自愿测试 |
| P-03 | 覆盖 portal、sis、catalog、canvas、booking 五模块；Booking 首个供应系统为 library | 命令级 capabilities 和模块验收记录 |
| P-04 | 首期仅查询，不选退课、不提交作业、不预约/取消/签到、不支付、不修改已读或待办状态 | 适配器请求审计及禁止写入的测试 |
| P-05 | 查询数据直接往返用户电脑与学校/学校使用的服务，不经过项目服务器 | 安装产物、域名清单和请求记录审查 |
| P-06 | 结果可供终端用户与 Agent 使用；Skill 只描述调用方式 | JSON 契约测试与可选 table 输出 |

已有页面观察及来源见上位设计 E1–E6。当前没有已验证业务 API、专用 profile 冷启动证明或学校批准的 Canvas 第三方客户端。不得把官方平台通用文档中的端点标为本校已实测。

## 2. 版本范围与能力状态

每条命令能力有以下状态：

- `pending`：未完成实际接口/页面、认证或完整性验证；调用返回 `CAPABILITY_PENDING`，退出 8。
- `verified`：读取路线已通过 fixtures、契约测试及真实系统只读验收，可正常调用。
- `unsupported`：本版本明确不支持；返回 `UNSUPPORTED_CAPABILITY`，退出 8。
- `disabled`：曾通过验收但因上游变化暂时停用；返回 `ADAPTER_CHANGED`，退出 6。

“verified”表示该软件版本在记录的环境下通过过验收，不表示当前账号必然已登录或所有学生角色都兼容。运行时仍需检查认证、权限和响应结构。

五模块核心能力缺一项，不宣称五项完整稳定版。可交付标明缺项的 alpha；调整稳定版范围必须由用户另行确认。SIS 课程历史、正式成绩和本人预约记录是条件能力，在发布范围清单中逐项标明是否纳入；未纳入不是静默删除。

## 3. 技术与源码组织

运行时为 Node.js 24 LTS，TypeScript strict，ESM；开发工具 `tsx` 仅用于测试，不是用户运行时依赖。CLI 解析选用 Commander，结构校验选用 Zod；实施时核对 Node 兼容性并锁定依赖及 lockfile，文档不指定未经核对的版本号。浏览器层为固定版本 Playwright，优先本机 Chrome/Edge，Chromium 通过明确安装命令准备。

项目根目录为 `/Users/lukaspeng/project/有意思和有用的proj/hkustgz-cli/`。Git 仓库已初始化，当前工作分支为 `feat/cli-foundation`；基础 CLI、依赖和测试已建立，Task 1 已验收。下列路径为目标结构，后续模块按阶段补齐：

```text
bin/hkustgz-cli.mjs              shebang 入口，调用编译后的 main
src/cli/main.ts                 参数解析、命令分发、退出码
src/cli/render.ts               JSON/table/stdout/stderr
src/core/contracts.ts           查询、分页、结果类型和运行时 schema
src/core/errors.ts              错误分类及退出码映射
src/core/policy.ts              超时、分页、重试、日期边界
src/core/capabilities.ts        能力表及状态检查
src/core/query.ts               查询预算、分页收集、覆盖范围
src/core/sanitize.ts            已知认证字段及 URL 参数脱敏
src/session/paths.ts            HKUSTGZ_CLI_HOME 和专用路径
src/session/browser.ts          浏览器选择与正常生命周期
src/session/lock.ts             单 profile 进程互斥
src/session/auth.ts             各服务认证状态和用户登录流程
src/adapters/<module>/index.ts  具体页面/请求读取
src/adapters/<module>/parser.ts 原始结构到业务模型
src/adapters/<module>/model.ts  本模块业务模型/schema
src/adapters/<module>/manifest.ts 能力、域名、证据与读取路线
src/adapters/catalog/cache.ts   仅已证实公开数据的可选缓存
tests/*.test.ts                 测试文件，按职责命名
tests/fixtures/<module>/        脱敏 HTML/JSON 与预期结果
docs/research/                 入口/请求/会话/分页的脱敏证据记录
docs/acceptance/               真实环境验收摘要与最终发布范围
skills/hkustgz-cli/SKILL.md     可选调用指南
```

`<module>` 为 portal、sis、catalog、canvas、booking-library。Booking 分类发现位于 `src/adapters/booking/`，不得复制图书馆选择器冒充其他分类。

## 4. 核心接口契约

以下是内部边界，不是已实现 API；后续模块计划应直接引用这些签名。

```ts
type ServiceId = 'portal' | 'sis' | 'catalog' | 'canvas' | 'booking' | 'booking-library';
type ReadMethod = 'api' | 'response' | 'dom';
type Coverage = 'complete' | 'partial';
type CapabilityState = 'pending' | 'verified' | 'unsupported' | 'disabled';
type AuthState = 'authenticated' | 'unauthenticated' | 'unknown';

interface Capability {
  id: string; // 例如 sis.timetable、booking.library.availability
  service: ServiceId;
  state: CapabilityState;
  reason: string | null;
  evidenceId: string | null;
}
interface QueryOptions {
  limit?: number;
  refresh: boolean;
  deadlineMs: number; // 同一次查询共用的绝对截止时间
}
interface DateRange { from: string; to: string; timezone: 'Asia/Shanghai' }
interface QueryMeta {
  schemaVersion: '1'; command: string; service: ServiceId;
  sourceUrl: string; fetchedAt: string; timezone: 'Asia/Shanghai';
  readMethod: ReadMethod; coverage: Coverage;
  pagesRead: number; recordsRead: number; returnedCount: number;
  truncationReason: 'limit' | 'page_cap' | 'record_cap' | 'timeout' | 'upstream' | null;
  cache: { hit: boolean; storedAt: string | null };
  warnings: Array<{ code: string; message: string }>;
}
interface CliError {
  code: string; message: string; retryable: boolean;
  remediation: string; // 固定可操作建议，不含凭据或任意目标 URL
}
type QueryResult<T> =
  | { ok: true; data: T; meta: QueryMeta & { coverage: 'complete' } }
  | { ok: false; data: T; error: CliError & { code: 'PARTIAL_RESULT' };
      meta: QueryMeta & { coverage: 'partial' } };
interface Failure {
  ok: false; error: CliError;
  meta: { schemaVersion: '1'; command: string; service?: ServiceId };
}
interface AuthReport {
  service: ServiceId; state: AuthState; checkedAt: string;
  checkedUrl: string; reason: string;
}
```

查询失败且没有可信子集时使用 Failure，不制造 `coverage=complete` 或空数据。doctor、capabilities、auth 等控制命令使用 `{ok:true,data,meta:{schemaVersion,command}}`，不要求伪造 sourceUrl/readMethod。

函数签名：

- `executeCommand(argv: string[], dependencies: CliDependencies): Promise<{exitCode:number; stdout:string; stderr:string}>`，位于 `src/cli/main.ts`；dependencies 注入 clock、会话和 adapter，测试不得隐式访问校园网站。
- `classifyError(error: unknown): {error:CliError; exitCode:number}`，位于 errors.ts。
- `resolveDataPaths(env: NodeJS.ProcessEnv): DataPaths`，位于 paths.ts。
- `withSession<T>(service:ServiceId, options:SessionOptions, run:(session:Session)=>Promise<T>):Promise<T>`，位于 browser.ts；回调结束或抛错均负责关闭本工具上下文，清理失败必须显式报告。
- `checkAuth(service:ServiceId, session:Session):Promise<AuthReport>`，位于 auth.ts。
- `collectPages<T>(source:PageSource<T>, options:QueryOptions):Promise<Collected<T>>`，位于 query.ts；必须用上游确定的结束信号完成，不以固定等待后“没看到更多”当作结束。

`CliDependencies`、`DataPaths`、`SessionOptions`、`Session`、`PageSource`、`Collected` 的精确定义见配套计划 Task 1/2；不得在不同模块重新定义同名契约。

## 5. 全局运行规则

| ID | 规则 |
|---|---|
| G-01 | 默认 stdout 恰好一个 JSON 对象；table 是显式格式；诊断提示只写 stderr |
| G-02 | 所有命令、子命令支持 --help；帮助/版本不启动浏览器、不访问校园系统 |
| G-03 | 查询总预算 90 秒、单次请求/页面最多 30 秒；登录 10 分钟 |
| G-04 | 确认只读的瞬时网络失败最多重试一次；401/403 不重试；429 等待服从剩余预算 |
| G-05 | 每来源串行，自发业务请求最小间隔 500ms；不改写网站正常请求 |
| G-06 | 列表最多 20 页或 2000 条；limit/边界截断必须部分结果，不能声称全量 |
| G-07 | 日期为 YYYY-MM-DD，范围 [from,to)，默认学校当天起 7 天，最大 31 天；from>=to 或非法日期为参数错误 |
| G-08 | 单个本学期完整课表可以跨 31 天，但不虚构未取得的例外日期 |
| G-09 | 缺失数字为 null，不改成 0；时间不明为 unknown；来源值与推导值分开 |
| G-10 | 不跨来源模糊去重日程；保留来源/ID，最多标重复候选 |
| G-11 | 私有查询不跨命令落盘缓存；公开 Catalog 可缓存 5 分钟，未证明公开前禁用缓存 |
| G-12 | 不保存凭据参数、原始抓包、个人页面或其他人的预约主题；不默认遥测 |

全局参数 `--format json|table`、`--headed`、`--refresh`、`--limit <positive-int>` 应由命令 schema 声明适用范围。不支持的参数直接退出 2，不能静默忽略；限定 --limit<=2000，不提供解除读取上限的隐藏选项。

`--from` 和 `--to` 均缺省时使用默认 7 天；只给 from 则 to=from+7 天，只给 to 则 from=学校当天。所有分支均校验最大 31 天和正序。booking availability 使用单个 --date，等价于当地当天 [00:00,next day 00:00)。

退出码映射保持上位设计：0 完整成功；1 内部错误；2 参数；3 登录；4 权限；5 网络/超时/限流；6 结构变化；7 部分结果；8 未支持；9 profile 占用。收到中断信号先清理，成功清理后按信号退出（SIGINT=130、SIGTERM=143），不冒充成功结果。

## 6. 会话与认证 Spec

| ID | 行为与验收 |
|---|---|
| AUTH-01 | `HKUSTGZ_CLI_HOME` 未设时使用 ~/.hkustgz-cli；Chrome/Edge/Chromium 分别使用 profiles/<browser> |
| AUTH-02 | 一个数据根对应一个账号；一次一个工具进程持有选定 profile；冲突返回 9，不杀死其他进程 |
| AUTH-03 | auth login 显式打开可见专用浏览器；用户完成正常认证，工具通过真实已登录依据确认 |
| AUTH-04 | 普通查询不能自动变成交互登录；会话过期立即给对应 service 登录命令 |
| AUTH-05 | portal 成功不能替代 sis/canvas/booking-library 的认证验证；状态 unknown 不能转成 authenticated |
| AUTH-06 | 退出仅清理本工具数据与自身进程；不删除个人 Chrome profile，也不宣称撤销全部学校会话 |
| AUTH-07 | 正常结束、回调抛错、超时、中断都应关闭工具上下文并释放锁；清理失败保留错误与归属信息 |
| AUTH-08 | 新 profile 登录→关闭→新进程重开→读取本人数据必须实测；不复制日常浏览器 Cookie 来替代验证 |
| AUTH-09 | 2026-10-27 用户批准：有效学校 SSO 可沿已验证正常流程恢复短期业务会话；SIS 在精确 `/auth-sign` 页最多点击一次 Login，不输入或提交认证表单。查询一旦需要密码、验证码或人工确认，立即返回 LOGIN_REQUIRED；状态命令报告 unauthenticated，不等待交互登录 |

Task 2 先实现 Portal/SIS/Canvas 的认证子集；Catalog 公开可见性不证明身份，Booking/Library 无充分正向与失效对照时返回 unknown，login 保持 pending。此处为用户对真实取证结果的明确确认，不将剩余 Task 0 业务完整性门槛视为通过。

认证状态观察在导航完成后最多5秒，并预留总预算内的返回时间；unknown 不等同于登录成功或会话过期。正常学校 HTTP 重定向逐跳检查顶层来源，未建立保护的弹窗阻止导航。清理额外最多等待5秒；失败保留锁与归属元信息并报告原结果类别，不强杀未知进程。新增错误 INVALID_DATA_HOME（2）、BROWSER_UNAVAILABLE（8）、CLEANUP_FAILED（1）、INTERRUPTED（130）、TERMINATED（143）。

不得启用 Chrome 默认 profile 的远程调试。重定向只在经研究记录的学校/身份提供方来源间进行，配置不得接受任意 service URL。与 browser 相关的控制命令至少有 `browser status`、`browser use chrome|edge|chromium`、`browser install chromium`；安装行为只在明确调用时执行。

## 7. 各业务模块契约

以下字段均为规范化目标；源字段映射通过研究记录确认，不反向编造原始接口字段。

### 7.1 Portal

命令：`portal apps`、`portal notices [--query --limit]`、`portal notice <id>`、`portal agenda [--from --to]`。

- 应用：id、name、url；不存在稳定 id 时采用来源标识并说明稳定性，禁止解析临时票据作为 id。
- 公告：id、title、publishedAt、category、url；详情补 bodyText，保留无权限和分页中断。
- 日程：id、source、title、startsAt、endsAt、location、courseCode、sectionId、duplicateCandidate；未提供字段为 null。
- 验收 PORTAL-01：同一时段两个来源的相似条目仍保留为两个；PORTAL-02：公告加载未完成不能返回成功空结果。

### 7.2 SIS

命令：`sis terms`、`sis timetable [--term]`、`sis today [--date]`；条件命令为 `sis history [--term]`、`sis grades [--term]`。

- 学期：id、name、isCurrent；系统不标当前时不按月份猜，要求用户明确 --term。
- 课表：termId、courseId、courseCode、courseName、sectionId、sectionLabel、credits、enrollmentStatus、meetings。
- meeting：id、dateFrom、dateTo、weekday（1–7）、startTime、endTime、location、instructors、exceptionsCoverage（known/unknown）、exceptions；不能把 unknown 例外当作不存在。
- today 是按学校时区查询的计划课程；例外未知时输出 warnings，不能保证当日实际授课。已知取消/改期按来源处理。
- history 与 grades 独立，不要求历史课程都有分数；gradeValue 用 string|null 保存字母、数字或特殊状态，gradeStatus 区分 published/unpublished/unknown。
- 验收 SIS-01：多 meeting 和跨日期范围正确过滤；SIS-02：新生无历史、未发布成绩、接口异常三个结果不能混同。

### 7.3 Catalog

命令：`catalog search <text> [--term]`、`catalog course <id> [--term]`。

课程含 id、code、title、credits、termId、sections；section 含 id、label、meetings、quota、enrolled、available、waitlisted、restrictions。数字为 number|null；available 保留来源值，不用 quota-enrolled 覆盖。

- CATALOG-01：搜索条件必须真实影响查询或在完整已取集合内明确本地筛选；仅填写输入框不算查询通过。
- CATALOG-02：处理虚拟列表/分页并披露截断；多教室、多时段不能丢行。
- CATALOG-03：回显 fetchedAt 和来源“通常 15–20 分钟更新”的说明，不称实时名额。

### 7.4 Canvas

命令：`canvas courses`、`canvas announcements --course`、`canvas assignments --course`、`canvas agenda [--from --to]`。

课程含 id、code、name、termName、url；作业含 id、courseId、title、effectiveDueAt、dueAtSource（student/base/unknown）、submissionStatus（submitted/not_submitted/unknown）、graded（boolean|null）、markedComplete（boolean|null）、url。agenda 保留 itemType，不将公告、作业、个人提醒混为一种事件。

- CANVAS-01：学生有效截止时间优先于通用时间；未确认覆盖时不能标记 dueAtSource=student。
- CANVAS-02：标记完成不等于已提交；Planner 当前可见项不等于全部作业。
- CANVAS-03：先验证合法可分发认证路线；不要求其他用户提供手动个人 Token，不把 client secret 放进 npm 包。
- CANVAS-04：任何浏览器读取路线也要经平台/学校适用规则及实测审查；条件不具备时保留 pending，不降级成硬编码令牌。

### 7.5 Booking / Library

命令：`booking providers`、`booking rooms --provider library [--floor]`、`booking availability --provider library --room --date`；条件命令 `booking mine --provider library [--from --to]`。

provider 含 id、name、entryUrl、state；room 含 id、name、floorId、floorName、capacity、type。availability 含 roomId、date、openIntervals、busyIntervals、availableIntervals、unknownIntervals、rulesCoverage（complete/partial/unknown）及 restrictions。

- BOOK-01：三楼超过 10 条的样本完整翻页；不能把第一页作为全楼。
- BOOK-02：只有开放与占用信息都覆盖目标区间、且规则满足或已披露时，才能将该区间列为 available；否则返回 unknown 或受限状态。
- BOOK-03：区间按 [start,end) 计算，边界相接不冲突；同房间交叠占用先合并再求差集。
- BOOK-04：不输出其他预约人的名字、主题；不点击时段建立草稿验证可用性。
- BOOK-05：其他供应商只列入口和 pending/unsupported，不接受用户传任意域名。

## 8. 研究证据门槛

每条拟实现读取能力的证据记录至少包含：evidenceId、观察日期、页面入口、正常操作步骤、读取路线、源结构/选择器、鉴权载体类型（不含值）、必要响应判据、分页结束判据、空数据判据、权限/登录失败特征、时区和字段映射、实际覆盖的角色、支持的命令。

请求证据补充方法/路径/参数名称和语义；必须区分已确认只读 POST 与会产生状态变化的操作。认证字段只记录“来自何处、是否刷新”，不记录秘密值。DOM 路线也可以通过门槛，不以拿到 API 为唯一条件。

EVID-01：没有网络证据就不实现猜测请求；EVID-02：mock/fixture 测试不能将能力升级 verified；EVID-03：实验 profile 冷启动失败则停止该读取路线并记录原因；EVID-04：成绩/本人记录无法发现时写明确结论和版本影响，不无限探测未知 URL。

研究产物按模块独立保存；实际数据仅在用户电脑临时读取，fixture 使用合成身份与足够还原结构的脱敏数据。真实学校域名可保留，敏感 query 参数值不可保留。

## 9. 测试与发布验收

| 测试层 | 目的 | 能否证明本校真实可用 |
|---|---|---|
| 纯函数/schema | 字段映射、日期、区间、空值、状态语义 | 否 |
| CLI 契约 | 命令、帮助、JSON/table、错误码、退出码 | 否 |
| 本地浏览器集成 | Cookie/页面跳转模拟、登录失效、锁与清理、响应采集 | 否 |
| 本人真实只读验收 | 目标页面逐项对照、新 profile 冷启动、分页/结果覆盖 | 仅证明已记录账号与环境 |
| 第二名学生自愿验收 | 独立安装与账号差异验证 | 仅在记录的角色和平台范围内 |

发布门槛：所有最终承诺能力各有 evidenceId、真实验收记录和测试；macOS/Windows 分别做真实浏览器冒烟；Canvas 分发认证条件落实；条件能力有明确取舍；npm 包无敏感数据、无安装期登录/查询；公开说明非官方与已知限制。无第二人实测只能个人 alpha，不能宣称通用稳定版。

发布文件限 bin、dist、必要 docs、LICENSE、可选 skills；不包含 tests、docs/research 原始内容、profiles、缓存、HAR、trace、截图。`npm pack --dry-run --json` 与临时目录安装通过后再由用户决定实际发布。npm 包名、许可证和发布账号在发布任务中确认，不由执行者擅自占名或发布。

## 10. 完成定义与变更控制

本 Spec 文档完成不等于软件完成。软件完成必须同时满足需求、正常/失败路径、真实能力和目标平台验收；任何未实现能力在能力表中明确标示。

进入开发前先完成证据任务和经同意的专用 profile 实验；不能把用户要求“创建 Spec”解释为安装依赖、创建仓库、登录或发布的授权。规格字段如因真实学校结构而必须变化，先记录冲突、建议修订和影响，再更新设计与 Spec，不在适配器内部偷偷改变 JSON 语义。
