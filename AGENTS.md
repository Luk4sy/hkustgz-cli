# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1（3681ae2）、Task 2（c3bafa6）均已获用户复审通过并验收。Task 3（32f0bab）已获用户验收。Task 4 Catalog（7b5c559）已获用户验收。Task 5 SIS（d708ac5）已获用户复审通过并验收。Task 6 Portal 已实现待用户审查，不得进入 Task 7。Task 0 的 Portal/SIS/Canvas 认证子集已有证据，其他业务完整性及 Booking/Library 认证仍待验证。Catalog两项、SIS三项及Portal四项业务已验证（第六模块待审），其余10项业务能力继续 pending；Portal公告全分类扫描当前仅保留已确认8条并返回partial，外部公告详情不支持。详见 docs/acceptance/catalog.md 及 docs/acceptance/query-core.md；不得猜学校接口或用模拟数据冒充真实查询。

Git 文档基线已建立，工作分支 feat/cli-foundation。按用户指定原目录工作。npm test（含构建）和 npm run typecheck 是当前验证命令。
