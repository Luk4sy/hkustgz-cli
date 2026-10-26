# 模块 1 审查：基础 CLI 与能力表

范围：开发计划 Task 1。状态：用户已复审通过 3681ae2 并验收；已授权继续，当前进入 Task 0 前置取证，尚未进入 Task 2。

## 已交付

- Node.js 24 + TypeScript ESM 项目、锁定依赖、可编译可执行入口。
- 根命令、全部 27 个规划叶子命令的帮助，参数/必填项/选项检查。
- JSON/table 输出、错误映射、部分结果退出 7、pending 退出 8。
- 19 项业务能力状态表；全部 pending，没有真实学校读取实现。
- QueryResult/QueryMeta/Capability 运行时 schema，verified 必须有证据标识。
- 编译后的 bin 在项目外目录可运行，帮助/能力清单不创建 profile。

## 验证

- TDD 首轮：17项测试，15项预期失败；实现后全部通过。
- 可执行文件与 table 错误格式补测：22项中2项预期失败，修正后22项全部通过。
- 独立代码审阅：22项测试时未发现 Critical/Important；两项错误体验建议已补回归测试并修复。
- 首次交付 npm test：24通过，0失败，含构建。
- npm run typecheck：通过。
- 以上均为本地基础层测试，不证明学校接口、认证或 Windows 实机兼容。

## 人工审查步骤

在项目目录执行：

```bash
npm test
npm run typecheck
node bin/hkustgz-cli.mjs --help
node bin/hkustgz-cli.mjs sis timetable --help
node bin/hkustgz-cli.mjs capabilities --format table
node bin/hkustgz-cli.mjs catalog search AI
```

最后一条应返回 CAPABILITY_PENDING、退出8；不是软件运行故障，也不是学校空数据。

重点查看：命令命名是否适合使用、JSON结构是否清晰、能力清单是否明确表达尚未接通。

## 尚未实现

登录/profile/锁/退出、浏览器管理、doctor、请求预算/日期/分页及真实校园适配器均不在本模块范围。sourceUrl 已知临时参数会被移除，但一般日志/响应字段脱敏属于后续任务，不能宣称已完成全链路隐私验证。包暂时 private、许可证未定，不发布 npm。

## 计划依赖调整

Task 0仍是真实业务读取与认证实现的前置。允许纯离线 Task 1先实施，因为它只提供命令与契约，不访问学校，也不把未知能力标 verified。采用主代理原目录分支开发，独立代理只审阅本模块；每模块必须等待用户通过。

## 独立审阅与安装验证

首次独立代码审阅范围为基础模块，不包含后续认证或学校适配器，当时未发现阻塞问题。修复了参数解析错误忽略显式 table 格式、以及 limit 错误未给出具体命令/边界的两项问题。新增两个测试先失败，再修复至24项全通过；错误提示不回显用户传入的私密字符串。

用户随后审查发现 table 丢失查询上下文、读取数量与截断原因，以及 Spec 的 Git 状态过时。新增3项回归测试，修复前全部失败；修复后27项测试、构建和类型检查通过。table 保留非空及空列表的同级字段，并展示完整的查询元数据（包括 pagesRead、recordsRead、returnedCount、truncationReason）。Spec 与设计文档已同步仓库及基础模块状态，修复提交3681ae2已获用户复审通过。

本地 npm pack 后，在独立临时目录通过 npm install --offline --ignore-scripts 安装；安装后的命令版本/能力清单退出0、pending查询退出8。未访问学校、创建登录profile或发布npm。包名、许可证与公开发布仍待后续确认。

用户已复审通过并验收 3681ae2，确认27项测试、构建和类型检查通过。基础 CLI 的完成不表示 Task 0 已经完成；后续继续遵守每模块人工审查约定。
