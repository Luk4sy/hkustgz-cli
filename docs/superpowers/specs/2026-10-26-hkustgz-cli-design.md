# hkustgz-cli 技术方案 v0.1

日期：2026-10-26（Asia/Shanghai）  
状态：设计草案，待用户审阅；尚未批准实施。  
对象：使用自己学校账号的港科广学生，以及协助他们使用 CLI 的 AI 助手。

## 1. 已确认的产品决定

- 独立开发 `hkustgz-cli`，借鉴 szu-cli 的分层方式，不 fork 后替换学校域名。
- 面向其他同学安装使用，交付命令行软件，提供结构化输出，并可配套 Skill。
- 第一阶段覆盖 myPortal、SIS、Class Schedule & Quota、Canvas、Booking 五个模块。
- 第一阶段只做查询；不选退课、不加入购物车、不提交作业、不创建或取消预约、不支付、不修改校内日程或已读状态。
- 先调研、确定方案，再分阶段实施；本文件不是产品代码或已验证可用的接口清单。

下文中的 Node/TypeScript、安装方式、命令名称、缓存参数、平台支持及模块最小功能均为本次技术提案，不代表用户已经逐项批准。

## 2. 目标与交付边界

让同学在自己的电脑上完成正常登录后，用明确命令查询校园数据。CLI 自身不依赖大模型、Codex、REA、reverse-skill、iPhone-use 或浏览器扩展，也不要求每位用户打开开发者工具。

第一版提议交付：npm 包、CLI 帮助、中文使用说明、模块能力清单、配套可选 Skill、脱敏样例与测试。安装 CLI 和安装 Skill 是两步；安装包不修改 AI 客户端全局设置。

### 模块的最小可用功能

| 模块 | v0.1 目标 | 不据此承诺 |
|---|---|---|
| myPortal | 应用入口列表、公告列表/详情、限定日期内的个人日程 | 邮件正文、校园卡财务查询、跨来源日程自动合并 |
| SIS | 学期列表、本人已选课表、今天的课程、本人可见课程历史及成绩（如学校页面实际提供） | GPA 自行推算、毕业审核、旧 SIS 全量兼容 |
| Catalog | 按学期和关键词搜索课程、课程及班次详情、容量/已选/余量/候补/限制说明 | 实时名额保证、选课或抢课 |
| Canvas | 本人课程列表、指定课程公告、作业及学生有效截止时间、限定日期内学习待办 | 提交作业、标记完成、完整成绩册、下载全部课件 |
| Booking | 分类/供应系统入口、图书馆房间列表、限定日期的开放与占用时段、本人预约记录 | 将图书馆实现自动推广到会议室或体育场馆 |

Booking 的首个可实施适配对象是已观察到的图书馆系统；会议室、体育场馆和其他类别在能力清单中分别列出，核实前返回不支持，不能伪装为已支持的查询。此处是明确缩小到可验证样本的提案，需随本方案一起确认。

成绩与本人预约记录尚未观察到真实详情页面：先验证其入口和字段，再决定是否进入 v0.1；若不可用，更新发布范围并说明原因，不虚构字段，不以其他页面推算替代。

## 3. 调研证据与限制

### 已观察事实

本次通过用户已登录的 Chrome、只读页面访问进行了观察，未读取 Cookie/Token，未保存个人原始页面数据或提交预约。

| 编号 | 系统/入口 | 已观察事实 | 尚未证明 |
|---|---|---|---|
| E1 | `https://myportal.hkust-gz.edu.cn/` | 存在应用、资讯、个人日程、借阅记录区域；应用中有 SIS、Canvas 和课程名额入口 | 独立浏览器登录复用、公告完整分页、日程来源标识 |
| E2 | `https://sisn.hkust-gz.edu.cn/system/my-calendar` | 已登录学生可见学期、课程代码、班次、日期范围、时段、教室、教师；菜单中存在 My Academics、Course History 等入口 | 成绩字段、课程取消/例外日期、跨学生角色覆盖 |
| E3 | `https://sisn.hkust-gz.edu.cn/cq` | 页面有学期、关键词输入和班次表；字段包括 Quota/Enrol/Avail/Wait；提示通常每 15–20 分钟更新 | 搜索准确触发方式、全量/虚拟列表加载、是否无需登录 |
| E4 | `https://hkust-gz.instructure.com/` | 登录后 Dashboard 可见课程、公告、作业日期及部分提交状态 | 本校 API/OAuth 可用性、完整作业分页、学生个人覆盖截止时间 |
| E5 | `https://booking.hkust-gz.edu.cn/front_page` | 登录后提供会议室、活动室、图书馆、体育场馆等分类；图书馆跳至独立域名 | 不同分类的认证及数据接口是否一致 |
| E6 | `https://libroombooking.hkust-gz.edu.cn/#/ic/home` | 当前 Chrome 可进入已登录图书馆空间系统；可选楼层和日期，展示房间、时间轴、已预约/非开放预约标识；三楼出现 19 个条目、每页 10 条 | 占用块精确起止时间的机器可读表达、本人预约列表、专用 profile 登录 |

myPortal 曾出现相同时段以课程代码和课程全名分别显示的条目。只能标记为疑似重复，未证明是同一事件，不能直接删除其一。

E3 曾在输入关键词后仍显示多条课程，故目前仅确认输入控件和表格存在，没有确认筛选成功。E6 初次一楼查询显示空列表，不能据此认定一楼永久无房间。

### 公开资料

- [学校 ARS 系统目录](https://ars.hkust-gz.edu.cn/systems-tools/)：当前 SIS、课程名额、Canvas、Booking 官方链接来源。
- [学校 IT Services](https://studyathkustgz.hkust-gz.edu.cn/detail-815)：门户、科大 Go、账号及 Booking 用途说明。
- [学校选课说明](https://ars.hkust-gz.edu.cn/programs-courses/guides-on-course-registration/)：SIS 课表及选课功能。
- [Playwright Authentication](https://playwright.dev/docs/auth)：认证状态可复用，也属于敏感数据。
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)：关联 request 与浏览器上下文共享 Cookie；不意味着自动复制网页的全部鉴权请求头。
- [Playwright Persistent Context](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context)：独立 userDataDir，不控制日常默认 Chrome profile。
- [Canvas OAuth2](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)：第三方应用认证与分发约束。
- [Canvas Planner](https://developerdocs.instructure.com/services/canvas/resources/planner)：标准学习待办及分页接口；不是本校已实测接口证据。
- 本地参考：`/Users/lukaspeng/project/有意思和有用的proj/szu-cli`，提交 `ea4bc9a`，仅作架构与模式参考。

### 尚未获得的证据

未捕获港科广业务请求和返回体；不知道其实际端点、查询参数、鉴权载体、CSRF 策略或接口返回字段。研究用 Chrome 可读不等于新用户专用 profile 可用。以上内容必须在实施前的验证阶段补齐。

## 4. 方案比较与技术选择

### 项目组织方案（已由用户选择）

1. 独立开发：按港科广系统建立适配器，参考 szu-cli 的工程经验。减少深大业务耦合；需要建设自己的基础模块。选择此方案。
2. Fork szu-cli：可以复用部分框架，但需要清理深大入口、业务模型和命令，长期同步复杂。本期不采用。

### 数据访问方案（技术提议）

| 方案 | 优点 | 代价 |
|---|---|---|
| 所有功能只操作页面 | 与正常用户操作接近；首个样本容易验证 | 表格和图形日程难解析，分页较慢，页面改版影响大 |
| 所有功能直接 HTTP | 数据结构明确、开销较低 | 当前无接口证据；需要重建各系统认证，不能假设请求只依赖 Cookie |
| 浏览器建立会话，按适配器选择接口/响应监听/DOM | 兼顾登录复用与数据完整性，适配不同供应商 | 每条读取路线都要单独验证、维护 |

推荐第三种。浏览器不是不可避免的每条查询步骤：若正式 API 已获批准且可独立认证，该模块可直接 HTTP。其余模块优先使用经实测的会话查询；接口未证实时采用经测试的页面读取。读取路线明确指定，不运行时猜接口、不悄悄更换为语义不同的数据源。

### 技术栈提议

- Node.js 24 LTS + TypeScript strict；发布编译后的 ESM，普通用户不需要 TypeScript 或 tsx。
- Playwright 控制专用 Chrome/Edge/Chromium profile。精确版本在实施时锁定，不把本次工具运行版本当作产品依赖。
- 命令解析采用维护中的成熟库，结构校验采用轻量 schema 库；具体库及版本交给实施者选择并锁定，控制依赖数量。
- 原生 `node:test` 验证领域转换、错误与 CLI 契约；Playwright 验证专用 profile 浏览器流程。
- 不引入服务器、数据库、常驻守护进程或 MCP Server 作为 v0.1 必选组件；测试数据用脱敏 JSON/HTML fixtures。

平台提议：开发验证先在 macOS 进行，首个面向同学的稳定版本支持 macOS 与 Windows；Linux 在浏览器/依赖测试完成前标为实验支持，不能仅凭 npm 可安装就承诺功能通过。

## 5. 架构与职责

```text
终端用户 / Agent + 可选 Skill
          ↓
CLI：命令、参数、帮助、stdout/stderr、退出码
          ↓
应用层：执行一次查询、时间范围、分页、缓存、超时
          ↓
系统适配器：portal / sis / catalog / canvas / booking-library
          ↓
会话与传输：专用浏览器上下文 / 已批准 API 客户端
          ↓
学校各系统

系统原始数据 → 解析与校验 → 统一业务模型 → CLI 输出
```

- CLI 不包含网页选择器；适配器不直接打印内容。
- 解析器接收原始数据与来源上下文，返回业务对象，可脱离网络测试。
- SessionManager 管浏览器生命周期和锁；一个专用 profile 同时仅由一个 CLI 进程使用，不因冲突杀死其他浏览器。
- AdapterManifest 声明命令、来源域名、能力状态、读取路线、必要响应、分页策略和空结果判据。
- 已验证能力才出现在正常能力列表中；候选项明确标为待验证/不支持。
- v0.1 一条命令只查询一个模块，不建设跨模块大型聚合命令；单模块失败不污染其他模块状态。

建议源码目录：`cli/`、`application/`、`session/`、`adapters/`、`domain/`、`output/`、`tests/fixtures/`。这只是结构说明，本次不创建源码骨架。

## 6. 登录、账号与本地状态

1. 同学执行 `hkustgz-cli auth login portal`，打开 CLI 专用的可见浏览器。
2. 用户在学校页面输入凭据、完成验证码/MFA；CLI 不提供密码参数、不代填或记录密码。
3. 等待已验证的登录后页面和可读取依据，而非只看 HTTP 200 或页面标题。
4. 必要时在同一上下文正常导航到 SIS、Canvas、图书馆等子系统，建立各自会话；不假定主门户登录等于所有模块已登录。
5. 关闭专用窗口后，再运行一次查询验证冷启动复用。验证失败就返回对应系统需要重新登录，不导入日常 Chrome Cookie。

提议数据根目录：`~/.hkustgz-cli/`；允许 `HKUSTGZ_CLI_HOME` 覆盖。包含版本化配置、`profiles/<browser>/`、可选缓存和诊断日志；均在源代码目录之外。

v0.1 每个 CLI 数据根目录对应一个学校账号。多账号暂不做；切换账号需退出并重新登录。浏览器上下文内共享正常 SSO，会话状态按服务分别检测。初期使用一个选定浏览器的专用 profile；禁止多进程同时修改。

持久化浏览器状态并不保证 sessionStorage、内存 Token 或设备验证可跨进程恢复。必须实测：若查询依赖此类短期状态，通过正常页面流程重新建立，不持久化臆测的鉴权参数。

`auth status <service>` 使用 authenticated / unauthenticated / unknown，记录被验证服务及时间；`auth status --all` 顺序检查。`auth logout` 关闭本工具拥有的进程后清理工具本地认证状态和私有缓存，说明这不等于撤销学校服务器上的所有会话。只删除已确认归属本工具的数据目录，不接触日常浏览器。

## 7. 数据读取和能力验证

每个适配器在正常操作中完成一次受控取证：入口和重定向链、请求方法/路径、必需查询字段、鉴权载体类型、分页、日期与时区、空数据/过期/无权限响应。只保存脱敏结构；不将 Token、Cookie、授权码和其他同学的预约内容写入 fixtures。

请求清单中单独标记业务语义。查询可能使用 POST，不能只凭 HTTP 方法认定有写入；同样 GET 也不天然保证只读。所有自发请求限于已确认只读且当前用户正常可访问的操作。

### myPortal

- 首先核对应用目录、公告列表与详情、日程的正常页面请求。
- 若只能读 DOM，分页/加载更多必须可观测，区分完整列表与当前可见子集。
- 日程保留来源 ID、事件 ID、起止时间、课程代码/班次等实际字段。不能通过标题相似直接删除疑似重复项；无稳定 ID 时标记重复候选并保留来源。

### SIS 与 Catalog

- SIS 个人课表是本人上课安排的主要来源；Catalog 是课程和班次、名额信息来源，不能互相替代。
- 课程时间建模为有效日期范围、星期、起止时间、多段 meeting、地点及实际可见例外信息；不能用每周重复规则虚构节假日或停课。
- `today` 依据学校时区和选定学期过滤；原始时间不明时返回 unknown，不猜测。
- 容量、已选、余量、候补分别保留来源值；不强制用容量减已选推算实际可选名额，限制说明同时输出。
- 学期和课程详情以稳定业务 ID 查询。默认学期由系统事实决定并回显，不仅根据当前月份推断。
- Catalog 必须验证筛选是否真实生效及虚拟列表/分页加载，不能把首屏当成全校课程。
- 成绩独立发现真实入口；区分未发布、没有历史记录、未授权和解析失败，不从 Canvas 分数推定学校正式成绩。

### Canvas

- 初始查询样本为课程、课程公告、作业和限定日期的 Planner；字段与分页以本校实测为准。
- 标准 API 是候选，不假定本校已启用第三方 OAuth。公开分发不得要求同学手动生成并粘贴个人访问 Token；不得在 npm 包内分发 OAuth client secret。
- 若要发布正式 API 模式，必须先落实学校批准的客户端和适合本地 CLI 的授权方式；否则不实现该模式。方案不包含为保密 OAuth secret 新增云端服务。
- 另一候选是用户正常登录专用浏览器、读取其可见页面或正常页面响应；这也需核对学校/平台规则及可维护性，不能把它当作绕过 API 政策的办法。
- 若两种模式都无法满足要求，Canvas 保持待验证并调整发布范围，不宣称五项全部可用。
- 作业截止时间优先当前学生有效时间，保留缺失和覆盖信息；手动标记完成、已提交、已评分是不同状态。Planner 待办不能单独充当完整作业清单。

### Booking

- 分类入口与供应系统适配分离；先支持 `library`，其余类型分别发现和声明能力。
- 图书馆房间必须处理楼层、日期、分页、开放区间、占用区间及规则。先证明时间轴对应的精确起止时间可读取。
- 可用区间 = 已确认开放区间减去已确认占用区间，再考虑已观察到的预约规则；只有两个来源均完整时才返回 available。
- 没有占用记录不能证明开放，空白时间轴不能证明可预约，非开放与未知要单独表示。
- 对外只输出空间和占用时段，不输出其他同学的姓名或预约主题。本人预约记录在本人页面核实后单独支持。
- 不点击空闲格建立预约草稿、不提交预约表单、不发取消/签到请求。

## 8. CLI 契约提议

```text
hkustgz-cli --help | --version
hkustgz-cli doctor
hkustgz-cli capabilities
hkustgz-cli auth login <service>
hkustgz-cli auth status <service> | --all
hkustgz-cli auth logout
hkustgz-cli portal apps
hkustgz-cli portal notices [--query <text>] [--limit <n>]
hkustgz-cli portal notice <id>
hkustgz-cli portal agenda --from <date> --to <date>
hkustgz-cli sis terms
hkustgz-cli sis timetable [--term <id>]
hkustgz-cli sis today [--date <date>]
hkustgz-cli sis history [--term <id>]
hkustgz-cli sis grades [--term <id>]
hkustgz-cli catalog search <text> [--term <id>]
hkustgz-cli catalog course <id> [--term <id>]
hkustgz-cli canvas courses
hkustgz-cli canvas announcements --course <id>
hkustgz-cli canvas assignments --course <id>
hkustgz-cli canvas agenda --from <date> --to <date>
hkustgz-cli booking providers
hkustgz-cli booking rooms --provider library [--floor <id>]
hkustgz-cli booking availability --provider library --room <id> --date <date>
hkustgz-cli booking mine --provider library --from <date> --to <date>
```

候选命令可在 capabilities 中声明 pending，但不可作为正常可用能力提前发布。所有命令均有 `--help`；服务名称限定为已声明的 provider，不接受任意 URL 注入请求。

课程历史与成绩是独立能力：history 展示学校实际返回的历史课程、班次、学期、学分及课程状态，不要求每条记录有成绩；grades 仅展示学校可见的正式成绩字段。两者分别取证和验收，不能以其中一个替代另一个。

stdout 默认一个 JSON envelope；`--format table` 为人类输出。日志、浏览器提示及进度写 stderr。CLI 查询不隐式等待登录；非交互调用发现会话过期即退出，只有明确 `auth login` 才进入用户接管流程。

统一结构示例（所有值均为合成示例）：

```json
{
  "ok": true,
  "data": { "items": [] },
  "meta": {
    "schemaVersion": "1",
    "service": "catalog",
    "sourceUrl": "https://sisn.hkust-gz.edu.cn/cq",
    "fetchedAt": "2026-10-26T20:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "readMethod": "dom",
    "coverage": "complete",
    "cache": { "hit": false },
    "warnings": []
  }
}
```

`coverage` 为 complete / partial；缺字段使用 null 并说明原因，不用 0 代替未知。`sourceUrl` 去除临时票据、授权码等敏感参数。

分页默认尽量完成用户请求，返回页数、记录数及覆盖范围。`--limit` 或资源上限造成截断时 coverage=partial，保留已取得数据与明确原因；只有上游存在可复用游标且确认可跨进程时才提供 nextCursor。否则返回分页位置或具体重查建议，不承诺虚假的续传 Token。

退出码：0=完整查询成功（包括已确认空结果）；1=非预期内部错误；2=参数错误；3=需登录；4=无权限；5=网络/超时/限流；6=页面或响应不兼容；7=明确部分结果；8=功能未支持；9=profile 被占用。部分结果 `ok=false`、`error.code=PARTIAL_RESULT`，允许 data 携带已验证子集，Agent 不能把它当作全量结果。

## 9. 查询边界、性能与本地数据

- 默认一次启动一个 CLI 专用浏览器上下文，完成查询后关闭；无常驻浏览器依赖。同 profile 冲突直接返回 PROFILE_BUSY 并提示等待/关闭本工具窗口，不自行抢锁。
- 查询默认总预算 90 秒、单次页面/请求等待最多 30 秒，均受总预算限制；交互登录预算 10 分钟。超时处理关闭本工具上下文并释放锁，不杀端口上的未知进程。
- 显式只读请求遇瞬时网络错误最多重试一次；遇 401/403 不重试；429 尊重 Retry-After，等待将超总预算则返回结构化错误。
- 同来源查询串行，额外自发业务请求间隔默认至少 500ms；正常页面自身请求不以拦截改写方式强行节流。
- 单次列表默认上限 20 页或 2000 条，以先到为准；日期区间默认 7 天、最大 31 天。完整本学期课表是明确例外，读取一个学期并披露学校提供的覆盖范围。
- v0.1 私有结果不落盘缓存；在单次命令内复用已取结果。后续跨命令缓存需单独决定。公开 Catalog 结果可缓存 5 分钟，回显 fetchedAt/cache 信息；`--refresh` 只跳过本地缓存，不暗示强制学校更新。
- 查询结果默认不额外保存文件；用户自行重定向 JSON。普通日志只记录模块、阶段、耗时、错误码，不记录响应体或身份数据。
- profile 等敏感目录在 POSIX 下限制为用户访问；Windows 按本用户 ACL 处理。不能将“不保存密码”等同于“登录态不敏感”，本方案不承诺浏览器 profile 全盘加密。
- 不默认收集遥测。诊断导出需显式命令并经过字段级脱敏；默认不生成 HAR、截图或完整 trace。

## 10. 包管理、发布与维护

- 使用 npm 分发编译产物和内置文档，候选安装方式为 `npm install -g hkustgz-cli` / `npx hkustgz-cli`。包名可用性未检查，正式发布前确认；若冲突采用明确 scope，不冒用现有包。
- 安装阶段不启动浏览器、不登录、不执行校园查询、不自动安装大量工具。Chrome/Edge 可用时复用程序但使用专用 profile；需要 Chromium 时通过明确的 browser install 操作安装固定匹配版本。
- 校园数据查询在用户电脑与学校系统之间发生，不经过作者服务器。Skill 可单独安装；v0.1 不建设 MCP 服务。
- SemVer 管理 CLI/JSON 兼容性；schemaVersion 单独管理，破坏字段语义必须升级。发布前验证包内没有 profile、原始抓包或个人样例。
- 上游网页变化时禁用受影响能力或报 ADAPTER_CHANGED，不用旧缓存伪造成功。更新通过正常 npm 版本，不从远端拉取执行任意解析脚本。
- 若复用 szu-cli 的实际代码，记录出处并保留 MIT 所需声明；仅参考思路与复制代码须区分。学校名称只表明适配对象，不使用官方身份或校徽暗示背书。

## 11. 验证与阶段交付

2026-10-27 认证补证与用户确认：SIS 冷启动停在自身 `/auth-sign` 登录入口，点击正常 Login 后可借助已有学校 SSO 恢复本人课表，无需再次输入密码；Canvas 冷启动可读本人课程列表。用户明确批准 CLI 沿已验证流程恢复有效SSO，遇人工认证即停止普通查询。Task 2 据此先实现 Portal/SIS/Canvas 的认证基础；Booking/Library 和业务读取完整性继续保留证据门槛，不将公开页面或成功空数组当作身份验证。

### R0：补齐证据，不做产品实现

对五个模块分别产出脱敏的访问链、必要字段、认证状态、分页与空结果判据；补齐成绩和本人预约入口。明确 Canvas 可分发的认证路线。所有未知保留为未知，不写猜测端点。

### R1：经另行同意的登录复用实验

在新专用 profile 中由用户正常登录，关闭后重启；分别验证门户、SIS、Canvas、图书馆访问。研究用日常 Chrome 结果不能代替此验收。若 sessionStorage/短期 Token 无法复用，记录恢复流程和用户交互要求。

R0/R1 失败不能通过关闭 TLS 校验、导入个人 Chrome Cookie、硬编码 Token 或绕过验证码补救。必须返回设计调整，或取得所需的学校支持。

### I1：基础 CLI 与第一个读取模块

设计经用户批准、实施计划完成后再实现 doctor、capabilities、登录状态、profile 锁和统一输出；用 Catalog 课程查询或 SIS 课表完成一条真实链路，选择取决于 R0/R1 的证据。

### I2：按系统增加能力

逐项完成 portal、sis、catalog、canvas、booking-library；每个命令分别验收并更新能力表，不因某条查询成功而宣布整个系统兼容。

### I3：发布验收

下列验收针对最终经用户确认纳入该版本的能力；验证失败不得自行删掉能力再宣称完成。默认目标仍是五个模块均有本方案约定的核心读取能力；如 Canvas 等整项受阻，只能交付明确标注缺项的 alpha，或先由用户确认修订版本范围。成绩、课程历史、本人预约记录等条件能力的取舍也必须记录在版本能力表中，并在稳定版范围确认时明确。尚未发布的功能仍在 capabilities 中标为 pending/unsupported，不被测试总数掩盖。

- 同一个干净专用 profile 能完成正常登录与冷启动复用，且会话过期能明确要求重登。
- 课表在至少一个完整周与学校页面逐项对照；跨日期、多时段、空课表及未知例外不被错误归一化。
- 课程历史与成绩如纳入版本，分别核对学期与记录完整性、无成绩课程、未发布成绩和确实空记录；不把成绩缺失等同于没有修课历史。
- Catalog 样本验证搜索、学期、分页、余量及限制字段；记录来源更新时间语义。
- Canvas 验证列表覆盖范围、分页、学生有效截止日期和提交状态；认证分发条件已落实。
- Booking 验证超过一页的房间列表、开放和占用边界、未知时段及本人记录；不产生预约写入。
- 必测登录失效、403、空结果、429、接口变更、分页中断、profile 冲突、进程中断后的资源清理。
- 对外承诺 macOS/Windows 支持前，分别做真实浏览器安装/登录冒烟；只跑 mock 不能声称平台验收。
- 发布前邀请另一名自愿学生在自己的电脑和账号上验证；不索取其 Cookie、密码或原始成绩。没有第二账号验证时仅标个人 alpha，不宣称普遍适配。

测试组合为解析器/CLI 契约测试、脱敏 fixtures 回放、可控浏览器集成测试与手动真实系统只读验收。CI 不登录真实学校账号，真实校园凭据不上传 CI。

## 12. 当前需确认与实施者可自行决定的事项

### 请用户审阅的技术提议

1. 采用 Node.js 24 + TypeScript + Playwright，面向 npm 分发，CLI 本地运行。
2. 混合读取路线：按模块证据选择正式 API、浏览器响应或 DOM，不一刀切。
3. Booking 的首个实现覆盖图书馆；其他空间类型保持发现/待验证，后续逐类增加。
4. macOS 先验证，面向同学的稳定版同时验收 Windows；Linux 暂为实验支持。
5. Canvas、成绩、本人预约记录以真实证据为发布条件，若受限需明确调整版本范围。

### 留给实施者的常规选择

命令解析/schema 库、打包工具、测试文件组织、精确依赖版本、内部类型命名，以及不改变用户可见语义的模块拆分。

### 当前没有做的事

项目目录和文档已归集，开发 Spec 与分阶段计划已创建；Git 仓库、产品依赖和基础 CLI 已建立，Task 1 已验收。Task 0 已观察部分真实页面请求并进行专用 profile 实验，冷启动本人数据读取尚未通过；详见 docs/research 和 docs/acceptance/session-reuse.md。尚未发布 npm 包。后续以开发 Spec 和实施计划为工作依据，具体执行状态记录在计划中。

2026-10-27 开发进度：Task 2修复提交c3bafa6已获用户验收。Task 3查询基础层已实现预算、分页与部分结果、学校日期及统一脱敏，等待独立模块人工审查；仍未启用业务能力或进入Task 4。
