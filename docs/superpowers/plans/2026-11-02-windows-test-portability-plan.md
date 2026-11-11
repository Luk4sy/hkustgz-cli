# Windows 测试可移植性与完整 CI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修复同学报告中的日期、符号链接权限及POSIX路径三类测试问题，Windows CI执行完整Chrome套件；完成本地交付后停下让用户审查，不推送。

**Architecture:** 仅修改测试夹具/辅助代码及CI。预约CLI用例用node:test仅固定Date（业务日期与绝对截止同钟），真实定时器与I/O不mock；测试目录来自平台tmpdir。目录链接在Windows使用junction；真正文件symlink无权限时仅跳过该独立场景，CI严格模式禁止此类跳过。

**Tech Stack:** Node24、node:test、TypeScript、Playwright、GitHub Actions。

**Spec:** 用户2026-11-02明确修复指令；[Windows原计划](2026-10-29-hkustgz-cli-windows-plan.md)。不实施图书馆Spec待审门槛提案。

## Global Constraints

- 原目录feat/cli-foundation开发；本轮一个可审查本地提交，不push/merge/publish。
- 不改产品代码、安全校验、能力状态、CLI/Skill版本或候选包；不访问真实学校账号。
- Windows实机未在本机执行，不把配置检查或macOS通过冒充Windows验证。

## Review Focus

1. 业务时钟必须贯穿预览/读取/dispatch，不能只修输入日期导致300秒过期或防重退化。
2. 文件链接无权限时只skip确切场景；不能吞掉产品断言、其他错误或整组无关安全检查。
3. CI严格模式必须使链接权限不足失败，保证不会以skip冒充安全覆盖。
4. 临时目录路径保留真实平台校验，不能放宽产品Windows绝对路径要求。
5. Windows完整Chrome套件与loopback smoke不访问学校；离线升级准备沿用现有步骤。

## Task 1: 修复夹具并扩大CI

**Files:** tests/booking-operation-cli.test.ts、tests/{booking,portal,sis}-cli.test.ts、tests/canvas-browser.test.ts、tests/{booking-operation-store,doctor-cli,paths,session-controls}.test.ts；新增tests/helpers/symlink.ts及其策略测试；.github/workflows/ci.yml。

**Interfaces:** createTestSymlink(context,target,path,kind,options?)返回Promise<boolean>；成功返回true；仅Windows文件链接EPERM/EACCES且非严格模式时skip并返回false。严格模式由HKUSTGZ_REQUIRE_SYMLINK_TESTS=1控制；目录Windows使用junction。

- [x] 运行日期用例，记录5项预期失败；核对三个固定POSIX路径及六个链接创建点。
- [x] 新增辅助函数的严格/非严格/非权限错误行为用例，先观察失败，再实现最小帮助函数。
- [x] 仅固定Date贯穿executeCommand及store调用；POSIX路径改tmpdir/join；迁移链接夹具，拆分链接与无关断言以免skip掩盖覆盖。
- [x] Windows CI设HKUSTGZ_TEST_BROWSER=1、HKUSTGZ_REQUIRE_SYMLINK_TESTS=1，执行npm test全套，保留build/typecheck、打包升级和loopback smoke；不修改宿主权限。
- [x] 验证针对性用例、严格模式完整Chrome npm test、typecheck、差异及文档链接。记录Windows待运行限制并交付用户审查。
- [x] 一个完整本地提交；不推送。
