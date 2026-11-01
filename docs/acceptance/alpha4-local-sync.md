# alpha.4 本地 CLI / Skill 同步

日期：2026-11-01。用户已审查通过M5 bff9796＋d3331d7，随后明确要求继续；按Spec验收后的下一步同步日常CLI与随包Skill。本次是安装与环境核对，不增加业务能力，不替代真实预约验收。

## 产物与安装

使用用户已审查的本地alpha.4候选 `artifacts/alpha.4/hkustgz-cli-0.1.0-alpha.4.tgz` 及 `artifacts/alpha.4/SHA256SUMS`（由维护者提供，不纳入Git仓库）。安装前重新核对SHA-256为`5f2b5c5f5766d88a4b20492c16f7aaff22a2b9b77224f422258f8d6ef949fc85`，与M5记录一致；未重新打包或修改候选内容。

原日常CLI/Skill均alpha.3，Skill状态current、现有Node24.20.0全局prefix归属明确。升级前由源码alpha.4执行skill install --dry-run，五个归属文件无冲突。复用已缓存生产依赖，使用临时npm缓存离线安装到现有Node24全局目录，不执行sudo或调整系统权限。

升级CLI后：--version为alpha.4，Skill状态outdated，installedVersion=alpha.3、expectedVersion=alpha.4，符合显式同步约定。新安装CLI再次dry-run确认无冲突后，显式skill install --target codex成功更新五个归属文件，无preserved冲突，不修改客户端配置或其他Skill。

## 本次实际验证

- 日常hkustgz-cli --version：0.1.0-alpha.4。
- skill status：current，installedVersion/expectedVersion均0.1.0-alpha.4。
- 安装的Skill正文及四份引用文件与已安装CLI随包文件逐字一致；当前对话已重新读取新版Skill指引。
- doctor：Node、平台、数据目录、Chrome、Skill五项全部pass；没有启动浏览器，不把环境健康等同学校已登录。
- capabilities：24项中17 verified、7 pending不变。
- 实际安装CLI的cancel-preview返回CAPABILITY_PENDING，没有发起创建或取消。

没有查询真实账号、登录或预约系统，没有创建/取消预约，不清理浏览器登录态或未决操作资料；未运行真实业务验收。未重复M5的445项产品测试：源码/候选未修改，本轮仅验证已安装版本、文件一致性、控制命令及pending拦截。[M5验证记录](library-booking-phase-2-m5.md)保留完整产品与隔离升级证据。

文件安装成功不代表所有客户端已自动发现新版Skill。当前对话已读新文件，桌面自动刷新/新会话发现及实际校园查询尚未独立验证。

## 保留状态

M0 G-R1～G-R3、图书馆真实创建/取消与资格判据仍未通过；detail/preview/create/cancel-preview/cancel继续pending，SIS历史/成绩仍暂缓。用户已接受保留的两项轻微建议不在本轮修改，已安装Skill与已审查候选保持完全一致。

旧alpha.3候选及校验文件保留，SHA-256仍`ea5a190680e193865a91d55d459ddf1180eb9f581bd80124cfe27feceef3c2d0`。未推送GitHub、合并、发布npm或新增对外消息。下一项真实预约工作须先处理M0证据缺口；开发和安装授权不等于具体业务写入授权。
