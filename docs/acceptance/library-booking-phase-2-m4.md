# 第二阶段 L2-M4：精确取消与取消结果核对

日期：2026-11-01。状态：M3 df5b0aa 已获用户复审通过；M4实现完成，正在最终验证及独立审阅，完成后停下交用户审查，不进入M5。

## 范围与边界

依据[Spec](../superpowers/specs/2026-11-01-library-booking-phase-2-spec.md)及[M4计划](../superpowers/plans/2026-11-01-library-booking-phase-2-m4-plan.md)，实现精确取消预览、一次取消、可信凭据核对和already_cancelled零写入返回。

**本轮没有实际预约或取消，没有访问真实账号。**M0的G-R1～G-R3及其他E2缺口保持；生产取消assessment仍blocked/unknown，不产生可提交摘要，取消等学校路线仍pending。源码24项能力中17 verified/7 pending。本轮只有合成读取/发送测试与官方公开脚本GET；没有CLI真实取消验收，不把M0网页样本冒充本轮验收。实际安装CLI、Skill、候选包及版本均不更新，不推送或发布。

## 实现行为

- `booking cancel-preview --provider library --id <reservationId> --from <date> --to <date>`精确绑定来源ID、房间、起止、人数、当前主体、规则版本及来源取消截止。摘要300秒有效，并独立受来源validUntil约束；未证实取消权限/窗口不ready。
- `booking cancel --provider library --operation <operationId> --confirm <digest>`校验本地凭据后，两次核对来源主体并刷新目标/规则/完整预览。变化则零提交。操作ID与预约ID分开，不能传UUID或按相似标题、列表顺序猜目标。
- durable dispatching/unknown保存成功后，至多转发一次已校验的POST。传输不重试/重定向；沿用来源500ms调度、命令总预算和单次最多30秒。300秒预览和来源取消截止在落盘后、排队后及发送入口复核；SIGINT/SIGTERM阻止后续发送。
- 只有精确目标的M0最终成功应答，或明确的权威已取消记录，才能确认取消。列表缺失、空列表、404、分页/筛选不全和128 finished均不是证据。丢应答后保持unknown，重复命令/新预览不补发，`booking operation <id> --refresh`只读核对。
- 可信取消凭据持久化后，新的取消命令/预览在新鲜主体核验后返回already_cancelled，零写入；准备中的旧凭据也能据精确已取消记录直接收敛。生产尚无已验证持久取消记录语义，因此readCancelled只作既有GET观察并返回undefined；记录证据分支仅合成验证。
- 清理、保存或最后读取失败时，错误回执保留已验证confirmed/already_cancelled、精确来源ID及可知状态，仍非零、retryable=false；首次只读确认尚无本地凭据时operationId=null，不虚构ID。保存失败磁盘继续保守，禁止重发。
- 确认取消时，仅解除同主体、精确来源ID且已confirmed/create_success的创建防重，原子保存；不同目标、不同主体及任何unknown创建都不解除。确认后移除完整意图/预览，只留最小目标/凭据。
- 直接取消成功应答不提供新的预约状态码/审批状态；回执沿用取消前最后已核实值，不把该值解释为取消后的服务端状态。

## 正常客户端与公开证据

官方公开脚本：[本人记录分块](https://libroombooking.hkust-gz.edu.cn/js/chunk-0a13ab7b_1685603939570.js)，SHA-256 `7fd5f94a2c62a58bccfb66319f92dcdf0db841fe2c0238292a828471bae262eb`，与[M0证据](../research/library-booking-phase-2.md)一致。handleDelete传入params.uuid；同一分块的模块581a取消包装函数配置method=post、url=reserve/delete、params=t.params。因此真实映射是POST `/ic-web/reserve/delete?uuid=<opaque>`，请求体为空。这里补充的是公开包装代码证据，没有进行新的真实取消。最初合成传输以JSON建模，核对公开包装后先以query/空body回归复现失败，再校正实现及夹具。

UUID只存reader内存缓存，绑定精确ID/房间/时间/人数和刚核实的创建者账号；刷新身份开始即失效，失败清空，分页首批重建。预览规则版本用本机密钥HMAC绑定UUID，不能反推。UUID、原始账号/名册均不进入OperationResult、本地state或日志。

传输复用页面已登录$axios；核对固定origin、/ic-web基址、当前主体、缓存绑定、唯一uuid查询参数和空请求体后才允许一次route.fetch(maxRetries=0,maxRedirects=0)。严格识别HTTP200/code0/message删除成功/data=null，投影为最小精确ID凭据；响应不透传原始正文或Location。路由守卫保持到会话关闭，拦住客户端重试与迟到写入。真实部署属性/链路仍未现场验收。

## 验证记录

引擎、原生传输、CLI两种输出及隐私/节流均按RED→GREEN实施。覆盖成功和幂等、主体/UUID/参数/取消权限/窗口变化、摘要和预览过期、durable保存/来源排队跨截止、中断、丢应答/空列表/128、错误记录、可信取消回查、保存/清理失败、精确解除防重以及私有缓存更新。Chrome页面和发送全部由本地合成拦截，route.fetch为受控替身，不向学校转发业务请求。

中间完整套件424/424、425/425，均0跳过。后续三项预览边界先复现失败，再修复：准备中的旧凭据未被already_cancelled收敛；首次已取消读取在清理/保存失败时丢失可信事实。修复后针对性引擎/CLI32项及类型检查通过。本轮最终审阅前全量 `HKUSTGZ_TEST_BROWSER=1 npm test` **428/428通过，0失败、0跳过、退出0**（含构建）；`npm run typecheck`、`git diff --check`及15个本地文档链接检查通过。独立审阅及修复结果将在交付前记录。

Windows仅沿用合成测试，没有Windows真机或真实学校取消验收。M0缺口/生产pending门槛与用户逐模块审查要求不变。
