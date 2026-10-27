# SIS 读取证据

早期证据编号：R0-SIS-20261026。观察日期：2026-10-26，Asia/Shanghai。角色：本人学生账号。以下为当时观察，五项能力在该阶段均 pending；最新状态见下方第五模块 R5 补证，terms/timetable/today 已验证，history/grades 仍 pending。

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

## 2026-10-27 认证补证

首轮超时已定位：`/auth-sign` 是显示 Student Information System、日期和 Login 按钮的正常入口，原脚本没有点击 Login。正常点击后观察到学校 SSO `/connect/authorize` → SIS `/auth-sign` → `/home` → `/system/my-calendar`，出现学期及带日期课程块。关闭浏览器后直接课表地址仍回入口；在新进程点击一次 Login 可借助有效SSO恢复，无需输入密码。实际编译后 `auth status sis` 及 `auth status --all` 均取得 authenticated。用户已批准仅此无人工输入恢复边界；精确路径以外不自动点击同名按钮。上述补证支持认证模块，不改变业务能力 pending 状态。

## 第五模块读取证据：R5-SIS-20261027

当前范围为 `sis.terms`、`sis.timetable`、`sis.today`；history/grades仍为pending。已有本人认证复用边界不变，查询不等待人工登录。

公开前端构建 `/static/js/18069.8c27abc6.js`（CalendarMode/WorkBenNew）与app构建中的module4164表明：

- 页面使用 `74604.Xb.queryCurrentTerm({})` 取得服务器当前学期，`queryTermValueByPage({pageSize:50,...})` 读取学期目录。旧页面helper缓存并只取前50条，CLI使用新响应，不以UI选中项、主机月份或currentAcademicYear推断当前学期。
- 实测目录共144条，实际3页为50/50/44，ID全部唯一。包装层pageIndex固定1、pageSize固定10，与实际页参数不一致。读取按请求页、总量、totalPage、nextPage和预期每页数量核验，并防止跨页重复ID；错误或未读完会保留可信子集并标partial。
- 学期id/name来自termId、termName（为空时用description）；日期来自termStartDate/termEndDate。当前服务器标记2610。完整课表绑定单个来源学期的起止窗口，支持显式--term，不接受任意日期跨度。
- 学生Time Slots Overview正常调用 `74604.i$.queryStagingStudentCurriculumTimeSlot`，请求为startDate/endDate、includeWaitlistedClass及页面自己的currentUserId。该读取是按学期日期窗口查询，并没有发送termId。CLI绑定来源学期窗口与请求开始/结束时的选中标签；不从classId字符串猜登记学期。
- 客户端返回code=0及完整数组后同步复制字段白名单，保留原始meetingInfoList；不使用页面合并过的教室、教师或日期范围。该接口为无分页参数的整窗读取，实测data=9、totalSize/totalPage=null、nextPage=false、pageIndex=1；额外分页标记只能partial，不能猜下一页请求。
- 从读取学期元数据前固定本人身份，同一请求前后都在页面内校验学生角色和该身份。身份只比较，不复制到Node或快照；不支持studentId查询参数或替换currentUserId。另一学生请求在调用API前拦截；请求期间账号变化不输出旧账号批次。

字段：crseId/crseCode/crseName、classId/classSection、enrollmentStatus，以及meetingInfoList中的classSectionId/classId、startDate/endDate、weekDay、meetingStartTime/meetingEndTime、facilityName、instructorList.instructorName。meeting必须归属父classId；逗号分隔weekday展开保留，0/7按周日归一化。班次ID没有Catalog外部编号的学期前缀，不能假造映射。API未提供学分，credits保持null。

不保存原始响应、个人页面、账号、用户ID、邮箱、凭据或私人结果缓存。自动测试只用合成数据。正常网站自身的登录/profile管理沿用认证模块。

真实验证只记录汇总：144学期/3页/仅1个当前标记；完整课表9门/9个meeting；来源页面完整周的时间、教室、教师逐项匹配，周一至周日为3/2/3/1/0/0/0；2026-10-27今日计划2门。无已知取消/调课样本，exceptionsCoverage一律unknown，今日结果明确警告可能有未核实例外。日期或weekday缺失的meeting另列unresolved，不当成无课。来源学期以外的日期不借用其他学期数据。

history和grades尚无发布状态、完整性及空结果的独立验收；本模块不实现相应解析器，不以无成绩等同无历史，调用继续返回CAPABILITY_PENDING。
