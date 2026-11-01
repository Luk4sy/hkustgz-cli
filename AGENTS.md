# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1（3681ae2）、Task 2（c3bafa6）均已获用户复审通过并验收。Task 3（32f0bab）已获用户验收。Task 4 Catalog（7b5c559）已获用户验收。Task 5 SIS（d708ac5）已获用户复审通过并验收。Task 6 Portal（2d547ff）已交付并实测，用户于2026-10-28授权继续Task7；既有公告覆盖限制保留。Task7 Canvas（34eb9e3）已于2026-10-29获用户复审通过并验收；Task8四项只读查询已实现、待用户审查。本人已完成登录及课程冷启动复验；作业个人截止时间/提交状态证据缺失时unknown，Planner不代表全部作业。详见docs/acceptance/canvas-auth.md。Task 0 的 Portal/SIS/Canvas 认证子集已有证据，Booking/Library 专用会话查询已补证，通用认证控制状态仍为 unknown。Catalog两项、SIS三项、Portal四项及Canvas四项业务已验证（第七模块已验收），加上Booking四项共17项源码业务能力已有验证，SIS历史/成绩2项继续 pending；Portal公告全分类扫描当前仅保留已确认8条并返回partial，外部公告详情不支持。详见 docs/acceptance/catalog.md 及 docs/acceptance/query-core.md；不得猜学校接口或用模拟数据冒充真实查询。

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

2026-11-01 Task8交付：修复后256项全量测试全部通过（含Chrome，0跳过），构建、类型检查、差异检查通过；真实CLI分类8项/全楼59项/指定日开放占用/默认状态本人记录查询均通过。仍等待用户审查，不开始新增封装或推送。构建仅自动生成源码Skill命令表，完整Skill版本/说明与安装状态待验收后同步。
