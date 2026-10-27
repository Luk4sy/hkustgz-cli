# 模块 3：有界查询、日期与脱敏

日期：2026-10-27（Asia/Shanghai）。范围：开发计划 Task 3。实现完成，等待用户审查；不进入 Task 4。

## 已交付

- `collectPages`：默认最多20页、2000条返回记录；实际截断时保留可信子集，给出 limit/page_cap/record_cap/timeout/upstream。只有来源确认耗尽才完整成功，未确认空结果和重复游标不冒充完整查询。
- `buildQueryResult`：统一生成完整/部分查询结果、读取数量和返回数量；部分结果为 PARTIAL_RESULT，经实际CLI输出退出7。最终页超量时 recordsRead 如实反映收到的行数，returnedCount 仍不超过上限。
- `QueryPolicy`：默认总预算90秒，单次读取最多30秒；同来源串行，每次读取结束到下一次开始至少500ms。只对显式确认只读的网络/429失败重试一次，401/403不重试；Retry-After 支持秒数和HTTP日期，超预算不等待重试。
- `resolveDateRange`：学校时区 `[from,to)`，默认7天、最大31天；非法日期、倒序、空范围和超长范围拒绝。CLI日期默认及校验已接入，完整学期课表命令不受这条日期窗口默认影响。
- `sanitizeSourceUrl`、`sanitizeValue`：清理URL身份信息、临时参数、hash路由和嵌套相对跳转地址；处理嵌套凭据字段、认证头和带前缀/序列化的诊断内容。JSON/table共用脱敏结果，普通业务 code/state、课程和日期过滤参数保留，不变异输入。
- CLI向未来业务handler传递同一次查询的绝对deadline。SessionRunner现在通过AbortSignal传递结构化中断原因，分页器保持130/143语义，不将用户中断转成部分成功。

全部19项业务能力仍为 pending；本模块没有实现学校适配器，没有登录学校、读取真实profile或改变发布范围。

## 内部接入方式与裁定

1. `PageSource` 增加可选 origin/readOnly。origin 仅为已验证服务的调度分组，不是请求目标；没有 origin 时保守地串行所有匿名来源。readOnly 默认 false，不能只凭方法名或任意POST就启用重试。代价：未补证的读取不会自动重放，匿名来源可能较慢。
2. `collectPages(source, options, policy?)` 的第三参用于共享查询策略或注入测试时钟；常规两参签名仍可用。生产默认策略共享同来源队列。传入策略的deadline必须与options一致，不能借此放宽总预算。
3. 查询最多提前250ms停止读取（短预算预留10%），让部分结果在共用deadline的会话硬超时前完成交接。代价：可用读取时间略短，但仍遵守90秒上限。已通过与真实SessionRunner共用deadline的合成集成测试。
4. 底层操作忽略AbortSignal时，调用方按时收到超时，同来源队列仍等该操作真实结束，避免重叠请求。代价：后续同来源操作可能超时，不会趁旧请求尚在执行继续发新请求。
5. 来源准确耗尽、且没有省略记录时，即使恰好达到页数/limit边界仍可 complete；不能把“碰到数字边界”一律当成已截断。上游页过大无法事后撤回，未来适配器仍须限制页尺寸并遵守读取证据。
6. Retry-After 约束本次逻辑读取的重试，不扩大为其他独立查询的全来源冷却；其他查询仍受同来源互斥与500ms间隔约束。若上游实际共用更大的限流桶，适配器阶段需按证据补充策略。
7. 脱敏面向JSON形状的正常输出及识别到的认证字段，不是任意自定义getter/toJSON的执行沙箱。适配器仍只返回经过模型校验的数据，不默认保存原始日志或响应。

## 验证

完整验证命令：

```bash
HKUSTGZ_TEST_BROWSER=1 npm test
npm run typecheck
```

本轮96项测试全部通过、0失败、0跳过，含既有10项真实Chrome本机/合成网页测试；构建、类型检查和差异检查通过。普通 `npm test` 会跳过这10项浏览器用例。

关键覆盖：第21页不请求、第2001条不返回、limit实际截断、确认空结果、游标循环、先读行后失败、30秒/90秒预算、实际读取取消、忽略取消的来源互斥、401/403、429秒数/日期、无只读许可不重试、学校午夜、实际洛杉矶/东京主机时区、闰日/非法日期及31/32天边界。日期错误在pending gate之前退出2；完整/部分结果走实际CLI边界。

独立审阅未发现Critical；两项Important均先复现再修复：带前缀的JSON字符串凭据泄露、嵌套路径相对URL中的票据遗漏。JSON/table均补回归；没有将业务code/state一并删除。

打包干跑检查共42个文件，包括新core模块，不包含profile、研究原始数据或执行账本；未发布npm。

## 用户审查入口

```bash
node --import tsx --test tests/query.test.ts tests/policy.test.ts tests/sanitize.test.ts tests/query-cli.test.ts
node bin/hkustgz-cli.mjs portal agenda --from 2026-02-30
node bin/hkustgz-cli.mjs catalog search Synthetic
node bin/hkustgz-cli.mjs capabilities
```

非法日期应退出2；合法业务查询仍退出8/CAPABILITY_PENDING。只有后续适配器补证、实现并通过真实验收后才会升级能力，不能以这些合成测试宣称校园业务已接通。

## 用户复审修复（三项中等问题）

1. 相对链接：href/src/link等字段和独立路径字符串会清理临时参数，保留course过滤；普通房间标签与原输入对象不变。JSON/table均覆盖。
2. 嵌套序列化：扫描诊断中的有效JSON对象、数组及字符串值，逐层解析再脱敏，处理response前缀与多重序列化payload，保留前后文本及业务code/state。结构化片段不再按普通文本整段重写；超出递归或无效片段边界时使用截断标记。
3. 单次读取截止：成功、失败两条分支使用相同截止时间。即使事件循环延迟导致定时器未运行，30000/30001ms才到达的失败也返回QUERY_TIMEOUT，不自动重试。

三项回归在修复前均失败。本轮完整96项测试、构建、类型检查和差异检查通过。仍等待第三模块复审，未进入第四模块。

## 带引号凭据赋值回归修复

带双引号的 token、password、access_token 赋值现在保留字段名与值的关联后再脱敏；普通 courseCode 和 state 保持原值。新增回归先复现失败，再验证 JSON/table 均不输出凭据标记。完整96项测试（含10项Chrome本机合成测试）、构建、类型检查和差异检查通过。等待第三模块复审，未进入第四模块。
