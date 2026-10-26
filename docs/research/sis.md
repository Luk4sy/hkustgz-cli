# SIS 读取证据（研究中）

证据编号：R0-SIS-20261026。观察日期：2026-10-26，Asia/Shanghai。角色：本人学生账号。五项 SIS 能力仍为 pending。

## 页面与字段

- 课表入口 `https://sisn.hkust-gz.edu.cn/system/my-calendar`。登录后的调研浏览器可见 Term（placeholder `Select`）、Weekly Calendar、Time Slots Overview、Include Waitlisted Class；课程块含课程代码、班次、日期范围、时段、教室和多教师。当前学期不能按本机月份推断。
- 菜单 Course History 导航到 `/student-record/course-history`。表头 Course、Description、Term、Grade、Units、Status；本账号最终加载9条记录。数字仅作当次覆盖观察，不保存记录内容。
- 初始 DOM 曾显示 No Data、0行，随后成功请求完成才出现9行。这是瞬时加载空态，不能作为成功空结果。
- 菜单 My Academics 导航到 `/student-record/my-academics`，可见 My Program、My Term Information、Unofficial Transcript、Academic Requirements，以及 Class、Description、Units、Grading、Grade、Grade Points 等表头。未点击下载成绩单；未保存成绩或个人身份信息。

## 网络与认证

Course History 的正常加载发出 POST `https://sisn-service.hkust-gz.edu.cn/api/course/stucenter/queryStuAllEnrlAndTransferRecord`。另有学生中心信息请求 `/api/maindata/stucenter/getStdntCenterInfo`，其身份内容不属于本产品读取目标。观察到 Authorization、appkey、sign、timestamp 等头名称；不记录值。成功样本 HTTP 200、code 字符串 `0`、isDataEncode=Y、data 为编码字符串。

DOM 为候选读取路线，尚未实现或重放请求。不能据 HTTP 200、标题或菜单 My Calendar 判定本人课表已加载。

## 未通过项与影响

专用 profile 的直接访问曾停在 `/auth-sign`；正常门户 SIS 应用跳转实验亦超时，失败具体阶段需补充定位。调研浏览器成功不能替代该结果。新 profile 的 SIS 本人课表冷启动尚未通过。

学期 ID、成绩 published/unpublished/unknown 源语义、历史完整性、空结果/登录失效/无权限判据、课程例外和时区均待补证。history 与 grades 独立保留 pending；不以“有 Grade 列”宣称正式成绩能力已完成。
