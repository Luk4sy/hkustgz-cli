# 第五模块：SIS 日历读取

状态：已实现，等待用户审查；不进入第六模块。证据为 [R5-SIS-20261027](../research/sis.md)。

## 实现范围

- `sis terms`：服务器学期目录、来源ID和当前标记。实测144项、3页；不以当前月份、UI选择或当前学年标记推断当前学期。
- `sis timetable [--term <id>]`：单个已核实学期日期窗口的本人计划课表，含课程、班次、多meeting、地点与教师。`--term`使用sis terms中的id，例如2610。
- `sis today [--term <id>] [--date YYYY-MM-DD]`：按Asia/Shanghai日期筛选计划课程，区间结束日包含；不按日期自动猜另一学期。无法定位到该日的meeting保留在unresolved，returnedCount按已返回的唯一班次计算。
- history/grades继续pending；无成绩不能当作无历史，未核实发布状态时不构造0分或成功空数组。

## 边界与完整性

正常学生页面的只读控件触发课表读取。完整响应同步白名单复制后解析，不从分步渲染DOM拼数据。请求窗口和开始/结束标签必须属于已核实学期，includeWaitlistedClass=N，身份从读取元数据前固定，至请求前后均须为同一本人学生账号。另一学生请求在发送前拒绝，账号变化时拒绝旧批次；不复制身份ID或人员邮箱。

来源课表按日期窗口读取，不提供每门课所属登记学期ID。termId表示查询上下文，不通过班次ID推断。API未提供的学分为null。尚未取得真实取消/调课证据，所有meeting的exceptionsCoverage=unknown，今日输出为计划课程并附EXCEPTIONS_UNKNOWN。未承诺实际授课或考试安排。

完整课表允许单个来源学期范围，仍受90秒/单次30秒、每来源500ms及2000条输出上限约束。学期目录最多20页/2000条；响应页码的已观察默认值不作真实页号，实际请求页、预期数量、固定总数及跨页唯一性共同校验。后页失败保留可信子集；不伪造游标。课表来源若宣称额外页，只返回partial/upstream。所有私人结果只在当前调用内存中处理。

## 验证记录

- 全套146项测试通过，含32项本机Chrome合成测试；构建和类型检查通过。
- 编译后的实际CLI三命令验证：terms complete/3页/144项；timetable complete/1页/9门；today complete/1页/2门。只记录数量，不保存个人明细。

- 合成解析与CLI：多时段/教室不丢失；学校午夜与主机时区分离；未知当前学期需显式--term；真实空响应与失败/未确认空响应区分；来源范围、标签、meeting归属、分页、截断及不完整子集；未排期meeting保留，学期外日期不混用其他学期。
- 完全拦截网络的Chrome：完整本人批次、空课表、另一学生请求拦截、请求过程中账号切换拒绝。
- 真实汇总：144学期/3页；9门课程/9个meeting；一完整周的时间、教室、教师与来源页面全部匹配；今日计划2门。未保存个人明细，无真实例外样本。

## 独立审阅

新上下文只读审阅未发现 Critical/Important。16项 SIS 单元/CLI 与6项完全拦截网络的Chrome测试复验通过。待补轻微项：显式切换到非当前学期、延迟下拉及响应、初始勾选候补的联合界面回归；当前未复现实现错误，标签和范围不匹配已有解析层测试。

## 试用

```bash
node bin/hkustgz-cli.mjs sis terms --format table
node bin/hkustgz-cli.mjs sis timetable --format table
node bin/hkustgz-cli.mjs sis today --format table
node bin/hkustgz-cli.mjs sis today --term 2610 --date 2026-10-27
```
