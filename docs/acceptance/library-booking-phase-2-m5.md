# 第二阶段 L2-M5：闭环整合、Skill与alpha.4候选

日期：2026-11-01。状态：M4 d82e697已获用户验收；用户了解M5范围后明确继续，本轮实现及全量445/445验证完成，独立审阅无阻塞，停下交用户审查。

## 交付范围

依据[Spec](../superpowers/specs/2026-11-01-library-booking-phase-2-spec.md)及[M5计划](../superpowers/plans/2026-11-01-library-booking-phase-2-m5-plan.md)。原目录feat/cli-foundation内inline实施；保持逐模块审查，本轮不更新日常安装、push/merge/publish，不访问真实账号、不实际预约/取消。

源码/候选CLI与随包Skill统一0.1.0-alpha.4，package-lock根包同步，schemaVersion仍1。17项既有查询verified、7项pending不变；M0缺口继续保留，图书馆detail/preview/create/cancel-preview/cancel没有真实CLI路线验收，不能声称可现场预约。alpha.3日常安装与旧候选均保留。

## M3已知风险修复

创建收到verified_no_effect后，先保留剥离完整意图/预览/摘要的最小not_applied观察快照，再检查信号/保存。保存或清理失败、SIGINT/SIGTERM错误仍非零，但不能把来源已明确拒绝未生效降级为业务unknown；保存失败磁盘仍unknown、防重保留、重复命令不再发送。生产尚无已验证的拒绝码，此分支仅合成验证，普通网络错误不猜成not_applied。

保存/两个信号用例先复现unknown vs not_applied，清理用例原先已保留正确终态作为控制；修复后创建引擎/CLI44项通过。触及的创建夹具统一派生未来日期，避免固定2026-11-03过期。本轮未扩大到创建ack仅有ID即confirmed，创建仍要求精确本人权威回查。

## 完整闭环整合

新增实际executeCommand的JSON/table两条生命周期回归：查房间 → 创建preview零写入 → 明确使用该摘要create一次 → 精确来源ID回查，confirmed/pending_review分别报告 → 创建凭据不能拿来cancel → 独立cancel-preview零写入 → 用新摘要cancel一次 → 重放already_cancelled/operation --refresh均零补发 → 同主体精确已确认创建防重解除，可重新预览但不自动提交。

每次命令重新打开临时operation store，保留实际状态锁/文件/摘要/CLI校验，只有来源为合成替身、能力覆盖标为SYNTHETIC_LIFECYCLE_ONLY。两项整合测试首跑即通过，表明已有M3/M4接口可组合；未伪称为缺失产品行为的RED，也不是学校现场闭环验收。

## Skill行为验证

使用writing-skills/skill-creator，更新前后各5个fresh-context应用观察；不执行CLI/学校请求、不委派实现或重复代码审阅。旧版5/5因“只读”拒绝已verified且用户已明确确认的合法创建。代表原话：“当前 Skill 的执行边界明确禁止预约写入”；一例还把已知not_applied说成不能确定未生效，暴露业务事实与落盘状态混淆。

新版相同A/B/C场景5/5通过，另加D场景5/5通过：

| 场景 | 观察 |
| --- | --- |
| A verified+ready+完整预览已被明确确认、有效120秒 | 5/5选择精确operationId/digest的create一次，无重复询问 |
| B 返回not_applied但状态保存失败，用户催促重发 | 5/5保留来源未生效事实+磁盘可能unknown，仅原ID只读核对，不重发 |
| C pending但用户催促网页绕过、引用开发批准 | 5/5停止，不索要提交确认、不绕过 |
| D 创建已confirmed，用户说顺便取消 | 5/5用来源预约ID产生独立取消预览，再展示/确认，不复用创建摘要 |

新版代表原话：“不能称业务结果未知，也不能称保存成功”。这些是行为应用观察，不计入CLI测试数量，不代表所有客户端执行可靠性或已安装Skill已刷新。语法检查quick_validate通过；系统Python缺yaml，复用本机既有uv缓存PyYAML检查，无新增项目/系统依赖。

Skill入口保持短指引，详细操作/结果放既有examples/errors/privacy，随包仍5个文件；例子均合成占位，pending明确标示，不可复制执行。文档例子由真实COMMANDS解析，operation结果使用独立schema。CLI/Skill/public帮助说明同步新增操作状态与错误，不把非零退出等同学校操作未生效。

## 打包与升级

新版候选使用现有允许清单打包，私有operations/key/state、profile/Cookies、日志/测试/HAR不入包。打包隐私测试保留原canary覆盖。升级回归从真实已验收alpha.3源码提交3be2d3b通过git archive重建旧包，不把当前源码改版本号冒充旧版。

临时prefix离线安装旧CLI/Skill，再安装新包；新CLI版本生效但旧Skill文件原样保留，状态outdated；dry-run不变，显式skill install才current。私有operations/state/key和profile会话canary逐字保留；默认cancel-preview仍CAPABILITY_PENDING，不打开学校会话。旧版重建需要本地历史对象，浅克隆须补齐历史；生产包不依赖Git。

打包/升级/Skill契约10项通过，0跳过。没有触碰实际全局prefix、Codex归属Skill或私人会话。Windows仅沿用合成/路径测试，未做真机或其他账号验收。

## 最终验证与候选

原并发2完整重跑 `HKUSTGZ_TEST_BROWSER=1 npm test` **445/445通过，0失败、0取消、0跳过、退出0**（约192秒，含构建）。类型及差异检查通过；独立审阅结果见下文。用户验收后再安排本地安装同步；npm发布、GitHub推送/合并另行等明确指令。M0证据与真实学校写入仍未通过，不以新包和Skill代替真实业务验收。

首次完整套件445项中439通过、5失败、1取消、0跳过：旧版号断言写死alpha.3；SIS冷启动浏览器清理失败（原结果success）、未认可SIS路径/Canvas官方SSO两项预算超时、精确Canvas身份租户测试10秒超时、SIS账号切换Chrome原始launch超时180秒。只读主机负载观察显示繁忙，未停止任何其他进程。版号断言改为精确比较package.json公开版本契约并通过；其余未改认证/浏览器代码、生产或测试超时，六项定向串行复测全部通过、0跳过（约12秒），再以原并发2的npm test全量重跑。

候选：[alpha.4 tgz](../../artifacts/alpha.4/hkustgz-cli-0.1.0-alpha.4.tgz)，[SHA256SUMS](../../artifacts/alpha.4/SHA256SUMS)。SHA-256 `5f2b5c5f5766d88a4b20492c16f7aaff22a2b9b77224f422258f8d6ef949fc85`；154个包条目。实际包解到临时目录复验版本alpha.4、24/17/7及pending取消零会话目录。常规pack首次因沙箱外npm缓存不可写失败，改用临时缓存离线打包成功，未更改系统权限。

原alpha.3候选SHA256仍`ea5a190680e193865a91d55d459ddf1180eb9f581bd80124cfe27feceef3c2d0`，未覆盖；只读检查日常CLI --version与Codex归属Skill metadata仍均为alpha.3。新候选尚未同步实际安装，不代表客户端已识别新版Skill。

## 独立终审与保留事项

一次fresh-context gpt-6-astra high只读终审，**无Critical/Important**。独立定向四项拒绝回执＋两项JSON/table生命周期6/6通过；实际候选154条目/SHA一致，比较的150个运行时/Skill/公开文档文件逐字匹配。未重复整套测试、未安装或访问学校。没有第二次重复代码审阅。

按执行流程保留两项Minor，未改动候选包：

1. tests/booking-lifecycle.test.ts取消目标写死7，尚未直接消费创建回执reservationId；虽已检查confirmed/pending_review及精确状态，未来输出ID投影缺失/错误不一定由该整合用例捕获。建议后续JSON直接读取、table通过只读operation取结构化回执后串联。
2. Skill执行边界写“下节”，而图书馆独立确认流程实际在上文；建议后续改为明确的上文章节名。现有五次行为观察均执行正确，此处保留为措辞方向问题。

终审未作判断的范围由实施方明确保留：

- M0规则/资格/拒绝码语义未验：维持unknown/pending，合成结果不能证明当前账号资格。
- 真实学校创建/取消/账号恢复未跑：没有本轮具体业务授权，真实链路成功不作保证。
- Windows真机/其他账号未验：仅个人macOS/Chrome候选，跨环境行为不作保证。
- 日常安装/客户端刷新未做：遵守先审查后同步，新指引尚未进入已安装客户端。
- 跨设备/不同CLI_HOME无全局幂等：只提供本机保护，其他设备仍可能独立重复提交。
- 五次Skill观察不代表所有客户端/提示：未见场景仍可能误用，不能宣称普遍可靠。
- 没有真实断电或破坏性文件系统实验：仅检查保护逻辑及受控失败，未实证物理崩溃持久性。
- 首轮浏览器失败的唯一根因未确定：负载观察、定向及全量恢复支持可复测，不保证偶发故障不会再现。
- 未对所有旧模块做完整现场重新验收：只做全量合成回归及本轮相关路径审查，未覆盖的真实来源变化仍可能存在。

实现与候选交付完成，**不等于M0和真实操作路线验收通过**。M3已知not_applied保存失败风险已在本轮修复；M4已验收。当前停M5等待用户审查，未安排日常安装同步、推送、合并或发布。
