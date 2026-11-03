# 图书馆受限操作启用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 按用户“解除pending”指令，把已实现图书馆操作接入登录后检查；仅开放已取证本人单人研修间创建和保守窗口取消，结束交用户审查。

**Architecture:** 保留既有操作状态、确认、单次发送及回查。增加服务侧账号/处罚/配置的最小投影与目标规则读取；检查分类区分本地必须通过与学校最终裁决。所有检查和来源快照参与确认绑定。

**Tech Stack:** Node24、TypeScript、Playwright、Zod、node:test。

**Spec:** [第二阶段§5.1～§5.3](../specs/2026-11-01-library-booking-phase-2-spec.md)，用户2026-11-02要求解除pending视为授权按已展示受限提案实施；不解释为实际下单授权。

## Global Constraints

- 原目录工作，源码模块完成后停审，不推送/发布/改日常安装；后续封装精确同步CLI/Skill另成一批。
- 不虚构参与人，不扩多人讨论间、费用、附件、验证码或其他供应商。
- 现有只读查询结果不扩大可订承诺；旧状态不清理、不重置。
- 没有具体预览与单次用户确认不真实创建/取消。复用M0已取证协议时说明证据边界，不能称本轮真实CLI写入成功。

## Review Focus

1. 学校最终裁决分类不能覆盖本地读取失败、主体变化、未解释新副作用。
2. 源规则字段/账号/配置/目标日期必须真实读取，禁止只翻能力表。
3. 预览与提交重新核验一致快照，且300秒/一次写入/未知防重不变。
4. 取消只允许精确本人目标及开始前严格超过10分钟；权限截止贯穿发送入口。
5. 能力取证与单次真实写入授权分开；不能用合成用例宣称真实CLI写入已验收。

## Task 1: 真实读取、受限判定与操作契约

**Files:** booking-library/{reader,inspection-reader,model,detail,preview}.ts；新增restricted-operation.ts；booking-operations/{contract,workflow}.ts。
**Interfaces:** inspection.operationContext(participantIds,signal)返回最小本人匹配/启用状态/处罚条数/配置快照；禁止返回账号原值。checks.adjudication沿Spec增补。规则快照需完整且绑定已取证规则族。

- [x] 新增受限创建、未知项分类不可绕过、规则变化、多人/只展示/附加步骤/时限拒绝及取消保守窗口回归，先RED再实现。
- [x] 读取目标规则字段和新鲜账号/处罚，保持GET-only；最小投影，不导出原响应。
- [x] 接入create/cancel assessment及严格schema，完整预览携带学校待裁决项；最终提交重新检查。
- [x] 用合成Chrome覆盖实际读取、失败与主体变化；保持既有状态/回查/一次发送回归。

## Task 2: 启用状态与交付

- [x] 正常专用会话只读验证目标规则及预览；如需密码由用户本人登录。
- [x] 依据证据区分只读预览启用与真实写入验证范围，不假造verified证据；无法完成的实际写入验收明确保留。
- [x] 同步源码能力说明、测试与开发记录；不更新安装/候选或自动写入。
- [x] 全量严格Chrome、构建/typecheck/actionlint，内部检查后提交本轮并停下用户审查。源码 CLI 和 Skill 同步到 alpha.5，日常安装待审查后同步。
