# 错误与退出码

| 退出码 | code/情形 | 下一步 |
| --- | --- | --- |
| 0 | 完整查询或控制成功 | 按结果范围使用 |
| 1 | INTERNAL_ERROR、CLEANUP_FAILED | 报告版本、命令结构及错误码，检查专用资源；不杀未知进程 |
| 2 | INVALID_ARGUMENT、INVALID_DATA_HOME | 看命令帮助；仅使用工具归属的安全目录 |
| 3 | LOGIN_REQUIRED | 本人在auth login对应服务窗口正常认证，再查一次 |
| 4 | PERMISSION_DENIED | 到官方页面核实账号权限，不猜接口 |
| 5 | NETWORK_REQUIRED、QUERY_TIMEOUT、RATE_LIMITED | 检查网络或缩小范围；限流时等待，不循环调用 |
| 6 | ADAPTER_CHANGED | 当前来源结构不支持，检查更新或官方入口 |
| 7 | PARTIAL_RESULT | 保留data，说明coverage/范围和truncationReason |
| 8 | CAPABILITY_PENDING、UNSUPPORTED_CAPABILITY、BROWSER_UNAVAILABLE | capabilities/browser status核实；需要Chrome时人工安装 |
| 9 | PROFILE_BUSY | 等待已有CLI/浏览器正常退出，不直接删锁 |
| 130/143 | INTERRUPTED/TERMINATED | 中断清理完成后按需重新执行 |

认证unknown不代表成功或失败；数据unknown不代表否定；未经确认的空白不代表无记录。retryable不是要求Agent外层自动重试，CLI已承担有限只读重试。

遇到启动错误，源码开发者先构建；安装包用户重新安装明确版本。doctor、browser install和Skill管理尚属后续封装批次。报告问题不要附Cookie、profile、原始响应、HAR、截图或私人正文。
