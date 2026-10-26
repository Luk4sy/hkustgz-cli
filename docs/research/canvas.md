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
