# Alpha封装第一批：安装产物（待用户审查）

日期：2026-10-29。范围：alpha封装计划第一批。第二批Skill管理及后续批次未开始。

## 改动

- npm pack在生产方先运行干净构建：清理旧dist、仅编译src；去掉sourceMap，防止旧产物和本机路径进入包。
- 包白名单限制为指定bin、dist的js/d.ts、README和三份公开文档；不包含构建脚本、源码、测试或本机研究内容。
- 新增安装、CLI契约和错误文档。现有业务能力与结果协议保持：13 verified、6 pending。
- 无install/postinstall/prepare钩子，安装时不登录、不启动浏览器、不下载浏览器、不写Skill或配置。

## 回归证据

新增三项真实产物测试：

1. tarball_is_allowlisted：在没有编译运行时、只有旧dist标记的生产方副本上npm pack，验证自动构建和公开文件白名单。
2. private_markers_excluded：放入合成Cookie/profile、研究HAR、日志及dist杂项标记，实际解包逐文件检查不泄漏。
3. installed_bin_is_cwd_independent / install_has_no_campus_or_client_side_effects：真实tgz安装到隔离全局prefix，HOME/CODEX_HOME/数据目录/缓存隔离，仓库外带空格cwd执行版本、帮助、capabilities。生产安装无src/tsx；19项能力中13 verified、6 pending。

三项修复前均失败：没有编译运行时、dist中HAR标记泄漏、安装版入口返回INTERNAL_ERROR。修复后三项通过。

隔离安装使用仅含本机已缓存生产依赖的独立npm缓存、offline模式，生命周期脚本正常启用。Node预加载探针拒绝并记录网络连接和子进程启动尝试，安装与无浏览器控制命令未触发探针；学生HOME文件快照无变化，并检查包内没有安装副作用钩子。此证据不代表联网npm可用性，也不替代后续其他学生实际安装。

测试构建在临时副本中执行，副本仅借用开发者node_modules作为生产方编译工具；安装消费者使用自己的生产依赖，bin在隔离prefix中运行。

## 验收边界

当前版本0.1.0-alpha.1仍private、UNLICENSED，许可证及对外交付未确认；产物只供本地审查。未发布npm，未交给其他学生，未修改真实Codex或全局CLI安装。未运行真实学校查询，Chrome用例使用既有隔离合成页面。

第一批包不包含Skill、doctor实现或browser install；这些入口仍pending。README及其他五份既有未提交文档属于先前改动，本批未提交其内容。包中的README可能仍有历史阶段说明，以本验收记录与运行时capabilities为准，后续完整用户文档批次统一同步。

首次在执行沙箱中直接npm pack尝试写默认npm缓存失败（EPERM）；没有调整缓存归属或运行sudo，后改为临时专用缓存生成产物。

## 本地产物

已从临时生产方副本实际执行npm pack生成0.1.0-alpha.1，包含78个文件。SHA256：`24921a72ab76e76aaf8ae5d847152063a51c21fe3d181da40feb75b1bdcaf6a5`。产物存于项目忽略的本计划工作目录，只作为本地审查快照；后续文档或版本改动需重新打包并计算校验值，不复用此值。

## 最终检查

- `HKUSTGZ_TEST_BROWSER=1 npm test`：201/201通过，0失败0跳过，包含54项既有Chrome合成测试；npm pretest包含构建。
- `npm run typecheck`：通过。
- `git diff --check`：通过。
- 本批产品改动仅为生产方构建与发布白名单；未修改学校适配器或认证逻辑。等待用户审查，第二批未开始。
