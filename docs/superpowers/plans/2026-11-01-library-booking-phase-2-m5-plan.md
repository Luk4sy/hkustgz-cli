# Library booking L2-M5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复M3已知拒绝回执风险，整合创建/取消闭环，交付同版本CLI/Skill alpha.4候选，停下等M5审查。

**Architecture:** 复用现有OperationResult/store/handler，合成来源实现跨进程凭据闭环；运行时pending门槛不改。Skill路由到现有命令并解释操作状态；正常打包流程产生新候选，隔离prefix验证安装/alpha.3升级与显式Skill同步。

**Tech Stack:** Node24/TypeScript/Playwright/Zod，无新增依赖。

**Spec:** ../specs/2026-11-01-library-booking-phase-2-spec.md §4–10，L2-M5；M4 d82e697已获用户验收，用户了解M5范围后明确继续。

## Global Constraints

- 原目录feat/cli-foundation、本地集中提交。完成停下等用户审查；不更新真实安装CLI/Skill，不push/merge/publish。
- 真实账号/学校写入不在本次授权内。M0缺口/生产unknown/7项pending保留；17项原verified不变。无真实闭环验收不能宣传创建取消可用。
- alpha.4 CLI/package-lock/Skill version及compatible_cli精确一致，schemaVersion仍1。旧候选保留，新候选不得覆盖。
- 具体创建与取消各需独立ready预览及用户明确确认；unknown不补发，刷新只读。数据/诊断不附凭据，operations/profile/key不入包。
- 按既定inline方法实现；一次全模块独立终审；重要修复RED→GREEN和全量通过，不二次重复独立审阅。

## Review Focus

1. 清理/保存/中断与verified_no_effect交叉：非零错误仍保留not_applied，磁盘unknown禁止重发，不能误confirmed。
2. 创建后的取消必须用来源预约ID及独立预览，不复用创建摘要；操作结果与审批分开，未知结果不重试。
3. Skill面对显式确认、催促重试或pending能力，既不能越过确认/门槛，也不能因旧只读约束拒绝未来已verified的合法操作。
4. 新包/安装/升级必须无学校请求，不包含operations、Cookie、身份或本地日志；只升级CLI不自动改已安装Skill。
5. 新候选证据范围必须清晰：实现/合成通过不等真实学校路线/Windows通过，版本相同不能掩盖过时指引。

## Task 1: M5完整交付

**Files:**
- Modify src/booking-operations/create.ts; tests/booking-create-workflow.test.ts
- Create tests/booking-lifecycle.test.ts; extend tests/package-install.test.ts and tests/skill-contract.test.ts as necessary
- Modify package.json/package-lock.json; skills/hkustgz-cli/SKILL.md and references/{commands,errors,examples,privacy}.md; scripts/build-skill-docs.mjs if needed
- Update README.md, docs/{cli-contract,errors,installation}.md; AGENTS.md/Spec; create docs/acceptance/library-booking-phase-2-m5.md and new local alpha.4 candidate/checksum.

**Interfaces:** existing createReservation(store,session,id,digest,options,now) and OperationData remain stable; observed no-effect snapshot stripped of full payload. No new public command. Skill operations guidance lives in references/examples.md unless size warrants one new reference (then bundle allowlists must include it).

- [x] Step1: Add failing save/cleanup/signal refusal tests. Expect not_applied plus original local/signal error, diskunknown on failedsave, replay no send. Implement observed refusal before liveness/save; also derive touched create fixtures from future date to avoid expiry. Run node --import tsx --test tests/booking-create-workflow.test.ts; expected all pass.
- [x] Step2: Add actual executeCommand lifecycle test using tempstate, synthetic only capability overrides and source. Assert preview has no writes, create1 confirms exactID, cancel requires own digest, cancel1 confirms, replayzero, create guard released only after trusted cancel. JSON/table both validate. Run node --import tsx --test tests/booking-lifecycle.test.ts; expected pass.
- [x] Step3: Skill baseline/updated behavioral application evaluations in fresh contexts, five reps per arm, no live tools/side effects. Record actual command/confirmation/unknown/pending decisions. Baseline oldskill refusal of explicitly confirmed verified operation must be observed before authoring. Update conciseSkill and necessary references, versionalpha.4 and CLI docs. Keep capability counts17/7. Run skill/package contract tests and skill validator; expected pass and updated behavior correct.
- [x] Step4: Add real alpha.3 bundle→current candidate isolated offline upgrade test (using git archive of acceptedalpha3 source, not fabricated same-sourceversion), user-profile/operations canaries survive; Skilloutdated until explicitinstall. Validate package privacy and all new public docs ship. Run package tests; expected no external network or student-home writes.
- [ ] Step5: Run HKUSTGZ_TEST_BROWSER=1 npm test; npm run typecheck; git diff --check; local doc links. Generate alpha.4 tgz in local candidate directory with SHA256, inspect entries and version/pending/help; no real installation updates. Record synthetic vs real limitations. Commit coherent module then task-done targeted lifecycle/create/skill tests and one independent final review. Fix Important findings with RED→GREEN/full suite, final local commit and stop for user review.
