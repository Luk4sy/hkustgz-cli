# 第二阶段 L2-M2：只读预览与本地操作框架

日期：2026-11-01。当前：M2实现完成，独立审阅3项P2均已修复，最终验证通过，等待用户审查。未进入M3。

## 范围与现状

用户已验收M1基线5105fcc，并明确授权继续M2。M0缺口未关闭、detail仍pending。M2不创建或取消学校预约，不更新实际安装、候选包或已安装Skill，不发送邮件。实现见[计划](../superpowers/plans/2026-11-01-library-booking-phase-2-m2-plan.md)，约束见[Spec](../superpowers/specs/2026-11-01-library-booking-phase-2-spec.md)。

- `booking preview --provider library --input -`：严格JSON意图，显式时区、学校同日、未来分钟区间、真实参与人ID不重复；只从stdin接收，最多65536字节，不回显输入。
- `booking cancel-preview --provider library --id <id> [--from <date> --to <date>]`：精确来源ID及日期窗口；缺失不推断取消，取消资格与窗口不明仍unknown。
- `booking operation <id> [--refresh]`：本地读取；refresh检查新鲜主体，并沿已有GET路线进行有限只读观察；M2不凭相似记录或列表缺失解除unknown，不声称已实现M3/M4权威确认。
- `booking create/cancel --provider library --operation <id> --confirm <digest>`：仅声明命令和pending门禁，即使测试注入verified也没有学校发送实现。

**新四项学校路线preview/cancel-preview/create/cancel均pending。**源码能力为24项：17 verified、7 pending（另含detail、history、grades）；本地operation不计校园业务能力。预览来源适配器消费已有房间/开放占用和详情读取，完整资格、费用、审批、参与人校验与重复检查尚不完备，生产适配器只能blocked/unknown，不返回ready。ready/确认摘要/dispatching使用合成证据验证框架，不是学校正向验收。

## 状态与隐私

`<CLI_HOME>/operations/`归属标记、0700目录；key/state与锁owner为0600。密钥本机生成；主体HMAC、动作、规范化意图、规则证据摘要及300秒绝对截止绑定确认摘要。原始账号/认证应答不落盘；只有显式操作意图、最小预览与必要回执保存在私有状态中。

跨进程状态锁包围只读profile会话，顺序operation→profile；未知锁不回收。已验证本机CLI归属、同主机且PID确认不存在的旧锁，使用锁内独占恢复标记和inode/owner复核后隔离清理；真实子进程SIGKILL回归覆盖重开后仍为unknown。活进程、陌生文件或恢复残留均失败并保留现场，不因恢复锁而清除未决操作。

状态文件严格schema、HMAC完整性、临时文件wx/fsync/rename及目录fsync；损坏、链接、未知归属或不安全路径失败并保留现场。持久化成功后才能把prepared改为dispatching；M2此接口只用于可控替身测试，不发送学校请求。取消防重以精确来源ID为业务意图，不能通过更换查询日期窗口绕过；确认摘要仍绑定原查询范围等完整参数。

尚未发出的过期预览删除意图和预览载荷；resolved/expired最小回执保留7天后按访问清理。dispatching/unknown不因过期、重启或清理自动删除，继续阻止同主体/动作/意图重复。普通logout与卸载原行为保留，不删除operations。

学校会话身份前后核对、查询完成及浏览器清理成功之后才prepare；超时/换号/清理失败不产生新预览。锁释放失败但已持久化时保留操作回执并返回本地错误，不丢操作ID，不暴露确认摘要。最后持久化前再次检查意图仍在未来。

## 结果协议

独立OperationResultSchema，`meta.kind=operation`；既有QueryResult/ControlResult不变。JSON/table失败均保留已知data。普通本地状态读取退出0，blocked4、关键证据unknown6、pending8、参数/摘要/过期/重复2、本地状态失败1；dispatching/unknown退出10，建议只读核对，不自动重试。操作错误retryable固定false。

## 验证记录（持续补充）

意图/状态、workflow、CLI分批先写缺模块失败测试再实现。追加“显示预览与绑定意图不一致”“清理失败丢回执”“过时意图”“身份错误被包装丢失”“错误成功协议”均先复现失败后修复。首次全量3项失败为安装能力数、包代码目录白名单和生成命令pending数量预期漂移；对应调整24/7及明确的dist/booking-operations代码目录，保留私有文件排除检查，并新增operations密钥/状态canary。

本轮只使用合成身份、资源、文件系统、进程与完全拦截的Chrome，不访问真实账号、不执行预约、取消或签到。源码Skill命令参考由构建自动生成，完整发行/实际安装同步仍留待M5。

补充验证：更换取消查询窗口绕过防重、真实进程崩溃后旧锁阻断恢复，均先用回归复现再修复。第二次全量中正在新增的取消防重回归捕获了加载中的旧实现（321/322）；修复后12项存储回归通过，所有M2针对性37项通过，正重新运行完整套件，不以之前运行代替最终结果。

最新完整验证：`HKUSTGZ_TEST_BROWSER=1 npm test` **323/323通过、0失败、0跳过、退出0**（含构建）；`npm run typecheck`与`git diff --check`通过。以下若有独立审阅修复，会另记回归和最终全量结果。

## 独立最终审阅及修复

单独只读代码审阅发现3项P2，全部用合成回归先复现再修复：

1. 已初始化目录同时缺key/state会静默重置，可能解除未知操作防重。现在只有本次独占创建的新operations目录可初始化；已有目录缺文件直接失败，不生成新密钥/空状态。回归保留归属标记并删除两文件，确认失败且无重置。
2. 加载后的磁盘损坏会被内存快照覆盖。现在读取及保存前都核对目录身份/归属、安全文件、密钥和已验证的状态字节；原子临时文件写好后、rename前再核对。状态/密钥变化失败并保留现场，不返回旧缓存或覆盖坏文件。相应旧测试也改为坏磁盘不能继续读取内存快照。
3. 重复意图只返回DUPLICATE_INTENT而丢失已知回执。现在带回既有操作ID、生命周期及结果，提供包含精确ID的`booking operation <id> --refresh`下一步；JSON/table均保留，确认摘要及预览载荷不返回。

本轮针对性40/40通过、0跳过；三项回归的失败与修复均已实际观察。审阅没有发现需延后的轻微问题。

审阅未判定事项的处理：真实账号资格/取消权限保留pending与M0缺口，不把合成ready视为现场许可；M3/M4提交和权威确认按用户模块门槛继续不实现，M2核对保持unknown；Windows未进行真机验收，不据macOS测试宣称跨平台可发行。这些边界不因代码审阅通过而放宽。

最终交付验证：审阅修复后`HKUSTGZ_TEST_BROWSER=1 npm test` **326/326通过，0失败、0跳过，退出0**（含构建）；`npm run typecheck`及`git diff --check`通过。集中本地提交审阅修复，停M2等待用户审查；未进入M3、未更新实际CLI/Skill/候选包，未推送或发布。
