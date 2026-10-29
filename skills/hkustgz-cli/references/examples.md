# 自然语言到命令

以下JSON为可解析的调用示例，供契约测试校验参数；课程/学期/公告ID均是合成示例，真实调用必须用上一条查询返回的ID。每行是独立场景，不是要求一次运行全部命令。

```json
[
 {"kind":"preflight","argv":["doctor"]},
 {"kind":"preflight","argv":["capabilities"]},
 {"kind":"public","argv":["catalog","search","AIAA5032","--limit","5"]},
 {"kind":"public","argv":["catalog","course","2026-27 Fall:AIAA5032"]},
 {"kind":"auth","argv":["auth","status","sis"]},
 {"kind":"login","argv":["auth","login","sis"]},
 {"kind":"private","argv":["sis","terms"]},
 {"kind":"private","argv":["sis","timetable","--term","synthetic-term"]},
 {"kind":"private","argv":["sis","today","--date","2026-10-30"]},
 {"kind":"private","argv":["portal","apps"]},
 {"kind":"private","argv":["portal","notices","--query","scholarship","--limit","5"]},
 {"kind":"private","argv":["portal","notice","mnews_16:123"]},
 {"kind":"private","argv":["portal","agenda","--from","2026-10-30","--to","2026-10-31"]},
 {"kind":"private","argv":["canvas","courses"]},
 {"kind":"private","argv":["canvas","assignments","--course","12345"]},
 {"kind":"private","argv":["canvas","announcements","--course","12345"]},
 {"kind":"private","argv":["canvas","agenda","--from","2026-10-30","--to","2026-10-31"]},
 {"kind":"pending","argv":["sis","grades"]}
]
```

“查一门课”使用公开Catalog，不要求学校登录。“今天课表”读sis today；指定学期先查sis terms。“明天哪些作业没交”先查本人Canvas课程、选定课程后查作业；如果提交状态unknown，只能说无法确认，不把unknown当未交。Planner日程只作为窗口提醒，不能据此汇总全部作业。

“查成绩”遇到sis.grades pending，直接说明目前不可用。不得以Canvas完成标记冒充教务成绩。partial结果说明只读取可信子集、返回数量与截断原因。登录错误由本人正常认证；限流停止，不能因为着急再循环调用。

Canvas --course只接受数字ID。若来源意外返回非数字标识，不改写、不猜值，应报告契约不符。作业字段为effectiveDueAt、dueAtSource、submissionStatus、markedComplete；当前assignments的dueAtSource及submissionStatus通常为unknown，即使effectiveDueAt有来源时间，也不能确认是本人的有效截止日期。Planner使用startsAt、itemType、submissionStatus；仅明确submitted/not_submitted可说明提交状态，完成标记不替代该字段。
