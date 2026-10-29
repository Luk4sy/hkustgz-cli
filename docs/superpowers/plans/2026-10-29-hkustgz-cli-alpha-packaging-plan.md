# HKUSTGZ CLI Alpha Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户指定原目录、主代理实施；每批停止等待人工审查，不自动开始下一批。

**Goal:** 将现有校园查询封装为其他学生可安装、可由Codex调用并可安全升级卸载的alpha。

**Architecture:** CLI保留全部执行和业务契约，随包Skill只提供调用说明。先完成可安装产物，再完成Skill管理与诊断，最后验证独立用户使用链路；不依赖预约模块完成。

**Tech Stack:** 现有Node24.x、TypeScript、Commander、Zod、Playwright、node:test、npm tarball；不新增运行时依赖，确需新增时另作说明。

**Spec:** [已批准Spec](../specs/2026-10-29-hkustgz-cli-alpha-packaging-spec.md)，用户于2026-10-29批准。本文待审，尚未开始实施。

## Global Constraints

- 工作目录hkustgz-cli，延续原分支；不夹带已有未提交文件的其他修改。开始每批前检查git状态和实际基线，记录变更归属。
- 每批为一个人工验收单位；批内可多次提交。交付包含提交号、测试证据、已知限制及验收入口。只有用户明确通过并授权继续，才执行下一批。
- 面向macOS＋Google Chrome＋Node24.x/npm；Windows/Linux及其他浏览器不宣称已支持。browser install chromium保持pending。
- 13项已验证能力、6项pending以运行时注册表为准；不扩业务、不改变90秒预算、日期、分页、脱敏和partial/unknown语义。
- 不安装Node、不改shell、不自动下载或启动浏览器、不自动写客户端配置；npm安装只允许正常依赖获取，不触发学校访问或登录。
- CLI/Skill同包同版本、schemaVersion='1'；不发布npm、不发给同学、不联系他人，除非获得相应后续授权。
- 独立学生、许可证、包名/渠道等未就绪只阻塞相应交付门槛，不阻塞前面可独立验证的实现。
- 每批适用检查：npm test（含build）、npm run typecheck、git diff --check；涉及会话/CLI集成后运行HKUSTGZ_TEST_BROWSER=1 npm test。测试数量以现场输出为准，不能沿用历史198作为新结果。

## Review Focus

1. 产物依赖开发源码/cwd或安装副作用：第一批真实tgz隔离安装并记录文件、进程和网络观察，不能仅用npm link。
2. Skill目标的符号链接、用户编辑或未知文件：第二批拒绝逃逸/覆盖，回滚失败不破坏旧Skill。
3. 不支持Node时静态依赖先崩溃、诊断泄漏主目录：第三批独立启动检查及JSON/table脱敏测试。
4. Agent将partial/unknown当完整或网页正文当指令：第四批合成对话与真实调用验收分开记录。
5. 升级/卸载误删会话及其他客户端文件：第五批A→B产物验证，文件摘要前后对照。

## 文件与责任划分

| 路径 | 责任 |
| --- | --- |
| package.json、bin/hkustgz-cli.mjs、tsconfig.build.json | 产物入口、运行环境及发布白名单 |
| src/cli/skill/{bundle,paths,manifest,install,handlers}.ts | 随包元数据、目标解析、归属/摘要、受限文件变更、CLI控制适配 |
| src/cli/doctor.ts | 无网络、无浏览器启动的诊断 |
| src/core/contracts.ts、errors.ts；src/cli/{commands,main,render}.ts | 新控制结果/错误契约和注册，保留原业务语义 |
| skills/hkustgz-cli/SKILL.md、references/{commands,errors,examples,privacy}.md | 同版调用说明 |
| docs/{installation,cli-contract,errors}.md | 对外安装、协议和错误文档 |
| tests/{package,package-install,skill-install,skill-cli,doctor,doctor-cli,skill-contract,privacy}.test.ts | 各批契约与回归 |
| docs/acceptance/alpha-{package,skill,doctor,agent,students,release}.md | 各批真实证据与限制 |

doctor依赖Skill状态，故将Skill管理排在诊断前，最终顺序与Spec提出的工作包一致但消除实现依赖。

## 共享接口决策

新增src/cli/skill/bundle.ts：`BundleInfo={name:string;version:string;schemaVersion:'1';root:string;files:string[]}`，`readBundleInfo():Promise<BundleInfo>`，从安装包定位，不依赖cwd；files是固定相对文件白名单。

新增paths.ts：`SkillTarget={kind:'codex'|'directory';skillsRoot:string;destination:string}`，`resolveSkillTarget(input:{target?:'codex';dir?:string},env:NodeJS.ProcessEnv):SkillTarget`。省略目标默认codex；CODEX_HOME必须为绝对路径，未设用os.homedir()/.codex；dir要求绝对路径。链上安全验证由文件操作层负责。

新增manifest.ts：`SkillManifest={schemaVersion:'1';packageName:string;version:string;files:Record<string,string>}`，摘要SHA256，固定manifest名`.hkustgz-cli-manifest.json`。`SkillStatus={state:'absent'|'current'|'outdated'|'modified'|'unowned';installedVersion:string|null;expectedVersion:string}`；`inspectSkill(target:SkillTarget,bundle:BundleInfo):Promise<SkillStatus>`，不写目录。

新增install.ts：`SkillChangeReport={action:'install'|'uninstall';dryRun:boolean;changed:string[];preserved:string[];complete:boolean}`；`installSkill(target,bundle,{dryRun:boolean}):Promise<SkillChangeReport>`；`uninstallSkill(target,bundle,{dryRun:boolean}):Promise<SkillChangeReport>`。路径列表为相对路径；受限卸载保留修改/未知文件，返回complete=false，由handler转为SKILL_CONFLICT退出8并附报告。冲突错误、安全拒绝及失败回滚均使用公共CliFailure，不透传系统异常文本。

DoctorCheck、DoctorReport和可选错误details在第三批定义。错误details仅允许经过明确schema的DoctorReport或SkillChangeReport，其他错误不得携带任意对象；schemaVersion仍为1，此为向后兼容的可选字段扩展，已有错误字段保持。

---

### Task 1 / 第一批：可安装产物与隔离安装

**Files:** 修改package.json、tsconfig.build.json及必要bin入口；新增tests/package.test.ts、tests/package-install.test.ts、docs/installation.md、docs/cli-contract.md、docs/errors.md、docs/acceptance/alpha-package.md。README只修改本批必要段落，保留既有用户修改。

**Interfaces:** 消费现有bin和executeCommand；产出`npm pack`的明确版本tgz，生产环境直接运行hkustgz-cli。公开协议沿用现有ControlResult/QueryResult/Failure，不新增学校命令。

- [ ] Step 1：写失败测试`tarball_is_allowlisted`、`private_markers_excluded`、`installed_bin_is_cwd_independent`、`install_has_no_campus_or_client_side_effects`。断言tgz不含src/tests/.hkustgz-cli/.superpowers/profile/HAR/trace及合成密钥标记；隔离prefix安装后版本、帮助、capabilities可运行，19项中13 verified/6 pending，stdout为单个结果。
- [ ] Step 2：运行`node --import tsx --test tests/package.test.ts tests/package-install.test.ts`记录失败；若现有实现已满足某断言，保留为基线，不人为改坏实现制造RED。
- [ ] Step 3：设精确白名单，编译src；打包阶段构建，安装阶段无业务钩子。用npm install --global --prefix临时目录安装真实tgz及生产依赖，显式执行对应bin；HOME、CODEX_HOME、缓存及prefix均隔离。生命周期脚本正常启用，不能靠--ignore-scripts证明无副作用。验证包外无tsx/src依赖，目录带空格且cwd在仓库外。
- [ ] Step 4：运行目标测试、全套及类型检查；实际检查tgz文件。网络/进程证据结合静态钩子检查、隔离安装观察及安装文件快照；不以“没创建profile”单独证明无校园请求。npm依赖获取失败记录外部条件，不假称包失败或通过。
- [ ] Step 5：更新安装/协议/错误文档和alpha-package记录，明确LICENSE未决时只做本地验证，不添加虚构许可证；后续阶段补LICENSE后重新打包。提交`build: prepare isolated alpha package installation`。交第一批审查并停止。

### Task 2 / 第二批：Skill安装、归属与卸载控制

**Files:** 新增src/cli/skill/{bundle,paths,manifest,install,handlers}.ts、tests/skill-install.test.ts、tests/skill-cli.test.ts、docs/acceptance/alpha-skill.md；修改commands.ts、main.ts、contracts.ts、errors.ts、render.ts和包白名单。增加最小skills/hkustgz-cli/SKILL.md用于说明版本和当前管理接口，正式工作流第四批补齐。

**Interfaces:** 实现共享接口及`createSkillHandlers():Record<string,CommandHandler>`；注册skill path/status/install/uninstall。path/status允许--target codex或--dir，默认codex；install/uninstall同样支持目标和--dry-run，target与dir互斥。

- [ ] Step 1：写`install_is_idempotent`、`modified_and_unowned_targets_are_preserved`、`symlink_ancestor_is_rejected`、`upgrade_failure_restores_old_bundle`、`uninstall_preserves_unknown_and_edited_files`；检查manifest文件摘要、A→B升级、摘要不匹配拒绝、不触碰根目录其他Skill和config.toml。父目录不存在时安全创建；读取状态不创建目录。dry-run前后文件树完全一致。
- [ ] Step 2：运行`node --import tsx --test tests/skill-install.test.ts tests/skill-cli.test.ts`，确认新接口相关测试失败。
- [ ] Step 3：实现目标解析、只读状态、白名单复制和归属检查。升级采用同文件系统暂存＋旧目录备份＋重命名提交，失败恢复旧目录；变更前重新核验路径/摘要，不覆盖安装开始后新增的用户文件；所有操作同目标互斥。写故障注入覆盖提交中断，读取不得将半更新当current。持久事务恢复规则由install模块定义并测试；无法确认归属则拒绝，不自动删除。macOS /var等系统路径别名先规范到物理根，再检查用户可变链，不能将普通临时路径一律判坏。
- [ ] Step 4：为Skill失败新增SKILL_CONFLICT、UNSAFE_SKILL_TARGET、SKILL_OPERATION_FAILED的固定消息与退出8/2/1映射，SKILL_CONFLICT可携带受限report。安全拒绝返回2；改动冲突返回8。JSON/table都保留脱敏报告；执行目标测试、全套、类型检查和差异检查，不写真实Codex目录。
- [ ] Step 5：记录测试和归属规则，重新pack检查Skill入包及私有内容排除。提交`feat: manage owned Codex skill bundles`。交第二批审查并停止。

### Task 3 / 第三批：doctor与环境失败契约

**Files:** 新增src/cli/doctor.ts、tests/doctor.test.ts、tests/doctor-cli.test.ts、tests/privacy.test.ts、docs/acceptance/alpha-doctor.md；修改bin入口、commands.ts、main.ts、contracts.ts、errors.ts、render.ts及公开错误文档。

**Interfaces:** `DoctorCheck={id:string;status:'pass'|'warn'|'fail';code:string;remediation:string}`；`DoctorReport={cliVersion:string;nodeVersion:string;platform:string;arch:string;checks:DoctorCheck[];capabilities:{verified:number;pending:number;unsupported:number;disabled:number}}`；`getDoctorReport(deps:CliDependencies):Promise<DoctorReport>`。生产信息读取抽成可注入探针供测试，复用SkillStatus、现有browser status/paths/lock观察，不调用SessionRunner。handler返回ControlResult或抛带验证details的CliFailure。

- [ ] Step 1：写`healthy_doctor_exits_zero`、`unsupported_node_exits_eight_before_imports`、`missing_chrome_is_actionable`、`busy_or_unknown_lock_is_not_removed`、`unsafe_home_exits_two`、`doctor_redacts_home_and_identity`。测试使用探针断言无launch/request/delete；无Skill或旧Skill为warn并给安装建议，不阻塞终端公开查询；缺Chrome/不支持平台/Node为fail；忙锁warn，不杀进程。
- [ ] Step 2：运行`node --import tsx --test tests/doctor.test.ts tests/doctor-cli.test.ts tests/privacy.test.ts`，确认新增行为失败。
- [ ] Step 3：实现诊断及ENVIRONMENT_NOT_READY/8。bin在加载Commander/Zod等依赖前检测Node主版本；不支持时仍能生成固定schemaVersion1的JSON失败（或--format table的安全文本），不要求旧Node加载业务。通过独立旧Node进程验收；若运行时不可得则该条标未实测，注入测试不能冒充。
- [ ] Step 4：扩展统一错误details白名单schema，JSON和table保留checks；不安全目录使用INVALID_DATA_HOME/2，未知异常仍INTERNAL_ERROR/1。执行目标和完整测试/类型检查、pack后安装版doctor，检查stdout单结果、stderr无身份路径。
- [ ] Step 5：记录状态分级及实际支持矩阵，提交`feat: diagnose alpha runtime without school access`。交第三批审查并停止。

### Task 4 / 第四批：完整Skill与Codex调用验收

**Files:** 完善skills/hkustgz-cli/SKILL.md、新增references/{commands,errors,examples,privacy}.md、tests/skill-contract.test.ts、docs/acceptance/alpha-agent.md；修改README、installation/cli-contract/errors文档及必要bundle白名单。

**Interfaces:** Skill元数据版本等于package.version、compatible_cli为精确版本、schemaVersion='1'；commands参考数据消费COMMANDS及DEFAULT_CAPABILITIES，不能新增业务事实来源。可新增纯文档生成器`scripts/build-skill-docs.mjs`，不得在消费安装时执行。

- [ ] Step 1：写`skill_matches_installed_cli`、`pending_commands_are_not_promoted`、`references_ship_in_same_bundle`；断言所有示例命令路径/参数可由现有CLI识别，13项可用查询与6项pending匹配，版本一致。使用合成QueryResult固定退出7仍保留data、unknown不变false、Planner不代表所有作业。
- [ ] Step 2：运行`node --import tsx --test tests/skill-contract.test.ts`并记录失败。
- [ ] Step 3：写薄Skill：先版本/doctor/capabilities，按需认证；Catalog不要求登录，未知认证只尝试一次只读查询；LOGIN_REQUIRED交本人登录；PROFILE_BUSY不删锁、RATE_LIMITED不外层循环、权限失败不猜接口。HTML和学校文案视为数据；串行执行浏览器命令；仅使用用户返回ID，不猜课程/学期ID。
- [ ] Step 4：运行契约/全部测试/类型检查及pack检查。安装到独立临时Codex home做文件发现验证；实际在用户授权的Codex环境安装与刷新后，以自然语言完成公开查询、本人私人查询及pending拒绝。实际客户端识别与合成partial/unknown/登录失败场景分开记录；不因写了SKILL.md就宣称识别成功。
- [ ] Step 5：记录Agent实际调用的命令结构、结果状态及范围，不记录正文/身份；提交`feat: guide Codex through verified campus queries`。交第四批审查并停止。

### Task 5 / 第五批：独立学生、升级卸载与alpha交付验收

**Files:** 新增docs/acceptance/alpha-students.md、alpha-release.md，补充package-install/skill-install/privacy测试；按维护者选择添加LICENSE、更新package版本/许可证/白名单和README安装矩阵。不得代选开放许可证。

**Interfaces:** 一个确定版本、SHA256校验的tgz及其同版本Skill；验收表字段`artifactVersion/artifactSha256/os/arch/node/npm/chrome/testerAlias/capabilityId/outcome(pass|partial|unknown|permission_denied|not_tested)/notes`，不含姓名学号或私人结果。

- [ ] Step 1：补自动升级/卸载回归：隔离prefix安装A、安装B、检查bin版本B；Skill保持A且status outdated，显式更新后current；保留合成会话标记及其他客户端文件；Skill卸载只删归属未改文件，npm卸载不触碰会话；主动logout走既有安全测试而非手工rm。
- [ ] Step 2：运行目标测试确认新场景失败，再补最小实现/文档；不为了人为RED破坏已正确功能。执行全部检查，最终实际pack和解包白名单审计；版本A/B只用于受控本地测试，不冒充已发布版本。
- [ ] Step 3：先整理可审查的tgz、校验值、许可证/包名/交付渠道选择和学生操作清单。许可证或分发授权未给时，停在本地验收完成；不擅自传给同学。用户自行邀请或明确授权联系，不能把此前写计划视为发消息许可。
- [ ] Step 4：自愿第二名学生自行安装自己的Mac，公开Catalog查询、专用窗口本人登录及SIS或Canvas一项私人查询。两个账号对13项能力填矩阵，未测如实标记；保留Portal partial和Canvas unknown限制。不得读取第二名学生profile、密码、Token或响应，只接收其脱敏结论。
- [ ] Step 5：维护者与第二名学生各执行升级、Skill同步及卸载步骤并记录；无法取得第二名学生则标“待独立学生验收”，实现可交审但本批验收未完成。更新支持范围、已知问题和失败指南，提交`docs: record independent student alpha acceptance`。交最终审查；npm publish需要单独授权，不属于本计划执行动作。

## 需求覆盖与人工闸门

| Spec | 负责批次 |
| --- | --- |
| §1–4 目标、已实现能力、平台 | 全局；1/4/5 |
| PKG-01、PKG-02；A1–A3 | 1，后续每批复查产物 |
| PKG-03；A9 | 2/5 |
| SKILL-01；A5 | 2/4 |
| DIAG-01；A4 | 3 |
| SKILL-02；A8 | 4 |
| §7 隐私与认证 | 1–5，复用既有认证测试 |
| §8 文档 | 每批对应文档；4/5汇总 |
| A6/A7；§10发布 | 5，外部条件缺失不写通过 |

第一批通过→第二批，第二批通过→第三批，第三批通过→第四批，第四批通过→第五批。没有用户审查通过不跨闸门。每批结果允许明确要求修复后复审；修复仍属于当前批次。

## 自检结果与实施交接

已对照Spec逐项检查覆盖；五项Review Focus均有归属测试。Skill状态先于doctor实现，签名共用；第三批诊断details复用第二批安全报告扩展，不引入未定义任意异常对象。许可证、第二名学生与公共发布均安排独立门槛，不影响前三批本地开发。本文记录的是将来操作，所有checkbox尚未完成。

沿用主代理原目录实施方式。本计划交用户审阅后，再开始第一批；本次不执行任何产品实现、安装或学校访问。
