# 第二阶段 L2-M3：一次创建与精确结果核对

日期：2026-11-01。状态：M3 df5b0aa 已获用户复审通过并验收；全量380/380、0跳过。后续用户已授权进入M4，见[M4记录](library-booking-phase-2-m4.md)。

## 范围与能力状态

用户已验收M2（4d59e09＋ccafc4a），并在解释M3范围后明确要求继续。实现依据[Spec](../superpowers/specs/2026-11-01-library-booking-phase-2-spec.md)和[M3计划](../superpowers/plans/2026-11-01-library-booking-phase-2-m3-plan.md)。真实业务仍要求具体ready预览及单次授权，开发指令不等于代选参数提交。

**没有进行真实创建。**M0资格/额度/规则位及维护缺口仍在，生产createAssessment保持blocked/unknown，不能生成可提交摘要。create、preview、detail等学校路线保持pending；源码仍24项、17 verified/7 pending。本轮是实现及合成验收，不把M0旧网页样本冒充M3 CLI现场验收。实际CLI、已安装Skill、候选包均不更新，不推送或发布。

## 本轮行为

- `booking create --provider library --operation <id> --confirm <digest>`接入创建引擎。先检查凭据动作/状态/摘要/300秒截止；失配在开启学校会话前失败。已确认操作只读返回，未知操作不重发。
- 提交前两次核对当前主体，重新读取并严格检查规则、完整预览与参数；变化则不发送。资源、起止、参与人及用途不匹配不会进入发送。至少1000ms剩余预算才进入dispatch。
- 先原子持久化dispatching/unknown，再做唯一一次有副作用尝试。来源串行500ms调度，write设置readOnly=false，禁止自动重试；总截止沿用90秒，单次传输最多30秒。
- 业务成功应答中的精确resvId先持久化为create_success凭据；此时仍unknown。只有新鲜主体、同一ID、同资源/时间、完整参与人ID集合/用途匹配及来源成功状态的回读才confirmed。确认后删除意图/预览敏感载荷，只保留最小回执。待审批、审批通过/拒绝与创建结果分别显示。
- 没有成功凭据时，即便只读查询找到相似记录也不认领；普通HTTP错误/未知业务码不猜成not_applied。只有来源明确无副作用的拒绝才允许not_applied，生产尚无已验证拒绝码，相关分支仅合成验证。
- `booking operation <id> --refresh`仅在持久化成功ID且精确回查匹配时确认创建；丢应答、缺失、换号、成员缺证仍unknown。取消及其确认保持M2保守行为，不实现M4。
- 信号保留130/143；超时/网络中断后不补发。已确认后浏览器清理失败仍保留confirmed及来源ID，返回非0错误。状态锁释放之前关闭store租约并等待在途磁盘写入，迟到callback不能在已释放store上保存或确认。

## 正常客户端与传输边界

重取官方公开单次表单脚本`chunk-00b8aa15_1685603939570.js`与本人列表脚本`chunk-0a13ab7b_1685603939570.js`，SHA-256分别为`08ea4daf9c04f21dd85885a9b97a294c5f6b930274a8e3ca43861f179838e8fa`和`7fd5f94a2c62a58bccfb66319f92dcdf0db841fe2c0238292a828471bae262eb`，与[M0证据](../research/library-booking-phase-2.md)一致。未使用私人会话，未保存脚本整包。

公开computed submitDate确认sysKind=1、当前主体appAccNo、memberKind按人数、resvKind=2、resvProperty=0、日期时间字符串、testName、成员/资源列表及空附加字段；列表标签确认256 checking、512 auditFailed、1024 auditPass。生产sender仅覆盖本人单成员、无附件/验证码/附加服务的已记录载荷，其他范围不发送。

sender复用页面已认证$axios，严格核对origin和/ic-web基址，不提取Cookie或猜认证头；使用固定已取证POST `/ic-web/reserve`。路由守卫先校验完整载荷与意图，再仅允许一次forward；route.fetch明确maxRetries=0/maxRedirects=0，响应不透传Location/原始正文，阻止客户端重试、重定向与其他业务写入。守卫保留到会话关闭；过期/中断后不迟发。

此适配器尚未现场验证当前部署的客户端属性与该受限sender链路，且资格门槛未关闭，因此不升级verified。

## 验证记录（持续更新）

创建引擎、CLI、传输及成员/用途回查均先写测试观察RED后实现GREEN。节流回归先复现身份GET后1ms即发送，改为非重试调度后通过。Chrome全部页面请求均拦截；route.fetch为受控发送替身，未向学校转发POST。覆盖成功/待审批、规则与参数变化、身份变化、坏摘要、预算不足、丢应答、回读错目标/人数用途、未知业务结果、信号、迟到应答、清理失败及已释放租约。

只有公开脚本GET属于本轮现场网络观察；其摘要一致不代表学校创建路线已验收。Windows未进行真机验收。

首次全量365项中364通过，1项旧锁清理故障夹具失败：夹具在session返回、尚未prepare时插入foreign锁文件，新租约检查因此正确阻止持久化，没有所谓“已保存回执”。已把清理失败注入移至真实prepare成功之后，原有回执保留断言不减；另保留原注入时序，新增断言确认零保存、data=null。相关9项CLI通过，随后重新运行全量并取得下述366/366结果。

当前完整验证：`HKUSTGZ_TEST_BROWSER=1 npm test` **366/366通过，0失败、0跳过、退出0**（含构建）；`npm run typecheck`和`git diff --check`通过。独立审阅结果及修复后验证另记。


## 独立审阅及修复

一次独立只读代码审阅发现1项P1、3项P2，均先补回归观察失败再修复：

1. 会话信号未传入创建callback。默认handler现在传递withLibraryReader提供的会话options，所有操作流程合并会话/命令截止与AbortSignal。实际SessionRunner＋延迟100ms关闭的合成上下文覆盖SIGINT/SIGTERM，在第二次主体核验发出信号后均零提交，并保留130/143。
2. 预览可能在durable dispatch或500ms来源排队期间过期。durable返回后再次检查300秒截止，并传递独立dispatchDeadlineMs，经调度器及真正POST入口两次校验。这个截止只限制首次发送，已经合法发送后的应答/回查仍使用原命令预算。三个回归分别覆盖保存跨界、来源排队跨界和Chrome实际入口已过期。
3. 本地保存失败丢弃已观察到的来源ID或权威确认。现在临时保存更强的已观察证据供失败回执使用；磁盘仍保守unknown。来源ID未durable时不继续回查；确认写盘失败时错误回执仍保留confirmed、精确ID/审批状态，且不开放重发。两个注入保存失败回归核对返回和真实磁盘状态分别符合语义。
4. 已确认同意图能生成第二张凭据。confirmed记录现在参与本地防重；来源assessment带有既存预约ID时，预览及提交前复核都阻止新创建。对仍在未来的已确认预约，最小防重回执保留至max(默认7天,预约结束)，不保留完整意图/预览；旧回执若缺少结束信息，不自动解除防重，需后续权威核验。精确同意图重建及超过7天但预约未结束的回归均通过。M4的取消后权威解除不在本轮实现。

审阅指出的一处旧“正在重跑”叙述已随最终状态记录同步为历史时态。审阅未验证真实状态/审批部署语义、完整资格/重复发现、Windows真机或M4，这些均继续按原范围保留未验；生产不得ready/create仍pending，不推导跨平台可发行。没有进行第二次重复独立审阅，重要修复由各自RED→GREEN及最终全量核验。

最终交付验证：审阅修复后`HKUSTGZ_TEST_BROWSER=1 npm test` **376/376通过，0失败、0跳过，退出0**（含构建）；`npm run typecheck`、`git diff --check`及本地文档链接检查通过。按既有原目录/分支约定集中本地提交，不推送/安装/发布，停M3等用户审查。真实学校创建验收未完成，create继续pending，M0缺口保留，未进入M4。

## e1eb8cc 用户复审 P2：刷新失败保留已确认结果

用户复审发现只读刷新在会话清理或确认保存失败时仍返回旧unknown/not_required。本轮先补两个回归，均复现unknown与期望confirmed不符；修复后通过。

刷新现在在精确回查、前后两次主体核验及预算检查全部通过后，即保留一份用于回执的已验证确认结果。创建和刷新共用confirmedCreationSnapshot投影，统一保留精确来源ID、来源状态与审批状态，并删除预览/意图载荷及确认摘要。后续清理或保存失败仍返回原错误、非零退出码及retryable=false，同时附带confirmed业务结果；不把错误回执等同于已成功落盘。

两项回归分别模拟CLEANUP_FAILED和OPERATION_STATE_UNAVAILABLE，验证JSON/table包含confirmed、来源ID及approved；磁盘继续保持原unknown和来源ID，旧凭据重放仍被阻止，刷新无额外提交。另补防误确认回归：错误目标或第二次主体核验未通过时，即使清理也失败仍保持unknown；补充确认后的最后一次状态读取失败场景，错误回执同样保留已确认结果，已经成功保存的磁盘状态不回退。

针对性创建/CLI/操作流程51项通过、0跳过。最终`HKUSTGZ_TEST_BROWSER=1 npm test` **380/380通过，0失败、0跳过、退出0**（含构建）；类型、差异及本地文档链接检查通过。本轮不访问真实账号，不创建/取消预约，不进入M4，不更新实际CLI/Skill/候选包。
