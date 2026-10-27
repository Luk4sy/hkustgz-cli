# 第四模块：Catalog 审查与验收

状态：实现完成，等待用户审查；第三模块32f0bab已获用户验收。不进入第五模块。

## 实现范围

`catalog search <text> [--term <source-label>] [--limit N]` 和 `catalog course <id> [--term <source-label>]` 已连接真实公开目录，支持JSON/table及专用浏览器。证据为 [Catalog研究记录](../research/catalog.md) 的R4-CATALOG-20261027。

课程id为来源学期标签与课程代码的组合，例如 `2026-27 Fall:IPEN5100`；班次包含来源班次编号。班次meeting保留完整rowspan多行以及原始日期时间文本；数字使用来源值或null，Avail不由Quota−Enrol推导。名额附15–20分钟更新说明。

搜索逐学科读取，按代码、标题、教师、助教本地匹配。Fall有30学科，20页上限会返回partial及退出7；Winter本次2学科可完整扫描。用户limit在源记录边界之后应用，实际读取数量与返回数量分开。详情只核验课程对应学科，缺失或不完整时失败，不捏造课程。

公开缓存为可选项，当前运行时禁用，因此每次读取新页面，`--refresh`同样读取新数据。辅助进程内缓存要求公开性证据且TTL300000ms，不保存私有页面或跨命令数据。

## 验证

- 合成解析/CLI：搜索真正筛选、合并单元格、多教室、来源available=0保留、未完整列表失败、后页失败保留可信子集、源读取计数、limit、跨学期混淆拒绝、数字与重复班次元信息漂移拒绝、非法详情ID在启动浏览器前拒绝。
- 本机合成Chrome：切换两学科核验计数；延迟显示学期选项、同学科同数量且延迟渲染新学期课程时，不能返回旧学期数据。
- 真实编译CLI：Fall关键词搜索20页返回partial/page_cap；IPEN5100详情complete；Winter搜索2页complete。公开目录无个人数据，真实名额未写入fixture。
- 独立代码审阅发现学期DOM时序问题及重复班次字段校验缺口，已补回归修复；未进入其他业务模块。

## 试用

```bash
node bin/hkustgz-cli.mjs catalog search IPEN5100 --format table
node bin/hkustgz-cli.mjs catalog course '2026-27 Fall:IPEN5100' --format table
node bin/hkustgz-cli.mjs catalog search a --term '2025-26 Winter' --format table
```

搜索partial表示受读取上限或来源失败影响，不等于全校只有返回的课程；名额不是实时可选保证。跨平台发行仍未验收。

最终验证：`HKUSTGZ_TEST_BROWSER=1 npm test` **110项全部通过、0跳过**（含14项Chrome本机合成测试）；构建、`npm run typecheck`、`git diff --check`通过。

## 用户复审修复：中间状态不能证明目标学期数据就绪

已复现0b6609c在课程卡片内先更新loading-hint、700ms后才更新课程字段时，返回新学期标签及Old Fall Course的问题。原先任意卡片MutationObserver就绪标记已删除。现在切换前采集每个课程的代码/标题/学分及班次单元格（含rowspan）投影，切换后要求响应计数一致、无加载遮罩，且每个课程投影都不同于旧数据，再继续既有学科/学期校验；卡片额外提示文本不参与比较。不会以固定延时或提示文本变化宣布完成。

新增两项完全拦截网络的Chrome回归：提示先变、课程晚更新时等待Winter Course；提示变化且课程数据保持完全相同时，在预算内超时失败。前一项在修复前复现Old Fall Course，修复后通过。相同数据无法证明新学期刷新，因此保守失败可能拒绝本来合法但字段完全相同的跨学期课程，这是当前DOM证据边界。

完整110项测试通过（含14项Chrome本机合成测试）、构建、类型检查、差异检查通过。编译后真实Winter搜索仍返回complete、2页、2门，termId均为2025-26 Winter。等待第四模块复审，不进入第五模块。
