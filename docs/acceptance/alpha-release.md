# Alpha交付准备与验收门槛

日期：2026-10-29。状态：本地交付准备进行中，待独立学生验收；不是已发布版本。

## 已确定选择

- 用户于本轮明确选择MIT；LICENSE采用[SPDX MIT标准文本](https://spdx.org/licenses/MIT.html)，版权标注2026 hkustgz-cli contributors。package.json及锁文件根元数据同步MIT。
- 本地包名hkustgz-cli，版本0.1.0-alpha.1。保留private:true，未占用/核实公共npm包名，没有npm发布账号或公共仓库发布动作。
- 候选产物先留本机。交付渠道、对外转交时点由用户确定；不因许可证已选就自动发给同学。npm publish仍需单独授权，不用latest标签冒充稳定版。
- 有潜在自愿学生，操作系统尚待确认；Windows只可探索安装/诊断，不计真实查询支持。跨平台适配不夹入本次封装。

## 本地验证

真实tarball A→B升级在隔离prefix/HOME/CODEX_HOME和独立缓存下验证：A与B仅为临时合成测试版本，不是对外已发布版本。CLI升级后为B，Skill仍A/outdated；dry-run不更改，显式同步后current；Skill卸载及npm卸载保留合成会话、无关配置和其他Skill。该新用例基线直接通过，说明既有实现已满足，不为制造失败修改产品代码。

MIT打包测试新增LICENSE及元数据要求，先失败于缺LICENSE，再添加许可及包白名单后验证。主动logout复用既有`logout refuses busy and foreign profiles, then clears only owned browser data`安全用例，不在真实profile上执行注销或手工rm。

最终候选包将实际pack、解包逐文件检查白名单、隐私标记、运行模块与Skill资源；记录SHA256。安装和升级测试允许npm正常生命周期，使用已缓存生产依赖的离线缓存，不能宣称互联网下载或第二名学生验证已完成。

## 尚未通过的交付门槛

| 门槛 | 状态 |
| --- | --- |
| 许可证选择及LICENSE入包 | MIT已选；产物验证见最终检查 |
| 本地A→B、Skill同步、卸载/保留会话 | 已做合成回归；非学生实机结果 |
| 确认交付渠道与具体接收人由用户自行转交 | 待用户确定，不代联系 |
| 第二名学生支持平台上公开＋本人私人查询 | 未执行；设备系统待确认 |
| 两个账号13项能力逐项记录及已知范围 | 表已建；本轮结果未填通过 |
| 两名用户升级/卸载实测 | 未执行；不能用本地回归代替 |
| 公共npm发布 | 未授权，当前不执行 |

试用清单与结果格式见[独立学生验收](alpha-students.md)。可交审本地实现与产物，但第五批整体仍为待独立学生验收，不能把前四批通过当作独立用户交付完成。

## 本地检查结果

- 完整HKUSTGZ_TEST_BROWSER=1 npm test：229/229通过，0失败0跳过，含54项既有Chrome合成测试，包含构建。
- npm run typecheck、git diff --check通过；新增实际tarball A→B生命周期用例及既有logout/编辑保护/受限卸载测试通过。
- 独立只读审阅覆盖整套封装和本批本地变更，未发现可修复问题；审阅者另跑31项相关测试全部通过。学生/跨平台/旧引擎/沙箱/联网下载/发布未被虚构为已验收。
- 最终本地候选版本`0.1.0-alpha.1`，MIT、private:true、96文件，SHA256为`4b6d3c3b8188fbbc4bc9f7d71e3735fb203dd7847a53d7ef2d8668282d5b5955`。实际解包检查LICENSE、白名单和元数据；dist与Skill逐文件匹配第四批实测运行快照。本轮不重复私人查询。
- 校验值与包一起交付；内容变化必须重新计算。候选包基于当前工作树README快照，其原有未提交改写保留，本批README只新增MIT/平台说明。

候选包、SHA256SUMS、metadata及试用说明保存在项目artifacts/alpha/0.1.0-alpha.1/，该目录忽略入Git，未发送或上传。第五批本地准备可交审，整体仍待独立学生验收。
