# hkustgz-cli

面向香港科技大学（广州）学生的本地校园服务 CLI，非学校官方产品。

## 当前进度：基础 CLI 已验收，认证模块待审查

版本 `0.1.0-alpha.1`。已实现基础 CLI、专用 profile、互斥锁、会话清理及 Portal/SIS/Canvas 认证控制。19 项学校业务查询均为 `pending`，调用查询不会访问学校；认证命令会正常访问学校。doctor、browser install 仍返回 `CAPABILITY_PENDING`。

认证数据默认在 `~/.hkustgz-cli`，也可设置 `HKUSTGZ_CLI_HOME` 为新的空绝对目录。Chrome/Edge/Chromium 的 profile 分开保存；不读取日常浏览器登录态。优先使用已安装的 Chrome；本模块不自动下载浏览器。Windows/Linux 真实浏览器验收尚未完成。

## 本地运行

要求 Node.js 24.x。依赖版本已锁定；安装不会下载浏览器或发起学校登录。

```bash
npm ci
npm test
npm run typecheck
node bin/hkustgz-cli.mjs --help
node bin/hkustgz-cli.mjs capabilities
node bin/hkustgz-cli.mjs capabilities --format table
node bin/hkustgz-cli.mjs sis timetable --help
```

`npm test` 会先编译。单独构建可运行 `npm run build`。

```bash
node bin/hkustgz-cli.mjs catalog search AI
```

目前预期返回 `CAPABILITY_PENDING`、退出码 **8**，这表示未启用查询，而不是已查询到空课程。

本项目尚未发布 npm；请使用以上本地命令，不要使用可能属于其他人的同名远程包。

## 认证与浏览器

```bash
node bin/hkustgz-cli.mjs browser status
node bin/hkustgz-cli.mjs browser use chrome
node bin/hkustgz-cli.mjs auth login portal
node bin/hkustgz-cli.mjs auth status --all
node bin/hkustgz-cli.mjs auth logout
```

`auth login` 打开可见专用浏览器，正常登录最多等待10分钟。`auth status` 总预算90秒，允许复用有效SSO；SIS可能自动点一次已验证的 Login。需要密码、验证码或人工确认时不等待用户，状态为 unauthenticated；无法确认时为 unknown。Catalog、Booking、Library 当前报告 unknown，后两者登录能力仍 pending。logout 仅清理本工具已归属的 profile，不撤销学校服务器上的其他会话。

默认 `npm test` 不启动浏览器。已有 Chrome 时，可显式运行 `HKUSTGZ_TEST_BROWSER=1 npm test`；浏览器用例仅加载本地合成页面，不登录学校。

## 文档

- [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md)
- [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md)
- [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md)
- [本模块审查与验收](docs/acceptance/cli-foundation.md)
- [读取证据索引](docs/research/evidence-index.json)
- [分服务会话验证](docs/acceptance/session-reuse.md)
- [认证模块审查与验收](docs/acceptance/session-auth.md)

后续开发继续在本目录进行；每完成一个模块，等待用户审查后再推进。
