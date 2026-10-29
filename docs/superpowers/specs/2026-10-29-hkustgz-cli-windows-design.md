# Windows 11 alpha适配设计

2026-10-29。用户已批准上一轮短方案：Windows11＋Google Chrome＋Node24＋Codex；实现后停下人工审查。本文件存档该方案并细化内部技术选择，不扩Edge/其他Agent、Linux或学校业务。

目标：消除明确的Windows代码阻塞，给学生可安装的候选包及PowerShell步骤；Mac验证不得冒充Windows实测。原封装第五批仍待独立学生结果。本次另作一个审查批次，原目录实施，保留已有六份脏文档。

方法：复用现有CLI/Playwright/专用profile，统一Chrome定位与启动，不安装浏览器、不读个人profile/凭据、不复制Cookie。Windows候选来自PROGRAMW6432/ProgramFiles/ProgramFiles(x86)/LOCALAPPDATA下固定Chrome suffix；只接受本地绝对盘符路径。检测优先系统安装、再用户安装，去重且检查普通文件；选中路径原样用于Chrome启动。Mac沿用channel语义，Edge/Chromium不升格。

备选：仅放开doctor会出现检测通过却启动错误；依赖自动下载Chromium扩大安装及分发范围；均不采用。

doctor增加Windows NT build观察：10.0且build>=22000作为Windows11候选（不能仅凭NT build证明客户端版/SKU）；通过基础条件后报告warn/WINDOWS_CANDIDATE，不伪装已实测。Windows10、Linux、未知build继续fail，缺Chrome或非Chrome选择继续fail。真实系统/架构由同学回报，Server/未来Windows不宣称支持。依据Microsoft Windows11发布信息与Node os.release，文档记录推断范围。

路径维持归属/摘要/锁；Windows仅本地盘符根，拒绝drive-relative、root-relative、UNC、device路径和ADS，拒绝junction/symlink祖先。manifest始终用POSIX相对名，文件操作用原生path。保留旧Skill/文件；不自动删除未知锁。Node信号与Windows进程关闭语义不同，模拟测试只证明处理逻辑，真实Ctrl+C/文件句柄仍需实机。

测试安装器用Node执行npm-cli.js而不是拼接cmd字符串，不用shell:true；链接用Windows junction/Unix目录链接；全局prefix布局与可执行入口按平台计算。PowerShell用户显式用npm.cmd/hkustgz-cli.cmd，避免要求改变执行策略。

新增显式windows-smoke.mjs：新建临时CLI归属目录，仅启动Chrome访问127.0.0.1合成页面，正常关闭后重取锁；不访问学校/用户会话，输出状态而非原始异常/本机路径。随包提供，安装时不执行。用户再自行正常登录和查询，结果仅记录数量、覆盖和错误码。

新候选版本0.1.0-alpha.2，Skill同版，MIT/private:true；不覆盖已冻结alpha.1产物，不自动更新用户已安装Skill、CLI或配置，不发布/发送。默认语义仍只读，学校适配器不改。

验收：候选路径和实际launch一致、Windows11/10/未知判定、盘符与junction保护、包安装/升级/Skill/隐私回归、Mac Chrome完整回归、PowerShell清单；真实Windows11安装/localhost Chrome/退出锁/本人登录及查询均标待实机。独立审阅后交用户审查，不进入后续模块。
