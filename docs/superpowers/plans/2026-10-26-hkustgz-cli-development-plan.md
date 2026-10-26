# hkustgz-cli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户明确同意实施后，开发可供港科广同学独立安装的五模块只读 CLI。

**Architecture:** 专用浏览器建立用户正常会话，各系统使用经证据确认的 API、响应监听或 DOM 路线。CLI、会话、读取适配器和纯解析器分离，返回版本化 JSON 与明确覆盖范围；Canvas 和各条件能力不能跳过可行性验证。

**Tech Stack:** Node.js 24 LTS、TypeScript strict/ESM、Playwright、Commander、Zod、node:test；tsx 仅开发测试使用。

**Spec:** [开发 Spec](../specs/2026-10-26-hkustgz-cli-development-spec.md)；同时阅读[上位技术方案](../specs/2026-10-26-hkustgz-cli-design.md)。

## Global Constraints

- 用户已授权按模块实施；每个模块完成后必须等待用户审查通过再继续。当前执行范围为 Task 1 基础 CLI；Task 0、2–9 未完成，登录实验和发布不因基础模块开发而自动执行。
- Node.js 24 LTS + TypeScript strict；发布编译后的 ESM，普通用户不需要 TypeScript 或 tsx。
- 第一阶段只做查询；不选退课、不加入购物车、不提交作业、不创建或取消预约、不支付、不修改校内日程或已读状态。
- 查询默认总预算 90 秒、单次页面/请求等待最多 30 秒，均受总预算限制；交互登录预算 10 分钟。
- 显式只读请求遇瞬时网络错误最多重试一次；遇 401/403 不重试；429 尊重 Retry-After，等待将超总预算则返回结构化错误。
- 同来源查询串行，额外自发业务请求间隔默认至少 500ms；正常页面自身请求不以拦截改写方式强行节流。
- 单次列表默认上限 20 页或 2000 条，以先到为准；日期区间默认 7 天、最大 31 天。完整本学期课表是明确例外。
- v0.1 私有结果不落盘缓存；公开 Catalog 结果可缓存 5 分钟，未证明公开前不启用。
- macOS 开发先行；稳定版宣称 Windows 支持前必须完成 Windows 真实浏览器验收；Linux 标为实验支持。
- 不要求其他同学粘贴 Canvas 个人 Token、不分发 client secret；能力验证失败不得自行删功能再宣称完成。
- 所有产品路径相对当前项目根目录 `/Users/lukaspeng/project/有意思和有用的proj/hkustgz-cli/`；上位设计、开发 Spec 和本计划已归集到本目录 docs，无需重复复制。已建立 Git 文档基线和 feat/cli-foundation 开发分支；按用户指定目录原地工作，不创建额外 worktree。
- 每个代码任务独立通过其测试后，在未来仓库中只提交该任务列出的文件。不得夹带本机认证状态和研究原始数据。

## Review Focus

1. HTTP 200 实为登录页：不得返回成功空列表；Task 2/3 测试固定为 LOGIN_REQUIRED 或明确 unknown。
2. 分页超时或用户 limit：保留可信子集并退出 7，不能静默少数据；Task 3/4/8 负责。
3. 午夜、跨学期和课程例外缺失：不能按电脑时区猜上课安排；Task 3/5 负责。
4. Cookie 可复用不代表内存 Token 可复用：新进程登录态必须重验，不能导入个人 profile；Task 0/2 负责。
5. 图形时间轴空白、Canvas 完成标记：空白不等于可订，完成不等于提交；Task 7/8 负责。

## 阶段与依赖

本项目有多个系统。先执行共享证据与基础层，再按 Catalog→SIS→Portal→Canvas→Booking-library 分模块交付；每个模块可单独验收，不把五套适配器当成一个任务。实际端点尚未知，因此 Task 0 是真实适配器启用及认证实施的强制前置；不访问校园系统的 Task 1 可先独立实现，所有业务能力保持 pending。Task 4–8 的读取细节由各自证据记录约束。

若 Task 0 发现必须改变认证、产品范围或字段语义，先修订设计/Spec，不以“执行计划”为由猜接口。Canvas 受阻不阻止完成其他模块 alpha，但阻止宣称五项完整稳定版。

阶段：Task 0 证据及实验 → Task 1–3 核心 → Task 4–8 模块 → Task 9 分发验收。由主代理执行；可使用独立代理进行代码审阅。用户要求每模块人工审查，因此不连续执行后续模块。

---

### Task 0：五模块读取证据与专用会话实验

**Files:** Create `docs/research/{portal,sis,catalog,canvas,booking-library}.md`、`docs/research/evidence-index.json`、`docs/acceptance/session-reuse.md`。

**Interfaces:** Consumes：技术方案 E1–E6、开发 Spec §8。Produces：每能力的 evidenceId、确认的读取路线、源字段映射、已核实域名/重定向链、分页结束/空数据/认证判据；`evidence-index.json` 条目包含 capabilityId/service/state/evidenceId/readMethod/documentPath；没有证据的 state=pending。

- [ ] Step 1：获准后正常访问本人可见页面，按 Spec §8 逐模块记录观察。只读取必要数据，不尝试未发现的 URL，不提交业务表单。
- [ ] Step 2：分别验证 Catalog 搜索是否生效、SIS 历史与成绩入口、Canvas 个人有效时间、图书馆本人预约和占用精确边界；没有入口也写出明确结果与版本影响。
- [ ] Step 3：经用户同意实验后，在新专用 profile 正常登录、关闭、重开，逐服务核实复用；记录成功与失败层，不复制日常 Chrome Cookie。Canvas 补充面向其他同学分发的认证结论。
- [ ] Step 4：人工检查记录均无凭据、私人标识、他人预约内容，且每个拟实现能力均有读取及完整性证据；未通过者不交给后续适配器任务。
- [ ] Step 5：建立未来仓库时一并提交脱敏研究记录，提交主题 `docs: record verified campus read flows`。这是研究任务，不用 mock 测试替代真实证据。

### Task 1：可安装入口、统一结果与能力表

**状态：实现及首轮审查修复完成，27项测试及类型检查通过；等待用户复审。**

**Files:** Create `package.json`、`package-lock.json`、`tsconfig.json`、`tsconfig.build.json`、`.gitignore`、`bin/hkustgz-cli.mjs`、`src/cli/{main,render}.ts`、`src/core/{contracts,errors,capabilities}.ts`、`tests/{contracts,cli,capabilities}.test.ts`。

**Interfaces:** Consumes：Spec §4 的全部公开结构与 Task 0 evidence index。Produces：`executeCommand`、`classifyError`；`CliDependencies` 含 `now:()=>number`、`capabilities:Capability[]`、`sessionRunner:SessionRunner`、`handlers:Record<string,CommandHandler>`；`CommandHandler=(args:Readonly<Record<string,unknown>>, deps:CliDependencies)=>Promise<QueryResult<unknown>|ControlResult<unknown>>`；`ControlResult<T>={ok:true,data:T,meta:{schemaVersion:'1',command:string}}`。失败统一由 CLI 捕获为 Failure。SessionRunner 接口在本任务定义，Task 2 实现。

- [x] Step 1：建立本任务测试运行必需的最小 package/TS 配置，锁定工具链；确认现有上位设计、Spec、计划位于本仓库 docs，并纳入后续版本管理。`build` 采用 tsc，bin 导入 `dist/cli/main.js`；测试使用 `node --import tsx --test <test-file>`。
- [x] Step 2：写失败测试 `help_does_not_open_browser`、`unknown_option_exits_2`、`pending_capability_exits_8`、`one_json_document_on_stdout`。示例断言：`assert.equal(result.exitCode, 8); assert.equal(JSON.parse(result.stdout).error.code, 'CAPABILITY_PENDING'); assert.equal(openCount, 0)`。
- [x] Step 3：运行 `node --import tsx --test tests/contracts.test.ts tests/cli.test.ts tests/capabilities.test.ts`，确认因为尚无 executeCommand/能力检查而失败；不是依赖或语法错误。
- [x] Step 4：实现上述接口、所有拟定命令的帮助与参数 schema；仅注册 verified handler。控制命令可用，pending/unsupported 不启动浏览器；JSON/table 使用同一数据模型，日志不混入 stdout。实现 Spec 的退出码映射，strip 临时 sourceUrl 参数。
- [x] Step 5：运行同一测试命令及 `npm run build`，全部通过后提交 `feat: establish cli contracts and capability registry`；帮助/版本在编译后 bin 上复验。

### Task 2：专用浏览器、认证状态与进程互斥

**Files:** Create `src/session/{paths,browser,lock,auth}.ts`、`tests/{paths,session,auth}.test.ts`。Modify `src/core/contracts.ts`（落实本节类型），`src/cli/main.ts`（注册控制命令）。

**Interfaces:** Produces：`DataPaths={root:string;profile:string;cache:string;logs:string}`；`Session={service:ServiceId;page:Page;context:BrowserContext}`；`SessionOptions={browser:'chrome'|'edge'|'chromium';headless:boolean;deadlineMs:number;purpose:'query'|'login'}`；`SessionRunner=<T>(service:ServiceId,options:SessionOptions,run:(session:Session)=>Promise<T>)=>Promise<T>`；paths/browser/auth 使用 Spec §4 签名。锁导出 `acquireProfileLock(profile:string):Promise<{release:()=>Promise<void>}>`。

- [ ] Step 1：写 `same_profile_rejected_as_busy`、`different_browser_profiles_are_separate`、`http_200_login_page_is_not_authenticated`、`callback_error_closes_owned_context`、`unknown_auth_remains_unknown`。断言第二个锁返回 PROFILE_BUSY/9、上下文 close 一次、auth.state 不因 title 匹配而成功。
- [ ] Step 2：运行 `node --import tsx --test tests/paths.test.ts tests/session.test.ts tests/auth.test.ts`，确认缺失实现导致失败。
- [ ] Step 3：实现专用路径、原子锁目录与归属元信息、浏览器选择和正常生命周期；不自动抢占已有锁。doctor 可报告疑似遗留锁，不删除未经核实归属的内容。登录/状态依据 Task 0，各服务单独判定；logout 只清理本工具归属的数据。
- [ ] Step 4：补充超时、SIGINT/SIGTERM 清理测试和“清理失败仍报告”的用例；auth login 交互预算 600000ms、查询默认 90000ms。使用本地测试网页验证会话，不在自动测试中登录学校。
- [ ] Step 5：运行上述测试及 build；按 Task 0 记录手工复验冷启动后提交 `feat: manage dedicated browser sessions and auth`。真实登录实验需已有同意，不将单元测试成功当作本校登录验证。

### Task 3：有界查询、分页、日期与脱敏

**Files:** Create `src/core/{query,policy,sanitize}.ts`、`tests/{query,policy,sanitize}.test.ts`。Modify `src/core/contracts.ts`。

**Interfaces:** `PageBatch<T>={items:T[];next:string|null;exhausted:boolean;emptyConfirmed:boolean}`；`PageSource<T>={readPage:(cursor:string|null,signal:AbortSignal)=>Promise<PageBatch<T>>}`；`Collected<T>={items:T[];pagesRead:number;recordsRead:number;coverage:Coverage;truncationReason:QueryMeta['truncationReason']}`；`collectPages` 使用 Spec 签名；`resolveDateRange(input:{from?:string;to?:string},nowMs:number):DateRange`；`sanitizeSourceUrl(value:string):string`。部分结果由 query 层包装成 PARTIAL_RESULT，解析器不私自更改 coverage。

- [ ] Step 1：写 `page_21_is_not_requested`、`record_2001_is_not_returned`、`limit_is_partial`、`unconfirmed_empty_is_not_success`、`page_failure_preserves_prior_rows`。例如 limit=1、来源有 2 条时断言 `coverage==='partial'` 且 `truncationReason==='limit'`。
- [ ] Step 2：运行 `node --import tsx --test tests/query.test.ts tests/policy.test.ts tests/sanitize.test.ts` 确认失败。
- [ ] Step 3：实现总预算、每次 30 秒上限、20页/2000条、最小500ms串行请求间隔、瞬时失败最多重试一次；401/403不重试，429的等待不能越过总预算。先取得的可信数据在后续失败时保留，无可信数据则返回原结构化错误。
- [ ] Step 4：补日期测试：学校午夜与主机时区不同、2026-02-30 非法、31天允许/32天拒绝、from>=to拒绝。补脱敏测试：`code`/`ticket`/`tt`/`access_token` 等已识别临时参数移除，普通课程和日期参数保留；模拟 fixture 的凭据标记不能进入 stdout/stderr。
- [ ] Step 5：运行同一测试及 build，通过后提交 `feat: bound queries and preserve coverage semantics`。不要为失败响应编造下一页游标。

### Task 4：Catalog 搜索与班次读取

**Files:** Create `src/adapters/catalog/{index,parser,model,manifest,cache}.ts`、`tests/{catalog,catalog-cli}.test.ts`、`tests/fixtures/catalog/`。Modify handler 注册和能力表。

**Interfaces:** Consumes SessionRunner、collectPages、QueryOptions；Produces `searchCatalog(input:{text:string;termId?:string},options:QueryOptions):Promise<QueryResult<{items:CatalogCourse[]}>>` 和 `getCatalogCourse(input:{id:string;termId?:string},options:QueryOptions):Promise<QueryResult<CatalogCourse>>`。CatalogCourse/section 字段严格使用 Spec §7.3，源字段映射引用本模块 evidenceId。

- [ ] Step 1：从 Task 0 的已核实结构创建合成 fixture，写 `search_is_applied`、`meetings_preserve_merged_rows`、`available_is_not_recalculated`、`virtual_list_is_not_full_catalog`。例如 quota=80、enrolled=79、来源 available=0 时断言输出仍是0。
- [ ] Step 2：运行 `node --import tsx --test tests/catalog.test.ts tests/catalog-cli.test.ts` 确认失败。
- [ ] Step 3：实现证据记录规定的读取路线、源 schema 校验、稳定 ID、学期回显和分页；缓存只允许已证实公开数据，TTL=300000ms，--refresh跳过本地缓存。
- [ ] Step 4：复跑测试并在真实页面对照关键词、学期及至少两页记录；标记页面15–20分钟更新语义，不声称实时。没有公开性证据时测试确认不写缓存。
- [ ] Step 5：通过契约、build及真实验收后更新 verified 和 evidenceId，提交 `feat: query catalog courses and class quotas`；只通过 fixture 时保持 pending。

### Task 5：SIS 学期、课表与条件学业记录

**Files:** Create `src/adapters/sis/{index,parser,model,manifest}.ts`、`tests/{sis,sis-cli}.test.ts`、`tests/fixtures/sis/`。Modify handler 注册和能力表。

**Interfaces:** Produces `listTerms(options:QueryOptions):Promise<QueryResult<{items:Term[]}>>`、`readTimetable(input:{termId?:string},options:QueryOptions):Promise<QueryResult<Timetable>>`、`readToday(input:{date?:string;termId?:string},options:QueryOptions):Promise<QueryResult<TodayCourses>>`；条件能力 `readHistory`、`readGrades` 的输入均为 `{termId?:string}`，输出分别 `{items:HistoryCourse[]}` 与 `{items:Grade[]}` 的 QueryResult。类型按 Spec §7.2 定义，不能共享同一个“历史=成绩”模型。

- [ ] Step 1：写 `multiple_meetings_remain_distinct`、`today_uses_school_timezone`、`unknown_exceptions_warn`、`unpublished_grade_is_not_empty_history`；断言历史课程保留无成绩记录、未知成绩不变成0、未知例外附 warnings。
- [ ] Step 2：运行 `node --import tsx --test tests/sis.test.ts tests/sis-cli.test.ts` 确认失败。
- [ ] Step 3：实现已核实的学期与本人课表读取、日期过滤；无当前学期证据则要求 --term。历史与成绩仅在其 Task 0 证据通过时实现，否则注册明确 pending 能力，不借 Canvas 替代。
- [ ] Step 4：测试并逐项对照一完整周、跨日期、多教室/多教师、已知调课/取消样本；未观察到的例外覆盖保持 unknown。条件能力如纳入发布，独立手工验收。
- [ ] Step 5：build与验收通过后提交 `feat: query personal sis timetable and academic records`，能力表逐命令标识，不以课表成功宣布所有学业功能支持。

### Task 6：Portal 应用、公告与日程

**Files:** Create `src/adapters/portal/{index,parser,model,manifest}.ts`、`tests/{portal,portal-cli}.test.ts`、`tests/fixtures/portal/`。

**Interfaces:** Produces `listPortalApps(options:QueryOptions)`、`listPortalNotices(input:{query?:string},options:QueryOptions)`、`readPortalNotice(input:{id:string},options:QueryOptions)`、`readPortalAgenda(input:DateRange,options:QueryOptions)`；均返回 QueryResult，数据依次为 `{items:PortalApp[]}`、`{items:PortalNotice[]}`、`PortalNoticeDetail`、`{items:PortalEvent[]}`。类型字段按 Spec §7.1。

- [ ] Step 1：写 `similar_events_from_two_sources_survive`、`notice_load_failure_is_not_empty_list`、`temporary_app_ticket_is_not_stable_id`，断言疑似重复不删行，失败不产生成功空数组。
- [ ] Step 2：运行 `node --import tsx --test tests/portal.test.ts tests/portal-cli.test.ts` 确认失败。
- [ ] Step 3：实现应用目录、公告分页/详情、限定日期日程，遵循源事件ID和来源；不扩展邮件、校园卡财务或跨系统自动聚合功能。
- [ ] Step 4：运行测试、build和真实页面对照，明确公告分类/查询覆盖及疑似重复来源；列表不完整返回 partial。
- [ ] Step 5：按验收更新能力表后提交 `feat: query portal apps notices and agenda`。

### Task 7：Canvas 学习信息读取

**Files:** Create `src/adapters/canvas/{index,parser,model,manifest}.ts`、`tests/{canvas,canvas-cli}.test.ts`、`tests/fixtures/canvas/`、`docs/acceptance/canvas-auth.md`。

**Interfaces:** Produces `listCanvasCourses(options:QueryOptions)`、`listCanvasAnnouncements(input:{courseId:string},options:QueryOptions)`、`listCanvasAssignments(input:{courseId:string},options:QueryOptions)`、`readCanvasAgenda(input:DateRange,options:QueryOptions)`；数据分别为 `{items:CanvasCourse[]}`、`{items:CanvasAnnouncement[]}`、`{items:CanvasAssignment[]}`、`{items:CanvasAgendaItem[]}` 的 QueryResult；类型遵循 Spec §7.4。

- [ ] Step 1：核实 Task 0 的认证分发结论。若未通过，记录阻碍、保留 pending，此任务不开始真实读取实现；不得以手动个人Token或公开secret补救。
- [ ] Step 2：条件通过后写 `student_due_date_wins_over_base`、`marked_complete_is_not_submitted`、`planner_does_not_claim_all_assignments`、`pagination_preserves_course_scope`。例如 markedComplete=true、未证实提交时断言 submissionStatus=unknown。
- [ ] Step 3：运行 `node --import tsx --test tests/canvas.test.ts tests/canvas-cli.test.ts` 确认失败，再实现已批准/核实的读取路线与上述函数；只读请求不创建 Planner override 或已读状态。
- [ ] Step 4：复跑测试、build，并在本人真实页面核对课程范围、作业有效截止日期、公告、分页和登录失效；无法确认学生有效时间时保留来源及 unknown，不假装已覆盖全部作业。
- [ ] Step 5：验收后更新能力表，提交 `feat: query canvas courses assignments and agenda`；若认证受阻，单独提交脱敏阻碍记录并回到版本范围决策，不宣布功能完成。

### Task 8：Booking 分类与图书馆可用区间

**Files:** Create `src/adapters/booking/{index,model,manifest}.ts`、`src/adapters/booking-library/{index,parser,model,manifest,intervals}.ts`、`tests/{booking,booking-intervals,booking-cli}.test.ts`、`tests/fixtures/booking-library/`。

**Interfaces:** Produces `listBookingProviders(options:QueryOptions):Promise<QueryResult<{items:BookingProvider[]}>>`、`listLibraryRooms(input:{floorId?:string},options:QueryOptions):Promise<QueryResult<{items:Room[]}>>`、`readLibraryAvailability(input:{roomId:string;date:string},options:QueryOptions):Promise<QueryResult<RoomAvailability>>`；条件能力 `listOwnLibraryBookings(input:DateRange,options:QueryOptions):Promise<QueryResult<{items:OwnBooking[]}>>`。`Interval={start:string;end:string}`，值为含时区偏移的 ISO 时间；`computeAvailability(input:{target:Interval;open:Interval[];busy:Interval[];coverage:'complete'|'partial'|'unknown'}):{available:Interval[];unknown:Interval[]}` 使用 [start,end) 和 Spec BOOK-02/03。target 为请求日期的当地整天，缺少完整开放/占用证明时保守返回该目标区间 unknown，不从空open数组推导“全天关闭”。

- [ ] Step 1：写 `nineteen_rooms_require_second_page`、`empty_grid_is_not_available`、`adjacent_intervals_do_not_overlap`、`overlapping_busy_blocks_merge`、`other_users_details_are_removed`。合成 open=[08:00,12:00)、busy=[09:00,10:00) 时断言 available=[08:00,09:00)、[10:00,12:00)；coverage=unknown 时 available=[]，unknown 包含尚不能判断的目标区间。
- [ ] Step 2：运行 `node --import tsx --test tests/booking.test.ts tests/booking-intervals.test.ts tests/booking-cli.test.ts` 确认失败。
- [ ] Step 3：实现分类发现、图书馆分页、日期选择及经证据确定的时间区间读取；归一化占用后求差集，保留规则未知/不可订状态。不得通过点击时段创建草稿来验证。
- [ ] Step 4：测试与真实时间表至少两页、一个完整日期对照；本人记录若有证据再实现；其他供应商明确 pending/unsupported，测试拒绝任意 provider/URL。
- [ ] Step 5：运行 build并更新逐能力验收，提交 `feat: query library rooms and availability`。

### Task 9：打包、Skill、诊断和发布验收

**Files:** Create `src/cli/doctor.ts`、`tests/{doctor,package,privacy}.test.ts`、`README.md`、`LICENSE`、`skills/hkustgz-cli/SKILL.md`、`docs/acceptance/{release-scope,macos,windows,second-user}.md`；Modify `package.json` 发布白名单与 cli 注册。

**Interfaces:** `getDoctorReport(deps:CliDependencies):Promise<ControlResult<DoctorReport>>`；DoctorReport 含 Node/浏览器可用性、专用profile状态、能力状态及下一步建议，不输出账号、认证值或原始页面。`capabilities` 数据来源仍是共享能力表，不维护第二份事实。

- [ ] Step 1：写 `install_has_no_login_or_network_side_effects`、`pack_excludes_private_files`、`skill_matches_actual_commands`、`doctor_does_not_leak_identity`；合成私有目录名出现在文件树时断言不进入 tarball 白名单。
- [ ] Step 2：运行 `node --import tsx --test tests/doctor.test.ts tests/package.test.ts tests/privacy.test.ts` 确认失败。
- [ ] Step 3：实现 doctor、中文帮助/README和可选Skill；安装不配置Codex或其他客户端。发布仅bin/dist/必要docs/skills/LICENSE；构建不包含真实研究数据。复制代码时保留许可，许可证与发布账号由用户确认。
- [ ] Step 4：执行 `npm run build`、逐个运行全部已创建测试文件、`npm pack --dry-run --json`，在临时目录安装打包产物，验证bin版本、帮助、一个真实查询和失败场景。测试输出和人工验收分别记录，不能把计划命令写成已执行结果。
- [ ] Step 5：按Spec发布清单完成macOS/Windows各自真实浏览器验证、第二名学生自愿验证及最终范围确认；缺项只发明确alpha或请求调整范围。提交 `docs: prepare cli distribution and release acceptance`。实际 `npm publish` 不属于本计划自动执行动作。

## 需求覆盖索引

| 开发 Spec | 负责任务 |
|---|---|
| P-01/P-06、结果与错误契约、能力状态 | 1、9 |
| P-02、AUTH-01–08 | 0、2、9 |
| P-03/P-04/P-05、EVID-01–04 | 0、各模块、9 |
| G-01/G-02、参数与退出码 | 1 |
| G-03–08、分页、日期、重试、覆盖范围 | 3、5、8 |
| G-09/G-10、未知值和来源语义 | 3–8 |
| G-11、公开性与缓存 | 0、4 |
| G-12、认证信息及隐私边界 | 0、2、3、8、9 |
| PORTAL-01–02、SIS-01–02、CATALOG-01–03 | 4、5、6 |
| CANVAS-01–04、BOOK-01–05 | 7、8 |
| 跨平台、包管理、Skill、真实验收 | 9 |

## 计划自检记录

- 所有学校端点/选择器均由 Task 0 证据提供，没有用虚构接口推进适配器。
- 公开基础签名在Task 1/2/3定义，模块消费同一QueryResult/QueryOptions/SessionRunner；各模块业务类型独立。
- Review Focus 的五类风险分别归属具体失败测试；代码任务包括先失败、后通过的循环，研究任务不伪造TDD验收。
- 五模块分任务交付，条件能力可明确受阻；稳定版范围变化需用户确认，不能靠删测试通过。
- 文档中所有测试、build、打包、提交和发布验收均为未来步骤，当前没有执行。

## 执行交接

请先审阅开发Spec和本计划。开工前选择：由主代理按任务顺序实施，或每任务由独立实施/审阅代理执行。建议先由主代理连续完成证据和共享基础，再根据真实适配器规模决定是否拆给独立代理；学校会话实验只允许单一操作者串行使用，不能让多个代理共享profile并发探测。

若选择主代理方式，按 Superpowers executing-plans 执行；若明确选择子代理方式，按 subagent-driven-development 执行。在选定方法并批准开工前，不执行本计划。
