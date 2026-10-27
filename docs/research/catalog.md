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

## 第四模块补证（2026-10-27）

证据编号：**R4-CATALOG-20261027**。读取路线为已知公开 `/cq` 页面正常学期/学科点击及 DOM 读取，不重放签名 POST、不解码响应 data。

- 无 Cookie 的独立临时 Chrome 再次读到 Fall 课程；产品仍不将公开可读性当作账号认证。暂不启用运行时缓存，不保存页面、凭据或网络正文。
- 学期标识使用来源下拉的原样标签（例如 `2026-27 Fall`、`2025-26 Winter`）；不声称它是编码 API 的内部 termId。课程 CLI id 为 `termLabel:courseCode`，班次 id 再附来源括号内班次编号。命名空间防止跨学期混淆；源标签或代码改变时 CLI id 随之改变。相同 Fall 课程在两个独立进程中标识一致。
- `.course-code-list .code-item` 为完整可见学科入口；`.active` 表示当前学科。Fall 本次30个入口，Winter本次2个。响应 `code=0,totalPage=1,nextPage=false,pageIndex=1` 且 `totalSize` 与完整 DOM card 数相等，才接受单个学科。无法证明耗尽、虚拟列表少行、表头变化或异常响应均失败，不把可见子集视为全量。
- 搜索采用各已核验学科完整课程集合上的本地大小写无关子串匹配：课程代码、标题、meeting教师及助教。没有采用无完整性计数的联想项作为全集；匹配范围随结果 warnings 返回。最多读取20个学科页/2000条源课程，之后过滤并应用用户返回 limit；未扫完的搜索为 partial/退出7。页数是通过校验的学科数据页数，页面启动的学期/学科目录请求不算结果页。
- header 来源：`.course-header` 的代码、标题、`[N Credits]`；班次列按表头 Section / Date & Time / Location / Instructor / TA/IA/GTA / Quota / Enrol / Avail / Wait / Remarks 映射。按 rowspan 展开全部10列，meeting保留原始日期时间文本、地点、教师和助教；TBA保留为来源文本，数字缺失标记为null。班次重复行必须保持相同名额/限制字段，否则拒绝结构变化。available直接来自Avail。
- 切换学期或学科后，须观察课程 DOM 的实际更新，再核对响应计数、学科前缀及当前学期；只收到响应或输入框变更不足以接受新学期数据。
- 编译后真实CLI：Fall搜索IPEN5100得到1个匹配，读取20学科/248源课程后返回partial/page_cap；同课程详情核验IPEN完整19门后返回complete，保留班次6405、Mo 06:00PM–08:50PM、Rm202 E3以及来源名额。Winter搜索`a`读取2学科/2课程并返回complete，证明学期影响查询；不是固定假定Winter只有1门。课程名额仅是抓取时快照，来源通常15–20分钟更新。

启用 `catalog.search`、`catalog.course`，其他17项业务能力保持pending。完整性仅限结果披露的范围；多页上游学科响应若将来出现，当前拒绝并返回结构变化，未猜测翻页接口。

第四模块用户复审补证：任意卡片文本变化不能证明课程数据更新。运行时现比较课程字段及班次单元格投影，忽略卡片额外提示；存在任一与旧数据完全相同的课程时不能建立刷新证据，超时失败。修复后的编译CLI再次读取Winter两学科并返回complete。详见验收记录。
