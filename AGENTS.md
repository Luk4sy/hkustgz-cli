# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1 基础 CLI（3681ae2）已获用户复审通过。2026-10-27 用户批准 SIS 有效SSO无人工输入恢复流程，并明确要求据此开发认证模块。Task 2 实现完成，等待用户审查，不进入 Task 3。Task 0 的 Portal/SIS/Canvas 认证子集已取得研究及实际CLI证据；其他业务完整性及 Booking/Library 认证仍待验证。全部19项业务能力继续 pending。详见 docs/acceptance/session-auth.md；不得猜学校接口或用模拟数据冒充真实查询。

Git 文档基线已建立，工作分支 feat/cli-foundation。按用户指定原目录工作。npm test（含构建）和 npm run typecheck 是当前验证命令。
