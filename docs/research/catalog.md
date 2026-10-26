# Catalog 读取证据（研究中）

证据编号：R0-CATALOG-20261026。观察日期：2026-10-26，Asia/Shanghai。范围：`catalog.search`、`catalog.course`；产品能力仍为 pending。

入口：`https://sisn.hkust-gz.edu.cn/cq`。使用调研浏览器；另建无 Cookie 的临时 context 对照，未复制任何已有登录态。

## 已实测

- 全新临时 context 可直接读取课程，业务请求未发送 Cookie 或 Authorization。只证明该环境下此页面的公开可读性，不证明所有业务 API 无鉴权。
- 学期输入框 placeholder 为 `Select`；观察到 2026-27 Fall、2025-26 Summer、Spring、Winter。切换 Winter 后仅有1门课程，Fall 默认 AIAA 学科25门。选择学期真实改变结果。
- 搜索输入框 placeholder 为 `Type to search courses, instructors or TA/IA/GTA`。输入课程代码、按 Enter 后旧表仍在；必须选择联想项才能筛选。选择某课程后响应 totalSize=1，DOM 为对应1个 course-card。
- DOM：`.course-code-list` 是学科分组，`.course-card` 是课程，`.course-header` 包含代码/名称/学分；`table.el-table__body` 为班次。表头为 Section、Date & Time、Location、Instructor、TA/IA/GTA、Quota、Enrol、Avail、Wait、Remarks。
- 班次存在 rowspan：第二个 meeting 行只剩日期、地点、教师，不能按固定列数读取每一行。Section 的括号内编号为候选班次 ID；跨学期稳定性尚未验证。
- Fall 默认学科响应 totalSize=25、totalPage=1、nextPage=false、pageSize=10，DOM 确有25个 course-card。不能单凭 pageSize=10 认定 DOM 只有10门，也不能把当前学科认作全校全集。
- 来源显示通常每15–20分钟更新；available 必须取 Avail 原值，不自行用 Quota−Enrol 覆盖。

## 观察到的网络路线

服务来源：`https://sisn-service.hkust-gz.edu.cn`。正常 UI 发出 POST：

| 路径 | 页面操作 |
|---|---|
| `/api/tHkustgzTermInfo/term/listPublicMarketTermInfo` | 加载学期 |
| `/api/course/listPublicMarketCourseSubjectAreas` | 加载学科 |
| `/api/course/pageCourseSupermarkeView` | 课程列表、选择联想搜索结果 |

响应外层含 code、data、isDataEncode、totalSize、totalPage、nextPage、pageIndex、pageSize；成功样本 code 为字符串 `0`，isDataEncode=Y，data 为字符串。请求可见 appkey/sign/timestamp 等头名称；未保存其值，未重放或解码。POST 目前仅按触发的列表操作归类，尚未完成独立请求副作用审计；不直接作为产品 API 使用。

建议候选路线为 DOM + 响应外层计数校验；不能编造编码 data 的内部字段。

## 仍缺的门槛

稳定课程 ID 与 termId 的源映射、跨学科关键词覆盖、无匹配结果判据、课程详情展开、虚拟列表/异常返回、完整性与时区验证尚未完成。尚无 fixture、适配器或真实 CLI 验收。公开缓存暂不启用。
