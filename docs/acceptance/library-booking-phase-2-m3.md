# 第二阶段 L2-M3：一次创建与精确结果核对

日期：2026-11-01。状态：实现完成，全量验证通过，进入独立代码审阅；完成后交用户审查，不进入M4。

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

首次全量365项中364通过，1项旧锁清理故障夹具失败：夹具在session返回、尚未prepare时插入foreign锁文件，新租约检查因此正确阻止持久化，没有所谓“已保存回执”。已把清理失败注入移至真实prepare成功之后，原有回执保留断言不减；另保留原注入时序，新增断言确认零保存、data=null。相关9项CLI通过，正在重新运行全量。

当前完整验证：`HKUSTGZ_TEST_BROWSER=1 npm test` **366/366通过，0失败、0跳过、退出0**（含构建）；`npm run typecheck`和`git diff --check`通过。独立审阅结果及修复后验证另记。
