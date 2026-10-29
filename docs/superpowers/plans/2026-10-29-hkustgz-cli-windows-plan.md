# Windows 11 Alpha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。用户原目录主代理实施；整个Windows适配为一个人工审查批次，完成即停。

**Goal:** Windows11＋Chrome＋Node24＋Codex可试用候选，保留真实Windows验收缺口。
**Architecture:** 检测/启动共用Chrome定位；doctor候选与实测分开；原生路径/安装布局安全适配，显式loopback smoke。
**Tech Stack:** 现有Node24/TypeScript/Playwright/node:test，无新依赖。
**Spec:** ../specs/2026-10-29-hkustgz-cli-windows-design.md，记录用户已批准短方案及内部细化。

## Global Constraints

- 一个批次完成后停用户审查，不启动学校新业务、不发包/发布，不更新真实Codex/CLI。
- 仅Windows11/Chrome/Node24/Codex，MIT/private，候选alpha.2；真实支持状态待Windows实机，不将Mac模拟当Windows通过。
- 原六份未提交文档保留；README仅阶段自身段落可单独提交。测试/产物仅临时或忽略目录，不读私人数据。

## Review Focus

1. 用户安装Chrome被检测但launch channel仍找系统路径：用同一解析结果实际启动的回归。
2. Windows盘符、UNC、junction和manifest混合分隔符：盘符纯规则与实际temp链接/摘要保护测试。
3. Windows10/Server/未知build被伪装为已支持：候选warn、旧/未知fail，SKU边界文档。
4. npm.cmd/空格路径被shell重新解释：Node执行npmCLI，不拼shell，保留完整argv。
5. 包资源/版本、关闭后profile锁与旧Mac能力退化：包测试、localhost smoke流程及全部Chrome合成回归。

### Task 1: Windows alpha适配与候选验收

**Files:** 新增src/session/chrome.ts、src/core/windows-path.ts、tests/windows.test.ts、bin/windows-smoke.mjs、docs/windows.md、docs/acceptance/windows-alpha.md；修改session/browser.ts、cli/doctor.ts、core/contracts.ts、cli/skill/paths.ts、session/paths.ts、tests/helpers/package.ts、package/doctor/skill相关测试、package/lock/Skill版本和白名单、公开安装/错误文档及README自身新增段落。

**Interfaces:** `chromeCandidates(platform:NodeJS.Platform,env:NodeJS.ProcessEnv):string[]`，`findChrome(platform?,env?,probe?:(path:string)=>Promise<boolean>):Promise<string|null>`；`launchBrowser(profile,options,env?)`暴露最小可测启动边界，Windows Chrome使用findChrome的executablePath，缺失BROWSER_UNAVAILABLE。`assertWindowsLocalPath(input:string):void`纯验证本地绝对盘符/不含device/UNC/ADS；生产仅win32调用。DoctorProbes.runtime扩展可选osRelease；DoctorReport可选同名非隐私字段。全局npm packageRoot(prefix)、bin路径的测试辅助函数返回平台布局；run(npm,args)映射到Node/npm-cli，无shell。

- [x] Step1：先写Windows多候选/缺失/去重/实际launcher一致、doctor11候选与10/未知fail、本地盘符拒绝UNC/relative/ADS测试，运行确认RED；基线已正确的路径保护不制造失败。
- [x] Step2：实现定位及launch共用、doctor候选判断和路径校验；保持Mac channel行为、现有错误/只读语义。读取实际Playwright安装代码与官方资料，不依赖私有API。
- [x] Step3：让包测试辅助代码使用npmCLI、原生链接/全局布局；alpha.2＋同版Skill，升级测试B使用独立合成版本，消除硬编码基线版本；全套可在Mac回归，Windows实测仍单独记录。
- [x] Step4：实现显式loopback smoke和PowerShell安装/版本/doctor/Skill/浏览器/登录/退出清单；包白名单包括smoke和windows文档，安装无副作用。写smoke非Windows拒绝、引用/包版本、升级/卸载保护测试。
- [x] Step5：目标测试、npm run typecheck、HKUSTGZ_TEST_BROWSER=1 npm test、git diff --check；实际pack与SHA256。独立只读审查，重要问题一轮RED→GREEN修复；更新证据、提交并交人工审查。真实Windows项目全部保持未验证，不能宣布原第五批完成。

预检：chrome解析同时给availability/launch使用；DoctorReport/Probe的osRelease可选并同schema；npm helper布局覆盖安装/升级测试全部消费者。记录ruling于本计划自己的ignored ledger，不碰旧计划工作区。

本地实现与Mac复验完成，待用户审查；Windows真机表均未验证。独立审阅P2测试路径钩子已一轮修复，包alpha.2/MIT/private，不更新已安装环境或发布。
