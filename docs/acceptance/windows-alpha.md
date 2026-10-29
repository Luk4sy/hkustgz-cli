# Windows 11 适配候选验收（待用户审查）

2026-10-29。用户批准Windows11＋Chrome＋Node24＋Codex的单批适配；不扩学校业务、Edge、其他Agent或Linux。本机为Mac，Windows实机尚未验证，原封装第五批独立学生验收仍未完成。

## 实现

Chrome按固定安装目录检测系统/用户级路径、大小写去重，拒绝相对/网络根。Windows实际启动与检测共用解析结果（executablePath＋chrome channel），缺失返回BROWSER_UNAVAILABLE。Mac继续channel启动；browser status和doctor共用实际环境，不自动下载。

doctor从Windows NT release识别10.0 build>=22000为WINDOWS_CANDIDATE/warn，允许进入受控试用；不能只凭该构建号证明Win11客户端SKU/真实兼容性，需本人回报系统Caption。旧/未知build与Linux仍fail。版本/平台/架构之外只增加非隐私osRelease字段，不输出安装路径、用户名或凭据。

Windows数据根和创建目录前均检查本地盘符及junction/symlink祖先；Skill使用同一原生目录检查（Mac安全语义保留）。拒绝UNC/device、drive-relative、root-relative、ADS、上级跳转及设备/尾点空格别名。保留归属、摘要、锁、回滚和受限卸载；不自动删未知锁。manifest维持相对POSIX名，实际文件操作使用原生path。

测试安装器由Node执行npm-cli.js，不使用shell:true或拼接cmd字符串；全局prefix布局和bin计算按平台，目录链接在Windows用junction。升级回归移除硬编码基线版本，B使用临时合成alpha.999，不是发布版本；检查npm shim卸载及无关文件保留。

alpha.2＋同版Skill、MIT、private:true。没有自动替换用户已安装的alpha.1 Skill或CLI，没有调用学校、读取用户认证或操作真实profile。

## Loopback检查与PowerShell清单

随包bin/windows-smoke.mjs只接受显式运行，不由安装触发。Windows入口启动全新临时profile，只读取127.0.0.1合成HTML，阻止其他页面请求，正常关闭后重取锁并清理自己的临时目录。无school URL或旧profile参数，失败输出固定错误码；非Windows退出2。

实现流程提取为可测模块，在当前Mac上实际Chrome验证其正常关闭/重取锁；这不是Windows Chrome实测。PowerShell安装、版本/doctor/.cmd入口、临时Chrome、本人认证/查询、Codex发现、Ctrl+C及升级/卸载步骤见[Windows指南](../windows.md)。不要求改执行策略或关闭沙箱。

## 证据与待验证边界

新增测试先复现缺Windows接口/识别、缺smoke/共享安全模块及缺打包指南，再实现后验证。模拟Windows路径/NT build、实际launcher入参验证在Mac执行；实际localhost Chrome仍是Mac。旧Mac回归、打包/升级等复验在最终检查记录，不拿模拟数代替实机。

| Windows真实步骤 | 当前状态 |
| --- | --- |
| Win11/Node24/npm安装与.cmd shim | 未实测 |
| 系统级/用户级Chrome检测与实际启动 | 未实测 |
| 本地smoke关闭/锁重取/清理 | 未实测 |
| 中文/空格目录、junction、句柄占用 | 未实测 |
| 本人正常SSO与公开/私人查询 | 未实测 |
| Codex发现、正常审批、Ctrl+C和重查 | 未实测 |
| 升级/同步/卸载、其他文件保持 | 未实测 |

不能宣称Windows已支持稳定使用。真实学生自愿执行后只记录版本/别名/状态/数量/范围，不上传课程标题、ID、认证文件、原始响应或截图。旧alpha.1包冻结，后续alpha.2候选独立放置并给新SHA256；未对外发布/发送。

## 独立审阅及修复

独立只读审阅发现1项P2：tests/skill-install.test.ts的五处故障注入使用Unix路径后缀，Windows原生反斜杠会让钩子不触发。新增Windows分隔符/兄弟目录匹配回归，观察RED后引入测试专用匹配器；钩子改用join得到的完整路径，并断言注入已触发，子进程恢复钩子也比较完整路径。备份链接用例同时断言链接实际存在。此改动不进入运行包，不通过跳过测试掩盖问题。

修复后定向测试通过，完整238/238通过，0失败0跳过；包含既有54项Chrome加新增Mac loopback流程1项。构建、类型检查、差异检查通过。先前一轮完整237项中，生命周期测试在编辑修正前的快照里因shim变量未绑定失败（236通过/1失败）；修正后全新进程237项全部通过，审阅修复后再完整238项通过。没有扩大产品预算或删断言。

当前完整测试运行主机仍是Mac。Windows实际Chrome启动、.cmd执行、junction/句柄/Ctrl+C、本人学校认证/查询及Codex执行权限都未验证；审阅也未将这些缺口判为已完成。无第二轮审阅，重要问题以回归RED→GREEN和完整套件验证。

## 候选产物与阶段

本地候选`0.1.0-alpha.2`：106文件、MIT、private:true；SHA256为`13cf27035686b43fd1847f49f0e194c734f8b2978b318eaf80ff7235299ab22e`。已实际打包/解包检查新模块、smoke与Windows指南入包，资源仍受白名单控制。包、SHA256SUMS和README-WINDOWS.md位于项目artifacts/windows/0.1.0-alpha.2/，忽略入Git；未发送或发布。

用户原有六份未提交文档改动保留，README仅单独提交本批候选/版本说明；原有未提交正文不夹带提交。真实已安装Skill/CLI仍保持原状，没有运行新的学校查询或更改真实认证配置。完成脚本最终还会复跑完整套件，然后交用户审查；不进入其他模块，不标原封装第五批已完成。
