# 图书馆预约第二阶段 L2-M0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 取得图书馆创建/取消所需的可核验协议与规则证据，明确M1能否开始。

**Architecture:** 在原项目目录沿用专用Chrome profile与会话锁。先分析公开代码，再观察正常页面。真实写入仅在具体预览获授权后观察；不新增产品实现。

**Tech Stack:** Markdown、现有Playwright会话设施；不新增依赖。

**Spec:** [第二阶段Spec](../specs/2026-11-01-library-booking-phase-2-spec.md)。用户已授权继续，本计划仅覆盖M0；M1–M5继续逐模块审查。

## Global Constraints

- 按用户约定在原目录feat/cli-foundation工作；不另建worktree，不push/merge/publish。
- 不改产品源码、capabilities、CLI/Skill版本或安装包。
- 不保存原始个人应答、认证信息、截图、HAR、参与人名册或私人预约正文。
- 静态代码只证明候选协议，不能代替实际资格和业务成功证据。
- 真实写入须先展示具体房间、时间、参与人、必要后果并取得授权；M0授权不等于任意样本写入授权。
- 只读研究不得创建占位/草稿；副作用不明的操作不调用。
- M0关键证据不足则明确未通过，不进入M1。研究不做虚假RED/GREEN测试。

## Review Focus

- 公开代码与部署/账号差异：静态与运行时证据分栏。
- 创建前校验暗含写入：逐步分类副作用，未知步骤不调用。
- 同名房间、参与人与来源ID混用：以来源实体映射为准。
- 取消记录从列表消失：必须另有精确目标最终状态或可靠回执。
- 丢应答仅找到相似记录：关联未证实时保持unknown，不承诺全局幂等。

## 文件职责与后续边界

- 本计划：M0步骤、检查和交付门槛。
- 新增`docs/research/library-booking-phase-2.md`：E2-01至06矩阵、公开脚本摘要、字段、调用顺序、副作用与缺口。
- 新增`docs/acceptance/library-booking-phase-2-m0.md`：实际观察、授权边界、检查结果与M0结论。
- 修改`AGENTS.md`与第二阶段Spec：同步授权和进度，不升级实现状态。
- M1规则/身份/详情、M2预览/操作记录、M3创建、M4取消、M5整合封装：本计划不执行。前置模块审查通过后，依据真实证据另写具体实施计划，不提前猜API或函数签名。

### Task 1: L2-M0 协议、规则与真实业务证据

**Files:** 新增上述研究/验收记录；修改本计划、Spec与AGENTS.md。

**Interfaces:**
- Consumes: 现有专用会话、devId实体、本人列表8454过滤、Spec E2-01至E2-06。
- Produces: 每项含来源、证据层级、结论、未知项、是否通过的E2矩阵；为M1提供已核实身份/规则/权威详情映射。缺证时产物为明确缺口，不虚构程序接口。

- [x] Step 1：核对工作区、Spec、既有读取实现与版本。
  Run: `git status --short`、`node bin/hkustgz-cli.mjs --version`。
  Expected: 原目录、无未知改动，版本0.1.0-alpha.3；不修改安装。
- [x] Step 2：只读取得当前部署脚本，在内存分析创建/取消/详情/规则/参与人调用，保存公开路径、摘要与最小协议描述。
  Expected: 明确静态候选，不执行候选业务请求；逐项核对Review Focus。
- [x] Step 3：通过会话锁串行观察图书馆正常页面及认证/规则/本人详情证据。需登录时交由用户，同时继续公开研究。
  Expected: 仅最小投影，不保存个人原文；退出关闭浏览器并释放锁；失败如实记录。
- [ ] Step 4：可形成具体样本时展示房间、时段、参与人及后果，等待该次创建/取消授权；无授权不写入。
  Expected: 真实流程证据或明确未通过；不将静态代码/合成应答当作真实验收。
- [ ] Step 5：填写E2矩阵与验收记录，区分已证实、候选、阻塞，同步AGENTS.md。
  Expected: 缺关键证据则M0未通过，不进入M1。
- [ ] Step 6：核对文档链接、`git diff --check`与变更范围；完整交付集中本地提交，停下让用户审查。
  Expected: 链接有效、差异检查退出0、仅文档变更；不声称未运行的产品测试通过。

## 执行记录

2026-11-01：用户确认继续。按原目录和逐模块人工审查约定执行，当前只开展M0；后续模块计划以M0真实证据为前提。

2026-11-01当前进度：正常创建已取得具体授权并提交一次，独立新进程按来源ID回查成功。Step4的取消尚未获确认，E2-02等仍有缺口，Step5/6当前只交付阶段记录；本地文档检查点不代表M0完成。未开始产品实现。
