# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1 基础 CLI（3681ae2）已获用户复审通过。用户已授权继续，当前补齐 Task 0 取证及专用会话实验；Task 2–9 尚未开始。会话正向判据与冷启动未通过验收，详见 docs/acceptance/session-reuse.md。真实接口、浏览器登录与读取路线未验证前，业务能力保持 pending。不得绕过 capability gate、猜学校接口或用模拟数据冒充真实查询。

Git 文档基线已建立，工作分支 feat/cli-foundation。按用户指定原目录工作。npm test（含构建）和 npm run typecheck 是当前验证命令。
