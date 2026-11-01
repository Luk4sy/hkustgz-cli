# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1（3681ae2）、Task 2（c3bafa6）均已获用户复审通过并验收。Task 3（32f0bab）已获用户验收。Task 4 Catalog（7b5c559）已获用户验收。Task 5 SIS（d708ac5）已获用户复审通过并验收。Task 6 Portal（2d547ff）已交付并实测，用户于2026-10-28授权继续Task7；既有公告覆盖限制保留。Task7 Canvas（34eb9e3）已于2026-10-29获用户复审通过并验收；Task8（62685a9）已于2026-11-01获用户复审通过并验收。本人已完成登录及课程冷启动复验；作业个人截止时间/提交状态证据缺失时unknown，Planner不代表全部作业。详见docs/acceptance/canvas-auth.md。Task 0 的 Portal/SIS/Canvas 认证子集已有证据，Booking/Library 专用会话查询已补证，通用认证控制状态仍为 unknown。Catalog两项、SIS三项、Portal四项及Canvas四项业务已验证（第七模块已验收），加上Booking四项共17项源码业务能力已有验证，SIS历史/成绩2项继续 pending；Portal公告全分类扫描当前仅保留已确认8条并返回partial，外部公告详情不支持。详见 docs/acceptance/catalog.md 及 docs/acceptance/query-core.md；不得猜学校接口或用模拟数据冒充真实查询。

Git 文档基线已建立，工作分支 feat/cli-foundation。按用户指定原目录工作。npm test（含构建）和 npm run typecheck 是当前验证命令。

2026-10-29 封装状态：第一至第四批已获用户验收（03064ce、e124993、fc7dda6、a85469b）。第五批 MIT 本地候选及生命周期验证已提交（73c5720），独立学生试用仍待完成。Windows 11＋Chrome＋Node 24＋Codex 的 alpha.2 候选（644756a）代码审查通过，仅有 Mac 回归与 Windows 模拟证据，Windows 真机仍待验收。现有13项查询已封装；其余6项pending能力未实现。未发布或对外分发。

## 后续开发与提交节奏（2026-10-29 用户约定）

后续按既有Spec逐模块开发，完成后测试并交付用户审查，验收前不进入下一模块。减少碎片提交：按完整、可审查的功能或模块形成本地提交；同一轮小型文档、样式及措辞调整集中提交，有独立意义的审查修复可单独提交。不为每次文件保存或小调整创建提交。开发过程中保持必要的本地检查点，不要求全部开发结束才首次提交。

先完成本轮功能开发与审查，再更新封装、Skill、帮助和打包验证。本地commit、推送GitHub、合并主分支和发布分别处理；用户后续明确要求同步时再push或创建/合并PR，不因已有origin自动推送。保留现有提交历史，不擅自压缩或改写已共享历史。

## CLI 与 Skill 版本同步（2026-10-30 用户约定）

后续封装将 CLI 与随包 Skill 作为同一版本交付，不能只迭代 CLI 而沿用过时 Skill。当前 alpha 阶段使用精确匹配：package.json、package-lock.json 根包版本、Skill metadata.version 和 compatible_cli 必须一致；schemaVersion 单独表示输出契约版本，不随每次发行机械递增。

模块开发与审查完成后，在封装批次统一更新版本、Skill 正文及引用文件、CLI 帮助、安装/升级文档，并验证命令、参数、能力状态、错误码与实际 CLI 一致。不能仅改 Skill 版本号而不核对内容。修改已交付内容时使用新版本，保留旧候选包及其校验记录，不以相同版本覆盖旧包。

封装验收必须覆盖：版本一致性、命令契约、tgz 隔离安装，以及旧 CLI/旧 Skill 升级到新版本后的识别和显式同步。CLI 安装与 Skill 安装是两个步骤；升级 CLI 不代表客户端已加载新 Skill，需检查 skill status，显式安装随包 Skill，并刷新客户端后验证识别。保留用户修改保护，不静默覆盖。

Agent 每次开始本项目查询工作流应先检查实际执行的 CLI --version，与当前已加载 Skill 的 compatible_cli 精确匹配；不匹配时停止校园查询，明确报告双方版本并指导同步，不能按旧指引猜新命令，也不能自动安装或降级。匹配后仍以 CLI capabilities 和命令 --help 为实际能力依据；Skill 未覆盖的新增能力应说明指引待同步，不自行推测。文档规则与既有测试不等于所有客户端都会自动强制执行，新增自动校验机制需单独实施并验收。

2026-10-30 Task8：四项Booking/Library只读查询已实现并实测，当前源码17/19项verified，待用户审查。availability规则unknown，available=[]不代表没空闲；mine限定源8454状态过滤。既有候选包/安装Skill未更新，模块验收后再统一封装；不推送或发布。详见docs/acceptance/booking-library.md。

2026-11-01 Task8交付：楼层异步绑定P2修复后258项全量测试全部通过（含Chrome，0跳过），构建、类型检查、差异检查通过；真实CLI分类8项/全楼59项/指定日开放占用/默认状态本人记录查询均通过。62685a9已获用户复审通过并验收；尚未开始新增封装或推送。构建仅自动生成源码Skill命令表，完整Skill版本/说明与安装状态待验收后同步。

2026-11-01 用户调整优先级：sis history与sis grades暂缓开发，保留pending，不删除既有命令；下一阶段优先预约相关功能。具体供应系统及查询/预约操作范围待本轮设计明确，继续沿用按模块审查的交付方式。

2026-11-01 用户授权本地同步：CLI与Codex归属Skill已安装为0.1.0-alpha.3，status=current，doctor全部通过。已验收17项业务及新增Booking指引进入新候选，旧候选保留。版本/安装升级/隐私相关23项通过，构建/类型/差异检查通过；本批未改业务读取代码，也未重复完整Chrome套件。另按用户明确授权进行了独立浏览器预约目录盘点，未新增其他供应商CLI能力、未提交预约、未保存私人盘点数据。详见docs/acceptance/alpha3-local-sync.md；不推送或发布。

2026-11-01 第二阶段范围：用户指定图书馆预约与取消闭环，并在Spec交付后授权继续。Spec见docs/superpowers/specs/2026-11-01-library-booking-phase-2-spec.md；当前仅开展L2-M0，计划见docs/superpowers/plans/2026-11-01-library-booking-phase-2-m0-plan.md。每模块必须停下等待用户审查与继续指令，不更新安装版本或提前进入M1。用户已分别就具体创建参数、信用规则及精确目标取消明确授权；正常网页创建一次、独立回查后取消一次，来源业务应答“删除成功”，样本预约已取消。后续不得重做创建/取消样本或猜最近一条。M0规则等关键证据仍有缺口、整体未通过，详见docs/acceptance/library-booking-phase-2-m0.md。取消应答丢失时记录消失不足以确认，仍须unknown；具体账户预约ID/uuid不入仓库。Spec确认与具体业务写入授权分别处理。

2026-11-01 M0规则续证：只读核对规则位/配置、扫描公开分块，11项部署前端纯函数合成边界观察符合预期，不是CLI测试。补证见docs/research/library-booking-phase-2-rules.md：limit=260中的4已解释、256未知；额度/完整资格、研修间维护及取消临界也未闭合（G-R1至G-R3）。M0整体仍未通过，交付用户审查，不能以unknown阻断已设计为由宣称证据完整或进入M1。本轮不改产品源码、版本、Skill/候选包，不再真实预约或取消。

2026-11-01用户已通过ed32f3d文档审查，并要求修复两项轻微可复核性建议。已补全24分块清单、正面引用来源定位及11项观察的合成上下文；本次只校验公开脚本，不重跑现场观察或业务写入。M0整体仍未通过，G-R1至G-R3/其他E2缺口不变，停下来等待用户审查，不进入M1。

2026-11-01用户复审9e68004通过后继续M0权威来源续查：通过正常帮助页找到广州校区图书馆正式服务/政策页，补强人员、用途、房型与取消政策子项，见docs/research/library-booking-phase-2-authorities.md。三个缺口组仍未整体关闭，M0不通过；未实现M1或重做业务写入。管理方/ITDID联系点和核实问题仅本地准备，没有授权发送消息或工单。交付后停下来等审查。

2026-11-01最新用户调整：在邮件发送方式确认中回复“继续开发吧，不管了”，据此允许不等待官方答复而有限推进M1只读实现，覆盖上文“M0未通过不进入M1”的原开发门槛；不发送邮件，不把M0或未知规则视为通过。实现纯规则判定（整体blocked/unknown）、内存主体绑定及跨可见状态/日期窗口的本人详情，见docs/acceptance/library-booking-phase-2-m1.md。detail能力源码pending，尚不对真实用户启用；原mine8454不变，实际CLI/Skill/候选包未更新。M1完成后停下交用户审查，不能进入M2或进行创建/取消。

2026-11-01最新授权：M1基线5105fcc已获用户复审通过并验收；用户明确要求按Spec开发L2-M2，完成后停下审查，不进入M3。M2覆盖只读创建/取消预览、本地操作凭据/状态锁/防重/恢复框架；M0缺口不关闭，学校业务发送仍pending。计划及验收见docs/superpowers/plans/2026-11-01-library-booking-phase-2-m2-plan.md与docs/acceptance/library-booking-phase-2-m2.md。保持实际CLI/Skill/候选不变，不访问真实账号或进行学校写入测试。

2026-11-01 M2交付待审：只读预览、300秒本地凭据/确认校验、状态锁/防重/崩溃恢复及独立OperationResult已实现；新增学校四项仍pending，源码24项中17 verified/7 pending。独立审阅3项P2均经回归RED→GREEN修复；全量326/326、0跳过，构建/类型/差异通过。保持实际CLI/Skill/候选不变；等待用户审查及明确继续，不进入M3。详见docs/acceptance/library-booking-phase-2-m2.md。

2026-11-01最新授权：M2（4d59e09＋ccafc4a）已获用户审查通过；解释M3范围后用户明确要求继续。当前开发M3一次创建与结果核对，完成后交审，不进入M4。M0缺口/生产unknown及学校pending门槛保持，真实业务须另有具体ready预览和单次确认；本轮仅合成发送测试与公开脚本GET，不访问真实账号或创建预约。见docs/superpowers/plans/2026-11-01-library-booking-phase-2-m3-plan.md。

2026-11-01 M3交付待审：一次创建/应答ID持久化/精确成员用途回查/已知凭据刷新实现完成，独立审阅1项P1及3项P2均RED→GREEN修复。最终全量376/376、0跳过，构建/类型/差异/文档链接通过。会话信号及发送入口300秒截止已打通；保存失败保留更强观察凭据；已确认未来预约最小防重回执保留至max(7天,结束)，完整载荷删除。学校路线仍pending，M0缺口不关闭，无真实创建或账号访问；实际CLI/Skill/候选不变，不进入M4，等待用户审查。验收见docs/acceptance/library-booking-phase-2-m3.md。
