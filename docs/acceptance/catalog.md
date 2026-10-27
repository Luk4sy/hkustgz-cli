# 第四模块：Catalog 审查与验收

状态：复审问题已修复，等待用户审查；第三模块32f0bab已验收，不进入第五模块。

## 当前读取路线

`catalog search <text> [--term <source-label>] [--limit N]` 和 `catalog course <id> [--term <source-label>]` 使用公开页面的现有课程读取客户端，结果 `readMethod=response`。当前证据为 [Catalog研究记录](../research/catalog.md) 的 **R4-CATALOG-BATCH-20261027**。

页面照常选择学期/学科。课程请求仍由页面的正常点击触发；CLI在其现有客户端返回完整、已解码响应后，立即同步复制课程字段白名单为JSON字符串，再向页面返回原结果。标题、班次、全部meeting和名额均来自同一不可变批次，不读取分步渲染中的课程DOM。不会自行解码响应、提取签名或重放课程API。

使用同一公开客户端读取学期列表，将界面标签绑定到来源termId；读取前留出500ms间隔，并受单次/总预算约束。批次同时核对序号、学期标签、请求termId、学科；每个班次termId必须等于请求termId。结构、计数或学期不符时失败，客户端不可用时不退回DOM猜测。

仅复制代码、标题、学分、班次、日期时间、地点、公开教师/助教姓名、名额与备注/Consent；不复制响应config、认证头、员工ID、账号或邮箱。无原始响应落盘，无运行时缓存。

## 结果语义

- CLI id仍为 `termLabel:courseCode`，例如 `2026-27 Fall:IPEN5100`，班次再附来源班次编号。
- 所有meeting保留；日期时间文本使用源YYYY-MM-DD、HH:mm及weekDay字段，缺失部分为unknown；不从DOM格式化文本反推日期。
- 数字缺失为null，Avail使用来源值，不由Quota−Enrol覆盖；名额附通常15–20分钟更新说明。
- 搜索按代码、标题、教师、助教本地匹配；源数据最多20页/2000条，再应用用户limit。实际读取量与返回量分别披露。
- Fall本次30学科，达到20页上限返回partial/退出7；Winter本次2学科可complete。详情只读取对应学科。
- 相同课程字段也能正常返回：目标学期由来源请求及完整响应证明，不再以“字段必须发生变化”作为证据。

## 复审回归

已在旧版本复现：标题先更新返回Winter标题/Old Fall Room，班次先更新返回旧标题/Winter教室。原先整体字段签名的判据已删除。

完全拦截网络的Chrome合成页面覆盖：正常切换、标题先更新、班次先更新、加载提示先更新、DOM始终不更新、字段完全相同；所有成功结果来自完整目标响应，均不混用DOM字段。另覆盖来源班次学期错误、读取客户端缺失、字段白名单不含邮箱标记。纯解析回归覆盖完整批次计数、学期归属、多meeting、缺失学分/名额、Consent及来源Avail=0。

原DOM合并单元格解析、搜索筛选、后页失败保留可信子集、limit和源计数等已有测试继续通过。

## 验证与试用

`HKUSTGZ_TEST_BROWSER=1 npm test` **119项全部通过、0跳过**，含21项Chrome本机合成测试；构建、类型检查通过。真实编译CLI已验证：Fall搜索20页/248源课程，IPEN5100返回1条并标记partial/page_cap；课程详情complete；Winter搜索2页/2门complete。

```bash
node bin/hkustgz-cli.mjs catalog search IPEN5100 --format table
node bin/hkustgz-cli.mjs catalog course '2026-27 Fall:IPEN5100' --format table
node bin/hkustgz-cli.mjs catalog search a --term '2025-26 Winter' --format table
```

公开页面客户端模块变化或无法取得完整批次时返回失败，不能用固定等待时间或局部DOM变化代替证据。跨平台发行仍未验收。
