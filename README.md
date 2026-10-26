# hkustgz-cli

面向香港科技大学（广州）学生的本地校园服务 CLI，非学校官方产品。

## 当前进度：基础 CLI 已验收，正在补齐真实读取与会话证据

版本 `0.1.0-alpha.1`。已实现命令解析、所有规划命令的帮助、JSON/table 输出、错误与退出码、能力状态检查。19 项学校业务能力均为 `pending`，不会访问学校或打开浏览器。登录、doctor、浏览器管理仅有命令帮助，实际调用返回 `CAPABILITY_PENDING`。

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

## 文档

- [技术方案](docs/superpowers/specs/2026-10-26-hkustgz-cli-design.md)
- [开发 Spec](docs/superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md)
- [开发计划](docs/superpowers/plans/2026-10-26-hkustgz-cli-development-plan.md)
- [本模块审查与验收](docs/acceptance/cli-foundation.md)
- [读取证据索引](docs/research/evidence-index.json)
- [专用会话实验（尚未通过）](docs/acceptance/session-reuse.md)

后续开发继续在本目录进行；每完成一个模块，等待用户审查后再推进。
