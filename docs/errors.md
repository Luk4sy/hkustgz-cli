# 错误与退出码

| 退出码 | code/情形 | 下一步 |
| --- | --- | --- |
| 0 | 完整查询或控制成功 | 按结果范围使用 |
| 1 | INTERNAL_ERROR、CLEANUP_FAILED、SKILL_OPERATION_FAILED | 报告版本、命令结构及错误码，检查专用资源；不杀未知进程 |
| 2 | INVALID_ARGUMENT、INVALID_DATA_HOME、UNSAFE_SKILL_TARGET | 看命令帮助；仅使用工具归属的安全目录 |
| 3 | LOGIN_REQUIRED | 本人在auth login对应服务窗口正常认证，再查一次 |
| 4 | PERMISSION_DENIED | 到官方页面核实账号权限，不猜接口 |
| 5 | NETWORK_REQUIRED、QUERY_TIMEOUT、RATE_LIMITED | 检查网络或缩小范围；限流时等待，不循环调用 |
| 6 | ADAPTER_CHANGED | 当前来源结构不支持，检查更新或官方入口 |
| 7 | PARTIAL_RESULT | 保留data，说明coverage/范围和truncationReason |
| 8 | CAPABILITY_PENDING、UNSUPPORTED_CAPABILITY、BROWSER_UNAVAILABLE、SKILL_CONFLICT、ENVIRONMENT_NOT_READY | capabilities/browser status核实；需要Chrome时人工安装 |
| 9 | PROFILE_BUSY | 等待已有CLI/浏览器正常退出，不直接删锁 |
| 130/143 | INTERRUPTED/TERMINATED | 等原进程清理，操作先读data及原operation状态，不重发写入 |

认证unknown不代表成功或失败；数据unknown不代表否定；未经确认的空白不代表无记录。retryable不是要求Agent外层自动重试，CLI已承担有限只读重试。

遇到启动错误，源码开发者先构建；安装包用户重新安装明确版本。doctor现已提供只读环境诊断，browser install仍pending。Skill管理冲突时保留修改/未知文件；部分卸载的error.details包含相对路径报告，JSON/table均展示。无法确认事务归属时返回SKILL_OPERATION_FAILED并保留现场，不删锁或杀进程。报告问题不要附Cookie、profile、原始响应、HAR、截图或私人正文。

doctor健康退出0；缺Chrome、不支持的平台/Node或未验证浏览器选择退出8/ENVIRONMENT_NOT_READY；数据路径不安全退出2/INVALID_DATA_HOME。诊断失败的error.details为受限DoctorReport，JSON/table都保留checks；警告不表示登录有效，不自动清理任何锁。

完整校园Skill按实际capabilities判断；成绩/历史/预约仍pending时直接说明不可用。版本不匹配停止Agent校园调用并显式同步随包Skill。登录状态unknown可尝试一次verified只读查询；明确LOGIN_REQUIRED后由本人正常认证，再按授权重查。实际客户端的沙箱若阻止浏览器，记录BROWSER_UNAVAILABLE为未验证，不改变安全配置或循环重启。

Windows11候选在doctor中显示WINDOWS_CANDIDATE/warn；这不证明SKU或真机通过。Windows10/未知NT build继续ENVIRONMENT_NOT_READY。Chrome候选与实际启动共用解析；UNC/device/非本地盘符路径拒绝。Windows.cmd入口与本机smoke详见windows.md，不修改系统执行策略。

## 图书馆操作错误

操作结果meta.kind=operation。CONFIRMATION_REQUIRED/PREVIEW_EXPIRED/DUPLICATE_INTENT退出2，BOOKING_CONFLICT/BOOKING_RULE_BLOCKED退出4，OPERATION_UNCERTAIN退出10，OPERATION_STATE_UNAVAILABLE退出1。精确语义见cli-contract.md。

任何非零回执都先读data.outcome：confirmed或already_cancelled仍是来源确认的结果；not_applied表示来源已明确证明未生效；unknown才表示业务结果不能确定。OPERATION_STATE_UNAVAILABLE/CLEANUP_FAILED/信号可与这些已知结果同时出现：保留来源事实，说明本地保存或清理失败，不把已知not_applied降级为业务未知，也不误报保存成功。保存失败时磁盘可继续unknown并阻止重发。

已有operationId时只读booking operation <id>，必要时--refresh；不要重跑create/cancel、重建同意图、删除私有状态或未知锁。没有可信操作ID时保留现场，不生成虚假ID。退出码5/130/143对只读查询可由用户决定重查，对业务写入不代表可以再提交。当前学校新增路线仍pending，不通过网页绕过。
