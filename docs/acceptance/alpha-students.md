# 独立学生试用清单与记录

日期：2026-10-29。状态：待独立学生验收。维护者已表示有自愿同学，但其系统尚未确认，可能为Windows；未联系同学、未发送安装包、未取得其测试结果。

## 范围

当前alpha支持目标为macOS＋Google Chrome＋Node24.x/npm。Windows/Linux尚未实机验收。Windows同学可以先做安装、版本、capabilities和doctor的探索性验证；doctor会把未验证的平台标为fail/退出8，不能据安装成功宣称真实查询已支持，也不将Windows结果冒充第二名Mac学生的通过记录。如需要Windows真实查询支持，应另立适配/验收批次。

每位学生使用自己的设备和账号，独立创建本工具profile。维护者不索取密码、Token、Cookie、profile、截图、原始响应、课程标题或ID。用户本人邀请/转交文件，本工具不代发消息。

## 收到确定版本产物后

1. 对照维护者给出的SHA256，确认文件未变；macOS用`shasum -a 256 <tgz>`，Windows PowerShell用`Get-FileHash <tgz> -Algorithm SHA256`。两者只是校验命令，不代表平台查询已支持。
2. 确认Node24.x/npm及Chrome。执行`npm install --global <本机tgz绝对路径>`，再运行`hkustgz-cli --version`、`hkustgz-cli doctor`、`hkustgz-cli capabilities`。
3. 仅在支持的环境且doctor阻塞项处理完成后，运行`hkustgz-cli catalog search AIAA5032 --limit 3`。只回报exitCode、coverage、returnedCount和truncationReason；退出7保留partial，不报“查全”。
4. 由同学本人运行`auth login sis`或`auth login canvas`，在正常窗口认证。登录后运行`sis today`或`canvas courses`一项本人查询；只回报计数/范围/状态，不传内容。对话里不收取认证资料。
5. 显式安装Skill：`hkustgz-cli skill install --target codex --dry-run`后执行实际install。刷新客户端，以自然语言查询同一公开课程和本人信息，遇成绩pending应拒绝、限流应停下。其他Agent可导出到--dir，但尚无跨客户端验收承诺。
6. 升级：收到维护者下一明确版本后安装B，检查CLI变B、Skill仍A/outdated；显式skill install同步为B/current。未提供真实B时标未测，不能拿本地合成升级当同学通过。
7. 卸载：如希望清本工具会话，先运行auth logout；如希望保留则跳过。先显式skill uninstall，再npm uninstall --global hkustgz-cli。检查其他Skill/配置不变；npm卸载不替你删除会话。logout不代表学校全局撤销登录。

出现PROFILE_BUSY等原进程结束，不删锁；配置不安全先停止；登录/权限失败如实记录，不借他人账号。未知字段不当false，Planner不代表全部作业，完成标记不代表提交。

## 环境与结果字段

每份回报使用同一组字段：artifactVersion、artifactSha256、os、arch、node、npm、chrome、testerAlias、capabilityId、outcome、notes。outcome仅用pass/partial/unknown/permission_denied/not_tested；失败的错误码和exitCode放notes，无法确认则unknown。testerAlias使用student-B之类别名，不填姓名/学号。

```json
{
  "artifactVersion": "0.1.0-alpha.1",
  "artifactSha256": "4b6d3c3b8188fbbc4bc9f7d71e3735fb203dd7847a53d7ef2d8668282d5b5955",
  "os": "待同学确认",
  "arch": "待同学确认",
  "node": "待同学回报",
  "npm": "待同学回报",
  "chrome": "待同学回报",
  "testerAlias": "student-B",
  "capabilityId": "canvas.courses",
  "outcome": "not_tested",
  "notes": "尚未安装或执行；不要附课程内容"
}
```

## 两个账号的当前矩阵

此表针对本轮最终候选产物；本轮未重跑维护者私人查询。第四批的历史证据另见alpha-agent.md（公开partial1/page_cap、Canvas complete9），不能把旧产物/旧账号实测自动填成本轮两个账号均通过。

| capabilityId | maintainer-A | student-B | 备注 |
| --- | --- | --- | --- |
| catalog.search | not_tested | not_tested | 本产物学校读取未重跑；第四批有partial证据 |
| catalog.course | not_tested | not_tested | 来源范围需实际记录 |
| sis.terms | not_tested | not_tested | 本人正常认证 |
| sis.timetable | not_tested | not_tested | 计划安排，不保证临时变更 |
| sis.today | not_tested | not_tested | 上海日期 |
| portal.apps | not_tested | not_tested | 只返回已核实入口 |
| portal.notices | not_tested | not_tested | 已知可能partial，非全校覆盖 |
| portal.notice | not_tested | not_tested | 校内正文，外部正文不支持 |
| portal.agenda | not_tested | not_tested | 保留来源与范围 |
| canvas.courses | not_tested | not_tested | 第四批有本人9门complete证据 |
| canvas.announcements | not_tested | not_tested | 需要返回的本人课程ID |
| canvas.assignments | not_tested | not_tested | 个人期限/提交缺证据时unknown |
| canvas.agenda | not_tested | not_tested | 仅Planner窗口 |

当前两名测试者本轮环境元信息：maintainer-A沿用本机macOS26.6.2/arm64/Node24.20.0/npm11.19.0/Chrome156.0.8078.48；student-B系统及各版本待本人回报。没有第二名学生证据前，不把第五批标已验收。

## 当前候选包

本地版本`0.1.0-alpha.1`，SHA256为`4b6d3c3b8188fbbc4bc9f7d71e3735fb203dd7847a53d7ef2d8668282d5b5955`，96文件、MIT许可。仅完成本地验证，尚未转交；用户决定转交时应同时提供包、SHA256SUMS和本清单。Windows场景仍为探索，不标真实查询通过。
