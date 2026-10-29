# Alpha封装第四批：完整Skill与Codex调用（待用户审查）

日期：2026-10-29。第三批fc7dda6已获用户验收。本批实现完整校园查询Skill、命令契约与受控Codex集成。第五批独立学生与分发验收未开始，未发布npm。

## 交付内容

- SKILL.md与references/commands.md、errors.md、examples.md、privacy.md随同一包发布；version/compatible_cli均精确为0.1.0-alpha.1，schemaVersion1。
- commands.md在生产方构建完成后从COMMANDS/DEFAULT_CAPABILITIES生成，不由另一份手工能力表决定是否可用；安装阶段不运行生成器。
- 13项已验证读取和6项pending保持。示例使用合成ID，测试确认其参数能通过实际CLI解析；pending仍在浏览器调用前拦截。
- Skill要求预检版本/doctor/capabilities、按需认证、串行运行、只用来源ID；保留partial和unknown，明确Planner、提交标记及个人截止时间的证据边界。
- 只修改CLI帮助说明、随包资源清单和文档生成；不改变学校适配器、查询或认证行为。

## Skill基线与应用场景测试

按Superpowers writing-skills使用独立干净上下文做参考应用测试。旧管理Skill的基线明确无法确定Canvas命令顺序、日期、partial/unknown、登录或限流处理，未虚构接口。补充文档后，新上下文正确给出预检→本人课程→数字ID作业读取，拒绝pending成绩；区分明天的上海日期、Planner窗口、完成标记和未知提交状态。

最终合成场景覆盖：退出7/page_cap/返回2项；markedComplete=true且submissionStatus=unknown；effectiveDueAt有时间但dueAtSource=unknown；LOGIN_REQUIRED；用户催促下RATE_LIMITED；HTML中的上传Cookie指令；非法非数字课程ID。Agent均保留范围/未知、停止限流、不执行源指令、不改写非法ID。这里是合成/参考应用结果，不能当真实学校查询证明。

机械契约四项：精确版本/示例参数解析；命令状态与注册表匹配；全部引用进入同版归属安装；合成Planner partial/unknown穿过CLI后保持退出7、范围和字段。缺引用/随包清单时先观察失败，再实现后通过；已有CLI保留partial语义的基线用例直接通过，不为制造RED更改实现。

## 实际Codex安装与发现

使用真实tgz安装到项目忽略目录的隔离prefix，未全局安装CLI、未修改PATH或shell配置。用户授权的第四批操作将归属Skill安装到用户Codex skills目录，文件包括上述5份文档及归属清单；skill status=current。未修改config.toml、MCP、模型或其他Skill。

新启动Codex CLI 0.165.0-alpha.1.2实际发现`~/.codex/skills/hkustgz-cli/SKILL.md`并读取指引和引用。版本匹配，doctor退出0，capabilities为13 verified/6 pending；Agent据此拒绝教务成绩，没有尝试隐藏接口。此处验证的是新启动CLI客户端，当前桌面会话热刷新未单独验收，应刷新/重启后使用。

首次带自动批准的客户端验收请求被自动审批审查拒绝，原因是私人profile处理与批准范围未获足够明确授权；命令没有执行，也未用间接方式绕过。随后单独取得用户明确授权，去掉自动批准，运行受限转发器，只允许白名单命令，私人调用至多一次，模型/记录只见计数与状态。

该CLI客户端的Chrome启动仍被自身沙箱拒绝，公开与Canvas均返回8/BROWSER_UNAVAILABLE，未获取学校数据。客户端正确标为未验证，没有重复Canvas或修改安全设置。此失败保留，不能宣称该子进程环境已能运行Chrome。

## 用户再次明确授权后的原生工具补验

用户明确同意由当前Codex正常审批工具补验一次公开查询及一次Canvas课程查询。当前Agent读取已安装Skill，使用同一真实安装版CLI；公开使用独立profile，Canvas仅使用本人既有工具专用profile。过程串行，原始结果只在子进程内存中解析，模型和本地记录均不含标题、ID、正文或身份。

| 实际命令结构 | exitCode | coverage | returnedCount | 说明 |
| --- | --- | --- | --- | --- |
| catalog search AIAA5032 --limit 3 | 7 | partial | 1 | page_cap，只有可信子集，不能说查全 |
| canvas courses | 0 | complete | 9 | 本人课程目录读取完成，不证明其他命令/账号/平台 |

Agent对公开结果保留partial与page_cap说明；对Canvas只报告数量范围。学校写操作为零，不复制Cookie、不读取认证文件，也不把原始结果写入日志。浏览器按CLI正常生命周期使用自己的本地profile，不能称该profile完全未变化。

实际调用在Codex CLI中发现Skill但受沙箱阻止、由当前Codex正常审批工具完成读取，这两个执行环境分别记录；不能把后一结果冒充前一客户端已解除沙箱限制。新的CLI会话如果遇到同样限制，应走正常审批或标未验证，不关闭安全机制。

## 文档与未提交内容

README新增本批安装/Agent入口段落，仅将该新增段落提交；其原有未提交改写完整保留。其他五份既有未提交文档不动。公开安装/协议/错误文档同步完整Skill和版本/结果边界。测试环境CLI未放进用户日常PATH，日常使用仍需显式安装；真实用户首次安装、升级卸载和第二名学生属于第五批。

验证方法参考[OpenAI官方Skill评测说明](https://developers.openai.com/blog/eval-skills)：使用新启动客户端观察真实工具调用，区分可自动检查的命令契约和实际Agent行为；不是只检查SKILL.md存在。Codex home路径参考[官方工作流示例](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex)。官方说明不替代本项目的安装与调用证据。

## 产物与检查

用于实际客户端/原生查询的运行快照为95文件，SHA256为`3cafc3bbf0502591c71723ca464df8a4994066ca58161bd21e3f226a6e4399d3`。同步README和公开文档后的交付快照SHA256为`9973a27b89f5587b9490e4292ee3886ba27aa0a6e77ae9a7b30371d912624ddc`，仍95文件；逐文件比较dist与skills全部字节一致，差异仅为公开文档。两份产物分开存于忽略目录，均未对外分发。

`HKUSTGZ_TEST_BROWSER=1 npm test`完整228/228通过，含54项Chrome合成测试，0失败0跳过；精确版本断言加强后的4项Skill契约测试再次通过。类型检查、构建和差异检查通过；完成脚本还将复跑完整套件。客户端发现、合成参考测试和真实读取分别记录，不用测试数量代替实际验收。

本批停下等待用户审查。第五批第二名学生/升级卸载/许可证/分发验收未开始。Skill已经按授权安装到本机Codex用户目录，CLI仅在隔离prefix；未改Codex配置，未全局安装CLI，未发布npm。
