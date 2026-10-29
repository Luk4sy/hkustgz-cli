# Alpha封装第二批：Skill管理（待用户审查）

日期：2026-10-29。第一批03064ce已获用户验收；本批范围仅为封装计划Task2。未开始doctor、完整校园调用Skill、真实Codex发现或其他学生验收。

## 公开控制命令

```bash
hkustgz-cli skill path
hkustgz-cli skill status
hkustgz-cli skill install --target codex --dry-run
hkustgz-cli skill install --target codex
hkustgz-cli skill uninstall --target codex --dry-run
hkustgz-cli skill uninstall --target codex
```

四命令默认目标为Codex；CODEX_HOME未设置时使用~/.codex/skills/hkustgz-cli。设置CODEX_HOME时使用其skills/hkustgz-cli。自定义skills根目录使用--dir <absolute-skills-root>，不同时传--target；目标是其hkustgz-cli子目录。path返回当前包内Skill位置，不是已安装目标；status返回absent/current/outdated/modified/unowned及版本。path/status不创建目录；两种变更都支持只读dry-run。

包内Skill与CLI版本同为0.1.0-alpha.1，仅包含管理说明，不宣传完整校园自然语言调用已交付。安装成功只代表文件写入成功，客户端刷新与实际发现留给第四批。

## 归属与文件保护

- 仅复制随包固定白名单，本批为SKILL.md；归属清单.hkustgz-cli-manifest.json记录包名、schemaVersion、版本、相对路径和SHA256。
- 拒绝父目录链/目标/来源文件符号链接、路径逃逸和非归属目录。macOS的/var、/tmp、/etc系统别名先转物理路径；不会允许任意用户符号链接。
- 同版本且内容一致不写入；升级必须先验证旧清单和全部文件摘要，未知文件、未知空目录或用户编辑均阻止替换。暂存完成后、切换之前再次验证原目录；本地同目标操作用原子目录锁互斥。
- 升级使用同文件系统暂存/备份/rename；提交失败恢复旧目录。暂存写入失败仅清除能从清单确认归属且摘要匹配的内容。
- 卸载逐项验证，仅删除仍匹配的归属文件及已空的归属子目录；修改或未知文件保留并返回complete=false、SKILL_CONFLICT/退出8。仅剩归属清单时才移除目标目录；不递归删除skills根目录。
- 安装/卸载不操作浏览器会话、不改config.toml/AGENTS.md/MCP/模型配置；源码与安装包均定位同一包内资源，不依赖cwd。

## 中断恢复

只读status或dry-run发现事务锁时返回SKILL_OPERATION_FAILED，不把中途状态报为current，也不触发恢复。下一次显式安装/卸载可恢复：只接受同机、进程探测明确ESRCH的旧生产者，必须有合法事务清单且文件/备份摘要可核实、没有未知内容。目的地缺失时先恢复旧备份，再按新请求执行；提交已完成时校验新目录并清理可确认的旧备份。

活进程、外机、PID复用/权限导致无法确认死亡、未知锁及恢复自身再次中断的标记均保留现场，需要人工核查；不删除未知锁或终止进程。此策略会保守拒绝部分可恢复情形。普通提交故障和退出后的持久事务分别有回归。若介质故障导致归属证据不完整则不自动删除文件；保留数据优先，不能承诺任意断电后的事务自动修复。

## 输出与验证范围

新增错误SKILL_CONFLICT/8、UNSAFE_SKILL_TARGET/2、SKILL_OPERATION_FAILED/1。仅SKILL_CONFLICT可携带经严格schema验证的SkillChangeReport，JSON/table保留changed/preserved相对路径，支持中文文件名；任意异常对象和系统原始错误不透传。业务错误与schemaVersion1原字段保持。

TDD回归：缺命令/模块先失败；暂存写入失败导致残留锁、生产者退出导致目标缺失、中文文件名导致报告缺失的回归均观察RED后修复GREEN。另验证幂等、A→B升级、编辑/未知目录保护、符号链接/清单逃逸拒绝、提交失败回滚、切换前新增用户文件保护、部分/完整卸载、dry-run、其他Skill/配置保持、无浏览器启动。

安装版从实际tgz在隔离prefix运行skill path/status/install/uninstall，安装目录、Codex home均为临时目录。路径测试发现/var和/private/var物理别名差异，改按realpath比较，不修改实际资源定位。依赖沿用第一批独立离线缓存；未访问学校或修改真实Codex目录。新增13项Skill测试与既有3项产物测试共16项目标测试通过，完整套件结果在最终检查中补充。

补充回归：状态读取期间事务锁出现时旧实现会报告current，回归RED后补充返回前的路径/锁复核并GREEN；备份目录被替换成符号链接的场景原有父路径检查已经阻止越界清理，新增测试直接通过，未为制造RED更改实现。

## 本地产物

第二批从临时生产方副本执行实际npm pack，89文件，包含5个Skill管理编译模块及声明、最小SKILL.md和公开文档。SHA256：`5cfc26e4b1a578cba3b744555779a60e3d9044bdf623cc10ea4c858773480aca`。保存在忽略的本计划工作目录task2-artifacts中，与第一批产物分开。版本仍为未发布的0.1.0-alpha.1本地快照；不表示两个不同包已公开复用同一版本。

## 最终检查

- `HKUSTGZ_TEST_BROWSER=1 npm test`：214/214通过，0失败0跳过，含54项既有Chrome本地合成测试；构建由pretest执行。
- `npm run typecheck`、`git diff --check`：通过。
- 前一轮212项完整套件同样通过；补充备份链接与状态竞争两项后重新跑完整214项，不用旧结果代替。
- 未修改六份既有未提交文档，未访问学校或真实profile、未安装到真实Codex、未发布/分发。第三批未开始，等待用户审查。
