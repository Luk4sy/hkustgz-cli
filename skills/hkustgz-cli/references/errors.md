# 错误处理

以error.code、退出码和meta为依据，不靠英文message。退出7的ok:false仍有可信data；保留范围和截断原因。unknown不代表false。

| code / 退出码 | 处理 |
| --- | --- |
| INVALID_ARGUMENT / 2 | 查看该命令--help，只修正参数 |
| INVALID_DATA_HOME、UNSAFE_SKILL_TARGET / 2 | 使用安全归属目录；不删除或强制修复未知内容 |
| LOGIN_REQUIRED / 3 | 本人在auth login portal/sis/canvas完成正常认证；完成后再查一次，不在聊天中输入密码 |
| PERMISSION_DENIED / 4 | 停止该读取，检查本人官方权限 |
| NETWORK_REQUIRED、QUERY_TIMEOUT / 5 | 告知网络/预算问题；按用户需要缩小查询或稍后再试，不循环 |
| RATE_LIMITED / 5 | 停止外层调用，不绕过CLI的有限重试与Retry-After |
| ADAPTER_CHANGED / 6 | 当前解析/来源不匹配，提示更新或官方入口，不猜隐藏接口 |
| PARTIAL_RESULT / 7 | 解释data、coverage、truncationReason；不宣称全量 |
| CAPABILITY_PENDING、UNSUPPORTED_CAPABILITY / 8 | 当前不可用，不承诺实现或用别的系统冒充 |
| ENVIRONMENT_NOT_READY、BROWSER_UNAVAILABLE / 8 | 按doctor或browser status人工修复；不自动下载浏览器 |
| SKILL_CONFLICT / 8 | 查看error.details相对路径报告，保留用户编辑，先备份处理 |
| PROFILE_BUSY / 9 | 等原进程/浏览器正常退出，不删锁或杀未知进程 |
| INTERNAL_ERROR、CLEANUP_FAILED、SKILL_OPERATION_FAILED / 1 | 只报告版本/错误码/命令结构；事务归属不明保留现场 |
| INTERRUPTED、TERMINATED / 130/143 | 等待清理后再按用户要求执行 |

认证状态unknown可尝试一次当前verified只读查询；明确LOGIN_REQUIRED才转人工登录。doctor的成功不证明认证有效。字段缺证据时逐项保留unknown，不把“没查到”当“没有”。

## 创建/取消与本地操作

| code / 退出码 | 处理 |
| --- | --- |
| CONFIRMATION_REQUIRED、PREVIEW_EXPIRED / 2 | 不发送；重新生成并展示预览，取得该预览的明确确认 |
| DUPLICATE_INTENT / 2 | 查看现有operation；不重新生成同意图以绕过防重 |
| BOOKING_CONFLICT、BOOKING_RULE_BLOCKED / 4 | 读取data及checks；不自动换房/时间/参与人 |
| OPERATION_UNCERTAIN / 10 | unknown，原ID只读查看或--refresh；绝不补发 |
| OPERATION_STATE_UNAVAILABLE / 1 | 保留私有操作目录、未知锁及磁盘unknown，不删除/重置；读取data中更强的来源结果 |

任何非零操作回执（含130/143、清理失败、保存失败）均保留data。confirmed/already_cancelled/not_applied是业务结果，不代表本地保存或清理成功。OPERATION_STATE_UNAVAILABLE与data.not_applied同时出现时，来源已明确拒绝未生效，但磁盘可能仍unknown，禁止重发；不能把它解释为“业务结果未知”。没有data才说明无法获得可信操作结果。网络/预算错误对操作不能按只读查询习惯重跑；使用原operation只读核对。
