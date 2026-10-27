# 第六模块：Portal 读取（待审）

范围为 Task 6。第五模块 d708ac5 已获用户复审通过；第六模块实现待审，不进入第七模块。来源证据 R6-PORTAL-20261027，见 [研究记录](../research/portal.md)。

## 命令

- `portal apps`：页面当前账号的应用目录，稳定源 id/name/url；不启动应用或解析临时票据为ID。真实读取23项，总数匹配；轮播重复DOM不参与计数。
- `portal notices [--query --limit]`：按已发现分类遍历来源分页。`--query`为对已读取标题和分类的本地匹配，不声称学校全文搜索；limit/20页/2000条及失败均披露partial与可信子集。
- `portal notice <source:id>`：只读取得校内mnews文章正文。已确认正文容器、原文章ID后才返回成功；外部钉钉等详情显式unsupported；无正文、登录或权限错误不能变成成功空正文。ID使用列表返回值。
- `portal agenda [--from --to]`：上海时区日期窗口，默认7日、[from,to)、最多31日；保留日历来源及原始事件ID，缺失ID为null并警告，不猜课程代码/班次。相似跨来源事件保留，仅标duplicateCandidate。

## 公告覆盖限制

发现9个分类（包含4个配置了siteId/columnId的mnews源）。本次真实全分类查询前两源读取2+6=8条；第三分类news返回result=1但data=[]，不满足已核实的total/list契约，后续分类未扫描，结果partial/upstream、退出7并附ADAPTER_CHANGED。**这不是全校公告全量，也不是news已确认无公告。** 单独指定源的校内详情可读取，不依赖全分类扫描完成。真实mnews_16文章354正文1430字符；不在仓库保存其标题或正文。外部链接正文不包含在本工具覆盖内。

## 读取与安全边界

复用本项目专用profile；新进程重新验证Portal认证，查询不等待人工登录。只使用当前正常页面发出的已观察GET模板，固定来源和路径；不提取认证头、不猜签名、不修改收藏、已读、订阅或日程。JSONP模板去callback后读取JSON，不执行响应文本。接口返回字段先在浏览器内白名单复制，不回传用户ID、邮箱、原始错误或无关卡片信息。

详情使用GET、逐跳手工检查重定向，限制同站/mnews路径；HTML作为数据解析，移除script/style/noscript，不执行计数/确认脚本。原文章ID从最终已核实文章路径核验；站外链接不跟随。网站自身正常首页请求沿用原行为，本工具不主动读取邮件/财务数据。

学期/认证/查询公共层保持不变；所有自发业务读取共享90秒总预算、30秒单次和500ms来源队列。私有结果不落盘、无跨命令缓存。

## 验证

- 全套174/174测试通过，含44项Chrome；构建和类型检查通过。
- 新增16项Portal单元/CLI、9项Chrome；测试先因模块缺失失败，后通过。
- 覆盖临时票据与稳定ID、total/分页结束、后源失败子集、JSON/table、缺正文及错误文章ID、HTTP200登录页、403、脚本文本不执行、只读参数、详情跳转限制、来源/窗口/类别校验与相似事件保留。
- 真实CLI：apps complete23；notices partial8/2页；notice内文章正文完整。日程5个来源分开读取与页面默认组合请求逐项内存对照：1日5条、7日14条，均无遗漏/新增。7日包括Outlook11条、MyCourse3条。无个人明细落盘。

## 试用

```bash
node bin/hkustgz-cli.mjs portal apps --format table
node bin/hkustgz-cli.mjs portal notices --format table
node bin/hkustgz-cli.mjs portal notices --query "keyword" --limit 20
node bin/hkustgz-cli.mjs portal notice '<列表中的source:id>'
node bin/hkustgz-cli.mjs portal agenda --from 2026-10-27 --to 2026-11-03 --format table
```

不覆盖邮件、校园卡财务、日程写入、钉钉正文聚合；Canvas为第七模块，尚未开始。

## 独立审阅

发现一项重要问题：详情_redirect逐跳GET绕过了来源500ms间隔。新增Chrome回归先失败，再加入完成上一跳响应后的可中断500ms等待；总预算与来源队列不变，不嵌套同源队列。回归先失败后通过，最终174项测试全绿后交用户审查。

轻微待补：来源将来如给出包含点号的文章ID，当前列表解析可接受但详情参数校验拒绝；已验证真实源为数值或无点号ID，本轮不扩大标识格式。

额外错误分类回归：有效JSON中appList为对象，曾将白名单投影的TypeError归为NETWORK_REQUIRED；回归先失败，修复后为ADAPTER_CHANGED，不对结构漂移进行网络重试。
