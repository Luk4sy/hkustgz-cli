# Canvas 读取证据（研究中）

证据编号：R0-CANVAS-20261026。观察日期：2026-10-26，Asia/Shanghai。角色：本人学生账号。产品能力均 pending。

## 认证与页面

入口 `https://hkust-gz.instructure.com/`。未登录样本跳转链为 `/` → `/login` → `/login/saml` → `https://sso.hkust-gz.edu.cn/saml/sso` → `/Account/Login`。登录表单包含 GZ campus username、Password、Sign in；HTTP 200 的登录页不能当成功业务响应。

正常登录调研浏览器后可读 Dashboard。`/courses` 页面 `#my_courses_table` 有9条本人课程；Dashboard 卡片可能隐藏，不能凭 `.ic-DashboardCard` 节点数量断言可见课程或全集。专用 profile 再开曾看到 Dashboard 标题，但未完成本人课程表冷启动验收。

## 真实观察到的 GET

以下均由网页自身触发，未用文档猜测端点、未重放、未申请个人 Token。

| 路径 | 已观察结构 | 未证明 |
|---|---|---|
| `/api/v1/dashboard/dashboard_cards` | 数组；id、courseCode、term、href、enrollmentState、enrollmentType 等 | 全部课程覆盖；不能代替 `/courses` |
| `/api/v1/planner/items` | 数组；context_type、course_id、plannable_id、plannable_type、planner_override、plannable_date、plannable、submissions 等；查询含 start_date/end_date、include[]、page、per_page 等 | 学生个人覆盖时间与全部事件映射 |
| `/api/v1/courses/:courseId/assignment_groups` | 查询 override_assignment_dates=true；数组内 assignments；作业含 due_at、lock_at、unlock_at、grading_type、submission_types 等 | 样本缺少 submission/overrides；个人有效截止时间、提交状态不能从字段存在推断 |
| `/api/v1/courses/:courseId/discussion_topics` | 公告列表查询 only_announcements；含 id、title、posted_at、message、is_announcement、html_url、read_state 等 | 完整分页和公告语义校验 |

Planner 与列表响应可含 Link，实际观察到 page 翻页请求。作业样本3组3项，Link 含 current/first/last；不推广为所有课程仅1页。网页部分 GET 带 X-CSRF-Token，记录头名称即可，不读取/保存其值。

## 后续门槛

候选为响应监听/DOM；Cookie 会话下的独立 HTTP 读取尚未验证。学生覆盖截止时间、submitted/graded/markedComplete 的源字段和差异样本、日期区间/时区、认证失效与权限判据、另一名学生账号及可分发认证路线均未验收。不改变公告已读或提交状态，不使用个人 Token 作为分发要求。

## 2026-10-27 认证补证

实际专用 profile 验证：本校正常 `/login/saml` 入口可通过既有学校SSO恢复，再进入 Courses 读取个人课程表。编译后 CLI 已报告 authenticated。直接 `/courses` 深链接可能进入另一条原生登录链，因此不作为新会话的认证入口。

逐跳检查观察到 `https://sso.canvaslms.com/delegated_auth_pass_through`；[Canvas 官方文档](https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_launch_overview)证明该来源是其认证服务。记录实际路径与官方域名归属是两类证据，不将文档中其他端点冒充本校实测。未知租户身份来源仍被阻止，没有放宽通配域名。

正常跳转中 DOM 上下文会替换，document.body 也可能短暂不存在；此时保持 unknown 并在同一观察预算内重读页面，不重新发起登录。上述结果仅证明当前账号、专用 profile 与 macOS 的认证子集；业务字段及可分发性门槛仍未通过。

## 2026-10-28 新登录链补证（Task7前置）

学校/login/saml实际重定向到精确租户`https://47277e8d-a0fd-490e-b982-ee46ab1fd96f.sin.login.instructure.com/am/oauth2/alpha/authorize`。不记录认证参数值。该精确域名的公开HTTPS根页在正常TLS校验下返回HTTP200、Log in to Canvas。来源归属与本校真实跳转为两项证据；只加入此精确来源，相似租户不允许。

普通冷启动未恢复到可核实的本人课程数据，保留unknown。观察结束时页面可能仍在替换；新回归保证此时不抛内部错误、不误报成功。已打开专用可见登录窗口等待本人正常认证。当前不启用四项Canvas业务，遵守EVID-03与Task7 Step1。详细记录及认证分发边界见[Canvas认证前置](../acceptance/canvas-auth.md)。
