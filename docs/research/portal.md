# Portal 读取证据（研究中）

证据编号：R0-PORTAL-20261026。观察日期：2026-10-26，Asia/Shanghai。本人学生账号；产品能力 pending。

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
