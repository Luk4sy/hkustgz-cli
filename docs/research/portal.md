# Portal 读取证据（研究中）

证据编号：R0-PORTAL-20261026。观察日期：2026-10-26，Asia/Shanghai。本人学生账号；此段为初期观察，当时产品能力pending。最新状态及覆盖限制见下方第六模块补证。

入口 `https://myportal.hkust-gz.edu.cn/`。正常登录经 `https://sso.hkust-gz.edu.cn/Account/Login`，观察到学校 `https://2fa.hkust-gz.edu.cn/` 流程及返回 `/commonback`。不保存 ReturnUrl 内部的 state、nonce、code_challenge、tt 或其他认证值。网页已登录可见“我的应用”“资讯”“我的日程”。

## 页面自身请求

| GET 路径 | 参数名称 | 已观察外层结构 |
|---|---|---|
| `/sopplus/_web/customized/loadAllServiceApps.jsp` | _p、parentCategoryId、clientType、categoryId | result/reason/data；data.total、data.appList |
| `/sopplus/_web/customized/getPortalCenterTermByStrategy.jsp` | _p、parentCategoryId、showCategoryType | data 数组；id/typeName/icon |
| `/sopplus/_web/customized/querySubs.jsp`、`queryAllColumn.jsp` | _p | data 数组；pId/lmmc/wybs/icon/sort/jkcs/sfyyqx/type |
| `/sopplus/_web/customized/getHkustArticleList.jsp` | _p、page、pageSize、wybs | 本次未确认 JSON 结构，不能视为空公告 |
| `/calendar/mgr/api/category/list.rst` | queryType | result.data/ics/sendMsg/total |
| `/calendar/mgr/api/hkust/calendarList.rst` | queryType、type、categoryIds、fromDate、endDate | 数组；day/holidayName/isHoliday/teachingWeek |

最后一条是校历日期信息，不能冒充个人日程。个人日程尚出现“加载中”，未完成其事件响应和结束判据验证。应用 DOM 轮播存在重复节点；不能按 DOM 节点数量声明应用总数。应用稳定 ID/URL 的源映射尚缺，不使用临时票据作为 ID。

## 认证与限制

新项目研究 profile 完成用户正常登录后关闭再开，第一次短观察仍在登录页；随后独立重开观察到“我的应用”。这说明单次短等待会误判，尚未形成可靠的登录完成/失效/复用判据。详见会话实验记录；不将一次 marker 成功标为五系统认证通过。

后续需补应用分页/全部目录、公告列表与详情、个人事件来源/ID/时区、登录失效/403/空结果及会话复用的正向证据。只采集结构，不保存个人卡余额、邮箱、学号或日程内容。

## 第六模块补证：R6-PORTAL-20261027

2026-10-27，项目专用profile冷启动重新验证Portal authenticated。下列补证只记录字段/数量，不保存个人页面或原始响应；静态公开构建的研究副本仅位于忽略目录。

### 应用与公告

- loadAllServiceApps成功标记result字符串1，data.total=23且appList23。使用各条id（数值）作为稳定ID，name/appUrl为源映射；不按轮播DOM节点计数、不点击应用、不把ticket等临时URL值当ID。
- queryAllColumn成功data数组9项。以wybs作为分类ID，不能用多次重复的pId。4个分类的jkcs提供siteId=2及columnId；使用页面已观察的`/mnews/_web/customized/getPortalArticleList16ByUser.jsp`，参数siteId/columnId/page/pageSize。其余来源使用已观察getHkustArticleList.jsp/wybs。页面可能用JSONP请求，去callback后能取得同一JSON数据，不执行脚本。
- 两类列表成功data具有total/list。字段id/title/date/colName/articleUrl/linkUrl；date为学校本地YYYY-MM-DD HH:mm:ss。ID按source:id命名，避免跨源碰撞；不跨源按标题去重。正文content在列表样本为空，不把它当完整正文。
- 实测配置的mnews分类首批总数分别2/5/6/7；root notice来源有6条外部链接公告。正常页面还曾发出pageSize=undefined/wybs=undefined的后续请求，CLI不复用这些未定义业务参数，显式page/pageSize=50及已核实分类；根据总数、预期页量、固定总数和跨页ID核验。
- 真实全分类CLI在第三来源news遇到result1/data=[]。该结构没有可信总数和结束语义；保留前两来源8条，partial/upstream及ADAPTER_CHANGED，不将其视为0条或继续宣称全量。后续源尚未扫描。详情命令可按已发现具体源独立定位文章。
- 同站mnews文章的普通_redirect会到`/mnews/_s2/.../c<column>a<article>/page.psp`，原文章ID可核验。文章354具有唯一.wp_articlecontent，正文1430字符，完整只读HTML可取得。部分链接是外部钉钉、空链接或受限页面；不以空正文成功，不扩展到钉钉账号。详情不执行HTML脚本、不提交确认或已读。

### 日程

- category/list的resultCode为0，result.data内的teamCategoryVOS提供真正id与calendarCateName。calendarCateId在实测均为0占位，不能作筛选。发现id=0、-3、-2、1、-4五项；-1000为校历元数据，不作个人事件来源。
- calendarList的queryType=2/type=0，与页面相同。fromDate/endDate以学校午夜转换UTC，结束日使用to午夜减1秒以适配源闭区间。本产品输出契约仍为[from,to)。返回数组每天一项day（本地YYYY-MM-DD 00:00:00）；在已绑定请求窗口/来源下，没有events字段是该日无事件，不能把未绑定的校历元数据作为个人空日程。
- events字段beginTime/endTime、schedule.title/location/cateGory.id/name；本地时间明确输出+08:00。不返回assignToUserId/createByName等无关身份字段。Outlook的schedule.id=0但tag10有原始事件ID；MyCourse存在id0且tag10缺失，id保留null并警告。课程代码/班次没有独立证据，保持null，不从标题猜测。
- 不同来源的相似事件保留，只按已知标题/起止时间标duplicateCandidate；原始来源身份和重复发生实例不因模糊匹配被删掉。全窗口逐日范围/来源分类检查通过后才使用结束信号。

真实组合/分源对照：按相同窗口逐项在内存比较，1日5事件、7日14事件，零缺失/额外；7日Outlook11、MyCourse3，源ID和事件字段用于内存比对，不落盘。
