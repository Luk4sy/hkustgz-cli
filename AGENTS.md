# hkustgz-cli 工作说明

本目录是用户指定的项目根目录。后续命令显式以此目录为 workdir，相关文档、源码和测试保存在此处。

先读 README.md、开发 Spec、开发计划及 docs/acceptance/cli-foundation.md。用户已授权按模块开发，并明确要求：每完成一个模块先交付用户审查，通过后才能开发下一个模块。此要求优先于任何技能的连续执行默认值。

Task 1（3681ae2）、Task 2（c3bafa6）均已获用户复审通过并验收。Task 3（32f0bab）已获用户验收。Task 4 Catalog（7b5c559）已获用户验收。Task 5 SIS（d708ac5）已获用户复审通过并验收。Task 6 Portal（2d547ff）已交付并实测，用户于2026-10-28授权继续Task7；既有公告覆盖限制保留。Task7 Canvas（34eb9e3）已于2026-10-29获用户复审通过并验收，未进入Task8。本人已完成登录及课程冷启动复验；作业个人截止时间/提交状态证据缺失时unknown，Planner不代表全部作业。详见docs/acceptance/canvas-auth.md。Task 0 的 Portal/SIS/Canvas 认证子集已有证据，其他业务完整性及 Booking/Library 认证仍待验证。Catalog两项、SIS三项、Portal四项及Canvas四项业务已验证（第七模块已验收），其余6项业务能力继续 pending；Portal公告全分类扫描当前仅保留已确认8条并返回partial，外部公告详情不支持。详见 docs/acceptance/catalog.md 及 docs/acceptance/query-core.md；不得猜学校接口或用模拟数据冒充真实查询。

Git 文档基线已建立，工作分支 feat/cli-foundation。按用户指定原目录工作。npm test（含构建）和 npm run typecheck 是当前验证命令。

2026-10-29 封装状态：第一至第四批已获用户验收（03064ce、e124993、fc7dda6、a85469b）。第五批 MIT 本地候选及生命周期验证已提交（73c5720），独立学生试用仍待完成。Windows 11＋Chrome＋Node 24＋Codex 的 alpha.2 候选（644756a）代码审查通过，仅有 Mac 回归与 Windows 模拟证据，Windows 真机仍待验收。现有13项查询已封装；其余6项pending能力未实现。未发布或对外分发。
