# alpha.3 本地 CLI / Skill 同步

2026-11-01，用户明确授权同步版本并以本人账号只读盘点预约系统。对应已验收Task8（62685a9）；本批不增加预约写入或其他供应商CLI适配器。

- package.json、package-lock.json根版本、随包Skill version/compatible_cli统一为0.1.0-alpha.3，schemaVersion仍为1。
- Skill补充Booking四命令、规则unknown、8454来源状态过滤、使用/参观区别；明确用户授权的独立浏览器盘点与CLI verified范围分别报告。
- 新增指引契约先因缺少Booking示例失败；补齐后与版本、安装升级和隐私用例合计23项通过。构建、类型检查和差异检查通过。没有改动业务适配器代码，本批未重复完整Chrome套件。
- 生成新的本地tgz及SHA256，保留旧候选：ea5a190680e193865a91d55d459ddf1180eb9f581bd80124cfe27feceef3c2d0。
- 通过已缓存生产依赖离线安装到当前Node24全局目录，命令可用；显式Skill安装dry-run无冲突，再安装到Codex归属目录，旧alpha.1更新到alpha.3，status=current。
- 实际CLI --version、Skill status、doctor均验证；doctor各项通过、17verified/2pending。本轮已读取新版Skill并按其指引完成实际查询，不据此声称所有客户端界面已自动热刷新。
- 用户明确授权的其他预约系统盘点使用专用会话及正常页面SSO；只将必要空间及权限结果直接返回用户，不保存私人原始响应、截图、账户信息或资源盘点画像，不把临时观察升级为CLI verified。
- 学校体育馆旧入口存在目录尾斜杠重定向到HTTP，调研使用已观察路径的HTTPS规范地址；未放宽明文HTTP来源。

本地同步不等于npm发布、GitHub推送或对外分发；Windows真机与独立学生验收仍待完成。
