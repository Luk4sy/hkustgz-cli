# 第二阶段 L2-M4：精确取消与取消结果核对

日期：2026-11-01。状态：M3 df5b0aa 已获用户复审通过；M4实现及用户复审两项P2修复完成，最新全量438/438通过、0跳过；停下交用户复审，不进入M5。

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

## 独立审阅与单轮修复

一次独立只读审阅发现4项P2，均按实际影响接受并补回归，观察RED后修复；没有Critical或Minor。没有重复独立审阅。

1. sender刚返回精确可信取消ack时，紧随其后的中断检查会掩盖已知成功。现在先验证并保存内存业务快照，再检查信号/截止和保存；SIGINT/SIGTERM错误仍非零，data保留confirmed，磁盘可继续unknown，不能重发。两个信号回归均先复现unknown，再通过。
2. verified_no_effect拒绝在确认保存失败时丢失not_applied。现在与成功结果一样，先保留最小已验证拒绝快照，再尝试保存。保存失败输出本地错误及not_applied，磁盘unknown、防重保留；清理失败控制用例也保留not_applied。生产尚无已验证拒绝码，仍不猜网络错误为not_applied。
3. 已resolved/not_applied重放原先进入缺少intent日期范围的来源assessment。现在直接只读返回本地终态，不开启来源会话，不发送第二次请求。回归先复现错误回执，修复后本地成功返回not_applied、会话0次。
4. workflow/CLI夹具固定2026-11-03取消截止，届时会自动失败。改为从当前业务时钟统一派生未来两天日期、起止和许可截止；网络预算仍用原有实际时间和定时器。新增子进程固定Date.now到2035-06-01，只跑正常引擎及JSON/table三个用例，先确认原夹具3项失败，再确认全部通过；不改产品时钟或权限条件。

修复后针对性取消引擎/CLI/未来时钟38/38通过、0跳过，类型检查通过。最终 `HKUSTGZ_TEST_BROWSER=1 npm test` **434/434通过，0失败、0跳过、退出0**（含构建）；`npm run typecheck`、`git diff --check`及19个本地文档链接检查通过。

### 审阅中保留的范围决定

- 真实学校链路、部署$axios及权限/取消窗口未验：本轮不访问账号或业务写入，保留pending和M0门槛；代价是合成通过不能承诺现场成功。
- 真实权威取消记录语义未证实：生产继续返回undefined，不能依据缺失/128确认；代价是丢应答后部分实际取消可能继续unknown。
- Windows真机、安装包/已安装Skill和M5留后续：遵循模块审查及安装同步边界；代价是本轮不保证这些环境/已安装版本可使用新能力。
- 未改动M3 create.ts同类路径不扩入本轮取消模块：创建ack本身不足以confirmed，M3是独立已验收基线，保留后续专项复核；代价是创建拒绝的保存失败回执仍可能丢失已验证not_applied。本轮未将这点宣称为已修复。

最终按约定保留原目录feat/cli-foundation及本地提交，M4交付用户审查；未进入M5，未更新安装CLI/Skill或候选，未真实预约/取消，未推送或发布。

## 78031a5 用户复审：拒绝页句柄隔离与人数匹配

用户复审指出两项P2。本轮仅修复M4，不修改M3 create.ts或已知not_applied保存失败风险，不访问真实账号或进行预约/取消，不进入M5。

1. 详情读取器原先在分页/重复ID/日期窗口校验前，就把原始页的UUID写入共享取消缓存。现在先在reader内存中暂存该页私有句柄，使用WeakMap以不含UUID的页对象关联；只有queryLibraryDetail完成来源范围、格式、总数/页长、重复ID、日期窗口及前后主体核验后，才调用acceptPage发布。发布前再次核对请求信号和身份有效性；被拒绝的页面没有发布入口，不覆盖已接受前页的句柄。仍可保留前页可信详情并返回partial。
2. 精确取消目标比较补入memberCount严格相等，既用于提交前已取消核对，也用于unknown刷新核对。绑定1人、回查3人的证据不能确认旧操作或解除创建防重；回查恢复为匹配的1人证据后才允许收敛，且全程不补发取消。

四项新增回归均先观察RED再修复GREEN：Chrome的重复ID拒绝页、总数变化拒绝页，及引擎的submit/refresh人数变化。Chrome回归通过两次查询核对：前次完整查询建立可信绑定，后次第2页被拒绝但保留第1页详情，绑定仍与可信页一致，JSON不含私有字段、全部请求为GET。引擎回归同时核对返回状态、取消发送次数、磁盘创建防重及随后合法证据的确认行为。

针对性取消引擎/CLI/未来时钟40项全部通过；Chrome句柄/隐私/身份刷新4项全部通过；类型检查通过。最终 `HKUSTGZ_TEST_BROWSER=1 npm test` **438/438通过，0失败、0跳过、退出0**（含构建）；`npm run typecheck`、`git diff --check`及19个本地文档链接检查通过。
