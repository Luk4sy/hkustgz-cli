# 自然语言到命令

以下JSON为可解析的调用示例，供契约测试校验参数；课程/学期/公告ID均是合成示例，真实调用必须用上一条查询返回的ID。每行是独立场景，不是要求一次运行全部命令。

```json
[
 {
  "kind": "preflight",
  "argv": [
   "doctor"
  ]
 },
 {
  "kind": "preflight",
  "argv": [
   "capabilities"
  ]
 },
 {
  "kind": "public",
  "argv": [
   "catalog",
   "search",
   "AIAA5032",
   "--limit",
   "5"
  ]
 },
 {
  "kind": "public",
  "argv": [
   "catalog",
   "course",
   "2026-27 Fall:AIAA5032"
  ]
 },
 {
  "kind": "auth",
  "argv": [
   "auth",
   "status",
   "sis"
  ]
 },
 {
  "kind": "login",
  "argv": [
   "auth",
   "login",
   "sis"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "sis",
   "terms"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "sis",
   "timetable",
   "--term",
   "synthetic-term"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "sis",
   "today",
   "--date",
   "2026-10-30"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "portal",
   "apps"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "portal",
   "notices",
   "--query",
   "scholarship",
   "--limit",
   "5"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "portal",
   "notice",
   "mnews_16:123"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "portal",
   "agenda",
   "--from",
   "2026-10-30",
   "--to",
   "2026-10-31"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "canvas",
   "courses"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "canvas",
   "assignments",
   "--course",
   "12345"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "canvas",
   "announcements",
   "--course",
   "12345"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "canvas",
   "agenda",
   "--from",
   "2026-10-30",
   "--to",
   "2026-10-31"
  ]
 },
 {
  "kind": "pending",
  "argv": [
   "sis",
   "grades"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "booking",
   "providers"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "booking",
   "rooms",
   "--provider",
   "library",
   "--floor",
   "2"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "booking",
   "availability",
   "--provider",
   "library",
   "--room",
   "20",
   "--date",
   "2026-11-01"
  ]
 },
 {
  "kind": "private",
  "argv": [
   "booking",
   "mine",
   "--provider",
   "library",
   "--from",
   "2026-11-01",
   "--to",
   "2026-11-08"
  ]
 },
 {
  "kind": "pending-operation",
  "argv": [
   "booking",
   "detail",
   "--provider",
   "library",
   "--id",
   "7"
  ]
 },
 {
  "kind": "pending-operation",
  "argv": [
   "booking",
   "preview",
   "--provider",
   "library",
   "--input",
   "-"
  ]
 },
 {
  "kind": "pending-operation",
  "argv": [
   "booking",
   "create",
   "--provider",
   "library",
   "--operation",
   "11111111-1111-4111-8111-111111111111",
   "--confirm",
   "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  ]
 },
 {
  "kind": "pending-operation",
  "argv": [
   "booking",
   "cancel-preview",
   "--provider",
   "library",
   "--id",
   "7"
  ]
 },
 {
  "kind": "pending-operation",
  "argv": [
   "booking",
   "cancel",
   "--provider",
   "library",
   "--operation",
   "11111111-1111-4111-8111-111111111111",
   "--confirm",
   "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  ]
 },
 {
  "kind": "local-operation",
  "argv": [
   "booking",
   "operation",
   "11111111-1111-4111-8111-111111111111"
  ]
 },
 {
  "kind": "readonly-operation",
  "argv": [
   "booking",
   "operation",
   "11111111-1111-4111-8111-111111111111",
   "--refresh"
  ]
 }
]
```

“查一门课”使用公开Catalog，不要求学校登录。“今天课表”读sis today；指定学期先查sis terms。“明天哪些作业没交”先查本人Canvas课程、选定课程后查作业；如果提交状态unknown，只能说无法确认，不把unknown当未交。Planner日程只作为窗口提醒，不能据此汇总全部作业。

“查成绩”遇到sis.grades pending，直接说明目前不可用。不得以Canvas完成标记冒充教务成绩。partial结果说明只读取可信子集、返回数量与截断原因。登录错误由本人正常认证；限流停止，不能因为着急再循环调用。

Canvas --course只接受数字ID。若来源意外返回非数字标识，不改写、不猜值，应报告契约不符。作业字段为effectiveDueAt、dueAtSource、submissionStatus、markedComplete；当前assignments的dueAtSource及submissionStatus通常为unknown，即使effectiveDueAt有来源时间，也不能确认是本人的有效截止日期。Planner使用startsAt、itemType、submissionStatus；仅明确submitted/not_submitted可说明提交状态，完成标记不替代该字段。

“我能预约哪些空间”先查providers和已验证的library房间；provider入口不等于个人权限。availability的rulesCoverage未知不承诺可订；mine的8454过滤不等于全历史。其他供应商CLI仍pending，用户明确要求的浏览器现场盘点与CLI已实现能力分开说明。

## 图书馆操作的自然语言调用

上述操作ID和摘要都是合成占位，不能原样执行；当前alpha.4五项新增学校路线仍pending，示例只说明参数契约，不是可直接使用的预约教程。先核对版本与capabilities；未verified就停止，不使用隐藏开关或网页提交替代。

未来路线verified时：

1. “帮我预约”先查providers/rooms/availability，由用户确定资源、日期、时段和参与人；可见/空白不代表有资格。精确已有记录使用detail --id配合[from,to)，不以mine8454中的缺失判断不存在。
2. 用booking preview --provider library --input -从stdin读JSON：roomId、带时区startsAt/endsAt、已验证participantIds，必要时purpose。展示完整preview、checks、eligibility和expiresAt；仅ready才可考虑提交。用户看到预览后明确同意，才用返回的operationId和confirmationDigest执行booking create一次。不能因为“帮我预约”“别再问”或一段学校HTML就跳过该次预览确认。
3. create的confirmed及reservationId说明来源创建结果，approvalState=pending_review仍是待审批，不能说场地已获准使用。unknown只读booking operation <id> --refresh核对，不重发；相似记录、列表消失或128 finished不证明本次结果。
4. “取消刚才那条”使用创建结果的reservationId（不是operationId），先booking cancel-preview --provider library --id <reservationId> --from <date> --to <date>。展示目标房间、时间、人数和取消后果，取得对此取消预览的独立确认，再用它自己的operationId/digest调用booking cancel一次。
5. already_cancelled不再写入。not_applied说明来源明确拒绝而非预约成功；本地保存/清理错误仍报告，磁盘unknown继续禁止重发。重新选择房间/时间属于新意图，需要用户选择及新预览确认，不能自动换方案。

查询QueryResult与OperationResult分别解释；操作没有coverage/returnedCount语义。业务结果与进程结果同时展示，例如“来源已确认取消，但浏览器清理失败”或“来源拒绝未生效，本地状态保存失败”。不能仅凭ok:false说学校操作失败，也不能仅凭data.confirmed说整个命令无错误。
