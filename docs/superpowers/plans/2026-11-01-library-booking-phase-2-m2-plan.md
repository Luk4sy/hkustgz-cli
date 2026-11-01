# Library booking L2-M2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现无学校写入的创建/取消预览、本地操作凭据、防重与恢复框架，完成后停在M2供用户审查。

**Architecture:** 独立OperationResult及私有operations存储；状态锁包围学校只读会话，锁顺序为operation→profile。来源适配器只提供已有GET数据和新鲜主体；未决规则保持unknown，真实create/cancel没有发送实现。

**Tech Stack:** Node24、TypeScript/ESM、Zod、Commander、Playwright；不新增依赖。

**Spec:** ../specs/2026-11-01-library-booking-phase-2-spec.md (§4–10)。M1基线5105fcc已由用户验收。

## Global Constraints

- 原目录feat/cli-foundation工作，沿用用户工作区及提交约定；M2完成集中提交，不推送、不更新实际CLI/Skill/候选包，不进入M3。
- 300秒绝对预览截止；已解决最小回执默认7天，unknown/dispatching不自动删除或解除防重。
- 私有目录0700、文件0600；拒绝链接/穿越/未知归属/坏状态/未知锁，原始主体和认证应答不落盘。
- 既有只读契约不变。预览使用独立OperationResult，未明规则不产生ready/摘要；新学校路线仍pending，合成ready仅验证框架。
- 创建/取消只有命令与pending门禁，不实现真实发送。operation refresh只读，匹配相似记录/列表缺失不能解除unknown。

## Review Focus

1. 身份刷新超时/换账号不能留下可提交预览；核验完成且会话清理完成后才持久化。
2. 崩溃遗留dispatching、过期unknown、跨进程竞争不能重新发起相同意图。
3. 文件替换、损坏、符号链接及锁归属不明不能被当作空存储重置。
4. 意图等价规范化、不同参与人/用途/规则版本必须绑定不同摘要；本地篡改必须失败。
5. JSON/table失败回执保留操作ID、状态及下一步；help/pending/local operation不启动学校会话或读取stdin。

## Task 1: M2预览与操作状态完整交付

**Files:**
- Create: src/booking-operations/{contract,intent,store,workflow,handlers}.ts
- Create: src/adapters/booking-library/preview.ts
- Modify: src/{cli/commands,cli/main,cli/render,core/contracts,core/errors,core/capabilities}.ts
- Modify: src/adapters/booking-library/{detail,inspection-reader}.ts
- Test: tests/booking-operation-{intent,store,workflow,cli}.test.ts
- Document: docs/acceptance/library-booking-phase-2-m2.md、Spec阶段及AGENTS最新授权。

**Interfaces:**
- `normalizeIntent(value:unknown,now:number):LibraryBookingIntent`：严格schema、显式时区、同学校日、未来分钟区间、唯一数字参与人ID及最小用途。
- `withOperationStore<T>(home:string,run:(store:OperationStore)=>Promise<T>):Promise<T>`：持有状态锁，安全密钥/文件校验，原子持久化；prepare/read/beginDispatch方法供workflow与未来模块消费。
- `OperationSource`：只读identity/createAssessment/cancelAssessment，来源实现把未决规则固定为unknown；跨读取前后核验主体。
- `createOperationHandlers()`：booking.preview/cancel-preview/operation；受类型明确的resultKind约束。create/cancel始终pending。

- [x] Step1：先写意图、摘要/契约、私有状态/过期/崩溃/并发测试，执行观察RED；实现最小模块并GREEN。
  Run: `node --import tsx --test tests/booking-operation-intent.test.ts tests/booking-operation-store.test.ts`
  Expected: 缺模块RED；规范化等价、换主体/参数/规则拒绝、一次dispatch、坏文件/未知锁不重置、unknown保留及过期去载荷GREEN。
- [x] Step2：先写workflow及来源隔离测试，观察RED；实现preview/cancel-preview/read/refresh，读取完成并清理成功后才prepare。
  Run: `node --import tsx --test tests/booking-operation-workflow.test.ts`
  Expected: ready仅合成证据、unknown无摘要、换号/超时/清理失败无凭据、缺失取消目标unknown、相似记录不确认、refresh不调用写入替身。
- [x] Step3：先写实际CLI JSON/table、stdin限额、pending不读取输入/不启动会话、operation退出10与保留data测试；观察RED后接入独立结果/错误码与命令。
  Run: `node --import tsx --test tests/booking-operation-cli.test.ts`
  Expected: CLI按operation协议校验输出，损坏返回1，摘要/过期/防重返回2，规则blocked4/unknown6，pending8，unknown10；旧查询仍原协议。
- [x] Step4：运行全量`HKUSTGZ_TEST_BROWSER=1 npm test`、`npm run typecheck`、`git diff --check`；记录真实输出、文档及能力状态，不访问真实账号或进行写入。
- [ ] Step5：独立最终代码审阅（执行计划技能要求），Important/Critical用回归RED→GREEN修复并全量验证。集中本地提交，停M2等用户审查。

## Self-review / decisions

本计划仅实现Spec的M2范围；M3/M4服务端发送、权威成功/取消确认不实现。pending预览命令不进入学校，真实读取适配器仍实现并可用合成输入验证，待真实正向证据后另行提升状态；本地operation状态读取是本机能力，无学校verified声明。Spec中的实际参与人资格未有完整来源，不自行补本人或验证任意账号ID。既有M1规则报告保持保守；框架可处理未来来源ready，但当前生产适配器不能产出ready。用户已经明确授权按Spec开发，沿用既有inline方式，不重复索取计划批准。

当前记录：M2针对性37项通过；全量323/323、0跳过，构建/类型/差异通过。独立最终审阅尚未结束。全部测试使用合成数据，无真实业务访问或写入。
