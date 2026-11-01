# Library booking L2-M3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现显式确认后一次创建、可靠保存来源ID、精确回读及失败/未决恢复；M3交付后停下，不进入M4。

**Architecture:** M2状态锁包围会话；提交前重验，durable dispatching之后才调用一次sender。创建应答ID先持久化，只有同主体精确回读匹配完整意图才resolved；丢应答只保留unknown。正常认证客户端复用已有专用浏览器，受精确POST白名单、载荷校验及禁止重试/重定向保护。

**Tech Stack:** Node24、TypeScript/ESM、Zod、Playwright；不新增依赖。

**Spec:** ../specs/2026-11-01-library-booking-phase-2-spec.md，§4–8、L2-M3、L2-A04–A16/A19。

## Global Constraints

- M2基线ccafc4a已获用户验收；沿用原目录feat/cli-foundation与inline执行，按完整实现/审阅修复集中本地提交，不推送/安装/更新候选或Skill。
- M0资格、额度、规则位与维护仍不完整，生产来源不能ready；create仍pending。测试ready/拒绝/确认仅为合成证据，不声称真实创建通过。
- 真实预约须具体预览及本次明确授权；没有ready及授权则本轮不创建。M4取消实现/业务操作均不进行。
- 300秒摘要、同账号/动作/完整意图/规则版本；至少1000ms剩余预算才进入dispatch。一次写入无自动重试，共用90秒截止，保留信号130/143和清理错误下的可信状态。
- 只保存来源ID/最小回执，不保存原始应答、账号或成员名册；确认或明确未生效后删除意图/预览载荷，未知状态不清除。

## Review Focus

1. 截止/中断/会话关闭后不能迟发请求或继续使用已释放的store；已可能发送保持unknown。
2. 应答来源ID先durable后回读；丢应答、相似记录、缺成员证据、换号不能confirmed。
3. 来源/参数变化、过期、非create凭据、未完成磁盘持久化必须零发送。
4. 正常客户端重试/307/额外业务请求不能导致第二次写入；未知非200/非0不被猜成未生效。
5. 成功与待审批分开；确认后浏览器清理/本地保存错误仍保留已知回执、operationId及非0退出码。

## Task 1: 创建链路与精确确认

**Files:**
- Create: src/booking-operations/create.ts; src/adapters/booking-library/create-transport.ts
- Modify: src/booking-operations/{store,workflow,handlers}.ts; src/adapters/booking-library/{reader,model,preview,detail,inspection-reader}.ts
- Test: tests/booking-create-{workflow,transport,cli}.test.ts; extend booking-operation-store/browser regression as needed.
- Document: docs/acceptance/library-booking-phase-2-m3.md, Spec最新授权、AGENTS、公开脚本重验记录。

**Interfaces:**
- `CreateSource extends OperationSource` adds optional `submitCreate(intent,options):Promise<CreateSubmission>` and `readCreated(id,intent,options):Promise<CreationEvidence>`; absence fails before dispatch.
- `CreateSubmission`: accepted(source reservationId), verified-no-effect rejection (only synthetic until real refusal semantics known), or unknown; no arbitrary school errors forwarded.
- `CreationEvidence`: strict exact ID, owner, complete members/purpose match, exact rooms/times, source status and separate approvalState. No similar-record inference.
- Store: validate confirmation, record accepted create receipt, finalize confirmed/proven-not-applied, invalidate changed previews; store lifecycle closes/drains before lock release so detached callbacks cannot mutate it.
- `createReservation(store,session,id,digest,options,now)`; `inspectOperation --refresh` can confirm only persisted source-success ID plus fresh exact proof; no receipt/cancel action stays existing conservative behavior.

- [x] Step1: Write RED tests for store lifecycle/receipt/finalize and create workflow. Cover successful exact confirmation, pending approval, changed terms/actor/intent, expired/mismatched digest, no-effect rejection, unknown, lost response, late timeout, interrupts/cleanup, no second send. Implement minimum and GREEN.
  Run: `node --import tsx --test tests/booking-create-workflow.test.ts tests/booking-operation-store.test.ts`
- [x] Step2: Write fully intercepted Chrome RED tests; implement strict self-only normal-client transport from M0 computed payload and trusted GET readback projection. Check singlePOST, bad body/actor, 307/retry/extra writes, no raw diagnostics. No real session.
  Run: `HKUSTGZ_TEST_BROWSER=1 node --import tsx --test tests/booking-create-transport.test.ts`
- [x] Step3: RED actual CLI both formats and pending gates, add create dispatch integration. Default live capabilities unchanged (24 total,17 verified/7 pending), cancel pending. Ensure known data retained for errors and refresh.
  Run: `node --import tsx --test tests/booking-create-cli.test.ts`
- [ ] Step4: Full Chrome suite/build/typecheck/diff and documentation link checks; commit coherent implementation. Independent final review (fresh reviewer per executing-plans), Important/Critical fixes RED→GREEN plus full suite; record minor/rulings, stop M3.

## Decisions / scope check

公开单次表单脚本重取SHA256与M0相同（08ea4daf...838e8fa）。首批sender只覆盖已记录的sysKind1/resvKind2/resvProperty0、本人单成员、无附件/验证码/附加服务载荷；未知客户端基址或其他情况拒绝。没有已验证的拒绝码及服务端幂等，生产非成功响应保持unknown。实时资格缺口不以“本次测试”放宽，无法形成ready就不进行真实预约验收，不为补样本绕过门槛。

执行记录：初次全量364/365，仅旧锁清理注入时序不再对应已保存回执；分为保存前失锁零写入与保存后清理失败保回执两测试后，最终全量366/366、0跳过，构建/类型/差异通过。当前等待独立代码审阅。
