# 第七模块 Canvas（待审）

2026-10-29。范围为计划Task7四项读取；本机个人alpha，未发布或声明通用分发支持，不进入Task8。认证过程见[认证前置](canvas-auth.md)，证据R7-CANVAS-20261029。

## 支持与覆盖

- `canvas courses`：正常All Courses页面当前课程表，实测9项；不以Dashboard卡片代替全集。当前仅验证my_courses_table，历史/未来课程未证明；name保留源完整标签，单独code未证明时null，termName缺失时null。
- `canvas announcements --course <id>`：当前本人课程的公告列表，源discussion_topics/only_announcements；保留HTML正文为JSON字符串，不执行，不修改已读状态。
- `canvas assignments --course <id>`：Assignments页面正常assignment_groups来源，保留各组作业；实测样本3组/3项。due_at保留，但当前没有学生独立覆盖/提交明细证据，因此dueAtSource及submissionStatus为unknown并警告；graded/markedComplete缺失为null，不以has_submitted_submissions推断本人已提交。
- `canvas agenda [--from --to]`：Planner可见项，明示scope=planner；不是完整作业清单。公告/作业/提醒等itemType保留，markedComplete不代表submitted；只有Planner自身submitted/graded布尔字段明确时映射。学校时区、[from,to)、默认7天/最多31天。实测默认窗口7项。

## 读取规则

仅使用专用浏览器正常登录、本人课程目录、页面实际发出的GET模板。首次请求先核验课程成员关系、导航及捕获模板；已验证的成员关系和完成的导航仅在本次调用内复用，重试只重复GET。无私有Token、API secret、Cookie提取、已读/提交/Planner override写入。白名单排除secure_params、成绩、作者和身份字段，个人结果不落盘。

Link的next只允许同一来源、同一路径和同一过滤参数，page必须递增；禁止跨课程、修改筛选或任意URL。后页失败保留可信子集；受20页/2000条/90秒/单次30秒及500ms来源队列约束，429保留Retry-After。

认证控制命令的5秒观察有时在学校SSO完成前返回unknown。Canvas业务准备可在总预算内额外等待最多25秒进入已验证Canvas页面，再打开已验证/courses并核实本人表格；不输入认证表单，无法确认时失败而不是空结果。正常首批页面请求沿网站本身行为；额外GET由公共策略节流。

## 真实验收

本人已完成专用窗口正常登录；关闭后重开可沿学校SSO进入课程页并读到9门。编译CLI实际：courses complete9；assignments complete3；announcements complete1；agenda complete7，scope=planner。只记录数量和范围，不保存私人响应或正文。

## 独立审查与回归

独立只读审查发现1项Important：首批429重试时已离开课程目录，重新查DOM误报PERMISSION_DENIED。Chrome合成回归先失败，保留本次已核实课程成员关系/导航准备后，重试仅GET；不进行第二轮独立审查。增加collector真实多页、后页失败、筛选保留和Planner范围回归。

一次189项完整运行中，既有SIS冷启动Chrome测试发生CLEANUP_FAILED；其他188通过。停止并行真实浏览器查询后单独复查和重跑，最终结果另列。未扩大清理超时或忽略失败。

## 试用

```bash
node bin/hkustgz-cli.mjs canvas courses --format table
node bin/hkustgz-cli.mjs canvas assignments --course '<课程ID>' --format table
node bin/hkustgz-cli.mjs canvas announcements --course '<课程ID>' --format table
node bin/hkustgz-cli.mjs canvas agenda --from 2026-10-29 --to 2026-11-05 --format table
```

当前证明范围为本人macOS/Chrome专用profile。本次登录成功不证明学校批准第三方OAuth客户端或其他学生/平台兼容；这些仍为发布门槛，不要求用户提供手动个人Token。

补充认证边界：慢SSO过程中稍后出现密码表单，旧URL等待会误报超时。回归先失败，再改为同时等待已验证Canvas页或人工认证表单，后者立即LOGIN_REQUIRED；不代填任何信息。

资源限制：第二次默认并发192项运行有191项通过，既有100ms会话截止测试在上下文启动前耗尽预算，closed计数未达断言。原先隔离SIS+Canvas9项通过。现npm test将文件并发限制为2，保留所有用例及生产超时不变，代价是更长测试时间；最终全套结果须以此命令完成，不忽略先前失败。

受控并发下，原会话100ms测试仍可在文件准备阶段耗尽预算，生产行为正确但未进入其期望验证的“创建后超时”分支。该单元测试改用node:test可控Date/setTimeout，在业务回调开始后推进100ms，确实验证signal、关闭一次及锁释放；不再把文件IO耗时混入断言。生产计时器与清理预算未更改。课程读取meta.readMethod同时明确为dom，避免把课程表DOM读标为API响应。

最终验证：193/193项测试通过，0失败0跳过（含53项隔离Chrome）；构建、类型检查和差异检查通过。保留前述两次资源敏感测试失败记录，最终未更改任何产品超时或跳过测试。
