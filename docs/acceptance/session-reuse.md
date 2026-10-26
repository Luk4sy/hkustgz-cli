# 专用会话实验：分服务验证记录

日期：2026-10-26（Asia/Shanghai）。Task 0 进行中；不是 Task 2 的实现验收。

用户已同意新建专用 profile，并在新窗口完成本人正常认证。研究 profile 位于项目忽略目录 `.hkustgz-cli/research/profiles/chrome`；与日常 Chrome、调研 MCP 浏览器、内置浏览器相互独立。未复制 Cookie，未保存凭据或原始页面，摘要仅含布尔判据及去除查询参数的来源/路径。

## 结果与限制

| 实验 | 观察 | 结论 |
|---|---|---|
| 登录后关闭并重新启动浏览器 | 门户首次15秒观察未到“我的应用”，停在 SSO 登录页 | 单次超时，不足以断言凭据丢失 |
| 独立重新启动同一 profile | 门户出现“我的应用”；Canvas 出现 Dashboard 标题 | 仅界面标记；尚未对照各系统本人数据 |
| 直接访问 SIS | 曾出现 My Calendar 菜单，进一步检查停在 `/auth-sign`、未取得学期/课表依据 | 菜单/标题不能证明 authenticated |
| 经门户 SIS 应用正常跳转 | 门户可复用，后续实验超时 | 具体阶段待定位；未通过 SIS 正向读取验收 |
| Booking / Library | 页面可打开，未取得专用 profile 的已认证正向依据 | unknown |

初始脚本的候选 marker 不作为最终 AuthReport；例如 SIS 公共外壳菜单和 Canvas 隐藏/重复标题都可能误判。脚本为忽略目录中的研究工具，不纳入产品实现或 npm 包。首次 Chrome 在执行沙箱中受 macOS 权限阻止；经授权正常启动后完成上述观察。没有关闭 TLS 校验、拷贝认证状态或接入默认 Chrome profile。

## 待完成

1. 定位门户 SIS 应用跳转的超时阶段，保留去除票据的路径与响应状态；核实用户是否仍需单独正常认证。
2. 按服务建立业务响应/本人数据的正向、登录失效和 unknown 判据；用单个总预算约束等待，避免第一份研究脚本逐页等待累积。
3. 正常登录后关闭，再由新进程读取本人数据；逐系统记录结果。Canvas 标题可见与其他学生可独立使用均未被此实验证明。
4. 失败路线不进入真实适配器实现；如需调整认证方案，先同步设计与 Spec。

首轮结束时 Task 0 尚未完成，19项业务能力保持 pending，Task 2 当时未开始。最新补证与模块进展见下节。

## 2026-10-27 补证与认证模块验收

上述为首轮结果，已由本轮定位其限制：SIS `/auth-sign` 实际是带 Login 按钮的正常入口；原脚本漏点该按钮。点击一次后通过有效学校 SSO 自动恢复本人课表，未输入密码。直接深链接冷启动会再次回到入口，故用户已明确批准无人工输入的会话恢复，并要求据此开发 Task 2。

Canvas 直接课程深链接可能进入另一套原生登录流程。本校已观察的 `/login/saml` 路线可恢复学校会话，再通过正常 Courses 链接取得本人课程列表。逐跳导航拦截另观察到 `https://sso.canvaslms.com/delegated_auth_pass_through`；仅其精确来源经 [Canvas 官方认证文档](https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_launch_overview)核实后纳入允许列表，未允许未知租户来源或通配全部域名。

本轮使用此前本工具创建的项目研究 profile 验收实际编译后的 CLI，仅为这些已知目录补充归属标记；未复制认证数据或借用日常浏览器。新 CLI 进程执行 `auth status --all` 退出0，得到：

| 服务 | 本轮实际 CLI 结果 | 依据/边界 |
|---|---|---|
| Portal | authenticated | 本校来源下出现应用区和退出标记 |
| SIS | authenticated | Login 后恢复已选择学期及带日期课程块 |
| Canvas | authenticated | 学校SAML恢复后取得本人课程表中的课程链接 |
| Catalog | unknown | 公开页面不证明身份 |
| Booking / Library | unknown | 暂无充分的身份正向及失效对照，不使用成功空数组认证 |

研究 profile 现在归本工具管理，仍在 `.gitignore` 中；未将其打包或提交。真实验收只证明当前账号、macOS 与本次环境，不证明第二名学生或 Windows/Linux。Task 0 的剩余业务取证继续作为 Task 4–8 的前置，19项业务能力均未升级；Task 2 完成后仍需用户单独审查。详见 [认证模块验收](session-auth.md)。
