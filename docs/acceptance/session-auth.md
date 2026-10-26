# 模块 2：专用浏览器与认证

日期：2026-10-27（Asia/Shanghai）。范围：计划 Task 2。实现完成，等待用户审查；不进入 Task 3。

## 已实现

- 独立数据根与 Chrome/Edge/Chromium profile；归属标记、POSIX 私有权限，拒绝未归属非空目录及符号链接。
- 原子 profile 锁；并发占用退出9。未知/遗留锁不自动删除，不终止未知进程。
- 正常结束、回调失败、总超时、SIGINT/SIGTERM 的清理；上下文关闭失败或超过5秒时保留锁并报告原错误类别。异常期间不输出原始错误、凭据或私人页面。
- `browser status`、`browser use`、`auth login`、`auth status [service]|--all`、`auth logout`。登录支持 Portal/SIS/Canvas；其余服务明确 pending/unknown。状态命令的 unknown 保留为报告，不耗尽会话预算再变成超时。
- 普通会话90秒、登录10分钟；认证观察窗口最多5秒并预留返回时间。SIS 仅在精确 `/auth-sign` 点击一次 Login；Canvas 使用已观察的学校SAML入口。需要人工认证时，状态报告 unauthenticated；业务适配器未来须据此返回 LOGIN_REQUIRED。
- 顶层来源逐跳检查，包括 HTTP 302；未受保护弹窗不导航。Chromium CDP Fetch 用于弥补 Playwright route 只检查重定向首请求的限制。未关闭 TLS 或浏览器沙箱。
- logout 先锁定并验证全部 profile 再删除本工具数据；不撤销学校服务器会话。

doctor、browser install 仍为 Task 9；19项业务查询能力全部 pending，不因登录成功而启用。

## 验证

- 新增基础测试先因缺少实现失败；控制命令、清理超时、锁归属、空壳误认证、信号到达 page setup、网络错误及原始错误类别均有失败到通过的回归记录。
- 完整验证：58项全部通过、0失败、0跳过，含10项真实Chrome集成测试；`HKUSTGZ_TEST_BROWSER=1 npm test`（含构建）及 `npm run typecheck`。浏览器测试使用真实 Chrome、本机 HTTP 和合成页面，不使用学校登录或真实业务数据。默认 `npm test` 跳过浏览器用例；启用变量才能覆盖该层。
- 实际编译后 CLI、已授权专用 profile：`auth status --all` 退出0；Portal/SIS/Canvas authenticated，Catalog/Booking/Library unknown。详见 [分服务冷启动记录](session-reuse.md)。

## 独立代码审阅

未发现 Critical；三项 Important 均已通过回归修复：302绕过来源限制、unknown 被总超时覆盖、网络故障误报内部错误。另修复了真实SSO中文档暂时不存在/被替换的观察问题，补充 Canvas 正确入口与 SIS 精确路径限制。README 的 pending 描述同步为当前范围。

打包干跑检查：33个文件，包含4个 dist/session 模块，不含profile、归属标记、研究原始数据或凭据。未发布npm。

## 审查命令

```bash
npm test
HKUSTGZ_TEST_BROWSER=1 npm test
npm run typecheck
node bin/hkustgz-cli.mjs browser status
node bin/hkustgz-cli.mjs auth status booking-library
node bin/hkustgz-cli.mjs capabilities
```

需要亲自验证登录时，可设置 `HKUSTGZ_CLI_HOME` 为新的空绝对目录，再运行 `auth login portal`、`auth status --all`。不要指向日常 Chrome profile；不要在还要继续使用的已登录 profile 上试验 logout。

## 范围裁定与剩余边界

1. 用户确认后，只推进有认证证据的 Portal/SIS/Canvas 子集；其余 Task 0 证据留在对应业务适配器之前。判断错误的代价是后续认证路线需要调整；不提前暴露业务查询。
2. 允许有效SSO无人工输入恢复，发现人工认证就停止普通检查；未知状态不猜成功或过期。观察窗口过短可能返回 unknown，用户可显式重查或登录。
3. 严格只允许记录的来源；未验证弹窗或新增上游身份域名会被阻止，可能需要补证后更新。不会为兼容自动放宽到通配域名。
4. 仅 macOS 本人账号做真实验收；其他平台、第二名学生账号与业务适配器验收未完成。此模块不构成五系统稳定版或发布批准。
