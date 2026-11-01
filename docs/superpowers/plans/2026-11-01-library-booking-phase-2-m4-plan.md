# Library booking L2-M4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精确预约取消、一次提交、可信取消凭据/结果核对及已取消零写入返回；完成停M4等用户审查，不进入M5。

**Architecture:** 沿用M3操作锁/会话信号/300秒摘要和deadline。UUID仅存在来源reader/transport内存闭包，规则摘要用本机HMAC绑定，状态/输出不含UUID。只有M0已证明的精确delete成功应答或明确权威取消记录可确认；缺失/128 finished/HTTP成功不能代替取消证据。

**Tech Stack:** Node24、TypeScript/ESM、Zod、Playwright；不新增依赖。

**Spec:** ../specs/2026-11-01-library-booking-phase-2-spec.md，§4–8、L2-M4、L2-A04至A18。

## Global Constraints

- 基线df5b0aa已获用户验收，原目录feat/cli-foundation、inline执行；集中本地提交，不推送/安装/更新候选或Skill，不进入M5。
- M0取消窗口/维护/权限缺口保留，生产cancelAssessment不能ready；cancel等学校路线仍pending。本轮不真实取消或预约，不访问真实账号。
- 具体业务取消另需用户看到精确目标/后果并明确确认；没有ready不提交。只允许一次POST，不重试/重定向，共用90秒、单次30秒、自发来源500ms。
- 预览300秒；另外绑定来源取消许可validUntil并在耐久dispatch/排队/真正发送入口复核，SIGINT/TERM即时阻止后续写入。
- 未决状态不清除；确认后删除完整载荷，只保留精确ID、目标最小字段及凭据种类。取消只释放同主体/精确来源ID的已确认创建防重，不解除任何unknown创建。

## Review Focus

1. resvId与UUID不能混用；错目标/变更UUID/账号/日期/权限/窗口均零提交，UUID不得进入JSON/table/本地state/日志。
2. 记录缺失、部分分页、404、位128不能证明取消；应答丢失后不补发，必须unknown。
3. 中断/过期/取消截止与500ms排队交叉，含存储持久化延迟时不能迟发。
4. 清理/保存/最后读取失败时仍保留已验证业务结果与非0回执；磁盘保守状态不被错误解除。
5. 已取消重复调用零写入；解除创建防重只能用精确同主体取消证据，不能跨账号/目标/unknown状态释放。

## Task 1: M4取消完整实现

**Files:**
- Create: src/booking-operations/cancel.ts; src/adapters/booking-library/cancel-transport.ts
- Modify: src/booking-operations/{workflow,store,handlers,contract}.ts; src/adapters/booking-library/{preview,inspection-reader,detail,identity}.ts
- Test: tests/booking-cancel-{workflow,transport,cli}.test.ts; extend browser/source/store regressions.
- Document: docs/acceptance/library-booking-phase-2-m4.md, Spec最新授权与AGENTS。

**Interfaces:**
- `CancelTarget`: exact reservationId, roomIds, startsAt/endsAt and memberCount; no UUID.
- `CancelSource extends OperationSource`: optional readCancelled/submitCancel, bounded CancelAssessment.validUntil; default unknown gates retained.
- `CancelSubmission`: verified exact-ID m0_delete_success ack / verified-no-effect rejection / unknown. `CancellationEvidence`: explicitly authoritative exact cancelled record, never list absence or guessed status bit.
- `cancelReservation(store,session,id,digest,options,now)`, `prepareCancellationPreview(...)`, `confirmCancellation(...)`; already_cancelled supports zero-write preview/command.
- Store persists bound cancellation target, permission deadline, minimal cancel_success/cancelled_record receipt; exact confirmed create guards can become inactive while unknown guards remain.

- [x] Step1: RED store/engine/preview/refresh tests; implement minimal. Cover exact success/ack, already-cancelled/local proof, expired/owner/rules/target/changed params/permission/no-effect/unknown; saved vs observed evidence and no resubmit.
  Run: `node --import tsx --test tests/booking-cancel-workflow.test.ts`
- [x] Step2: Fully intercepted Chrome RED tests, implement exact M0 payload/client with one-forward guard; private cache binds uuid to fresh owned record and target/HMAC; verify UUID absence from all exported data.
  Run: `HKUSTGZ_TEST_BROWSER=1 node --import tsx --test tests/booking-cancel-transport.test.ts tests/booking-detail-browser.test.ts`
- [x] Step3: RED actualCLI JSON/table, pending gate, precise confirmation and error exits; integrate handlers. Extend refresh only for authoritative cancellation evidence; test failed persistence/cleanup still retains verified results and guard safety.
  Run: `node --import tsx --test tests/booking-cancel-cli.test.ts`
- [ ] Step4: Full Chrome suite/build/type/diff/doc-link checks, coherent local commit. One fresh independent final review per executing-plans; important fixes RED→GREEN/full-suite; record rulings and stop M4.

## Decisions

M0 delete应答是HTTP200/code0/message删除成功/data=null；仅来源transport已核对精确UUID后才能产生cancel_ack。未有服务器持久取消记录证据，生产readCancelled只做已验证GET观察且返回undefined，128 finished不映射为cancelled。已有可靠本地取消凭据可在新鲜主体核验后返回already_cancelled；取消不需要也不能重新提交来“确认”。UUID/账号/名册不落盘，不存在按最近一条或相似记录选择目标的分支。真实资格未闭合因此不实施现场写入验收。
