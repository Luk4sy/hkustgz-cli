# Library L2-M1 Read-only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现保守规则判定、会话主体绑定与按来源ID查询的本人详情，不启用创建或取消。

**Architecture:** 沿用TypeScript/Playwright/QueryPolicy。纯规则模块输出可解释checks；身份只在内存比较并可派生绑定摘要；详情通过正常本人页全部可见状态与分页读取，投影必要字段。

**Tech Stack:** 现有Node24、TypeScript、Zod、Playwright，不增依赖。

**Spec:** [第二阶段Spec及用户门槛调整](../specs/2026-11-01-library-booking-phase-2-spec.md)。用户已要求不等待官方答复继续开发；本轮原目录inline实施，不再询问开发方式。

## Global Constraints

- M0仍未通过。G-R1至G-R3 unknown，任何积极局部检查都不能产生可提交/可取消承诺。
- 不发送邮件，不创建/取消/签到，不进入M2，不升级安装包/Skill或push。
- 既有17项查询及mine默认8454不变；新增详情的能力独立登记，未具备完整现场证据前pending。
- 90秒总预算、单读30秒、500ms节流、20页/2000条；部分列表不能证明不存在。
- 私人原始身份/预约uuid/成员名单不输出或落盘；只用合成夹具测试。
- 新命令`booking detail --provider library --id <id> [--from <date> --to <date>]`使用既有查询协议。日期范围同mine默认7天、最多31天；缺失只表示该窗口/可见状态内未找到，绝不表示已取消。

## Review Focus

- 未知mask260、身份/额度/维护缺证仍阻断：规则回归覆盖。
- 登录后切换账号或多页中途换账号：身份单测与合成Chrome回归覆盖。
- 详情缺失、删后缺失、分页截断或过滤变化：详情collector回归覆盖。
- raw身份、uuid、成员名单、诊断嵌套不得泄露：投影/JSON/table测试覆盖。
- 旧mine8454及关闭/中断行为不变：既有全量含Chrome套件回归。

### Task 1: L2-M1 只读模块

**Files:** 新增`src/adapters/booking-library/rules.ts`、`identity.ts`、`detail.ts`、`inspection-reader.ts`；修改既有reader/model/index、CLI命令/验证、capabilities。新增`tests/booking-rules.test.ts`、`booking-identity.test.ts`、`booking-detail.test.ts`、`booking-detail-browser.test.ts`。记录`docs/acceptance/library-booking-phase-2-m1.md`与AGENTS.md。

**Interfaces:**
- `evaluateLibraryRules(input: LibraryRuleInput): LibraryRuleReport`输出checks及blocked/unknown；未知整体规则不返回ready。
- `bindLibraryIdentity(payload: unknown)`返回只含比较/派生方法的闭包，无可枚举身份值。
- `LibraryInspectionReader`提供`assertIdentity(signal)`及`page(range,page,signal)`；每页通过同一主体校验后给出scope和最小投影。
- `queryLibraryDetail({id,range},options,reader)`按正常可见状态扫描，返回scope、匹配记录或null、absence说明；raw私有字段从不进入结果。
- `createLibraryInspectionReader(page)`仅复用正常auth/userInfo及本人表格客户端方法；HTTP错误保留Retry-After。`booking detail`默认pending，测试可注入verified夹具，不借用mine能力放行。

- [x] Step1：先写规则与身份行为测试，动态导入不存在实现并断言API存在，观察失败；实现纯模块并使其通过。
  Run: `node --import tsx --test tests/booking-rules.test.ts tests/booking-identity.test.ts`。
  Expected: RED缺实现；GREEN包括时间/人数/步长/未知规则/账号变化/隐私检查。
- [x] Step2：先写详情及CLI夹具测试，覆盖分页、窗口、状态口径变化、重复、partial、缺失和泄漏；RED后实现collector及命令。
  Run: `node --import tsx --test tests/booking-detail.test.ts`。
  Expected: RED缺实现；GREEN匹配精确ID，缺失不说已取消，JSON/table一致，pending不启动浏览器。
- [x] Step3：先写完全拦截网络的Chrome测试，RED后实现只读inspection-reader；测试正常状态过滤、换账号、Retry-After与无写入。
  Run: `HKUSTGZ_TEST_BROWSER=1 node --import tsx --test tests/booking-detail-browser.test.ts`。
  Expected: RED缺reader；GREEN所有请求均为已证实GET路线，身份变化失败。
- [x] Step4：运行`HKUSTGZ_TEST_BROWSER=1 npm test`、`npm run typecheck`、`git diff --check`，核对输出。
  Expected: 全量无失败/跳过（Chrome可用时）；真实只读观察如执行只证明该子路径，未获完整证据则detail仍pending。
- [x] Step5：独立审阅，修复重要问题，集中本地提交并停下让用户审查。不进入M2。

## 自检

身份绑定由reader和详情消费；规则判定是独立纯模块，供后续预览调用，本轮不新增规则查询/预览命令。详情与旧mine分开，未修改默认筛选；查询coverage与规则coverage分开；来源日期/可见状态缺失不能推断已取消。HMAC持久密钥、预览凭据和任何业务写入留给M2以后。

## 执行与审阅结果

2026-11-01：规则/身份、详情/CLI、Chrome reader均RED→GREEN。独立审阅的两项Important（后续页畸形身份丢弃全部结果、可用段起点步长）已各用回归RED→GREEN修复；文档阶段与纯模块调用说明同步。现场只读空窗口子路径通过，但detail仍pending，不提升能力。

Ruling：全量暴露既有Portal500ms单次定时器边界，追加最小等待复核补修；Portal和新图书馆读取器的提前唤醒夹具均先复现452ms间隔失败、修复后通过。若时间语义判断错误会影响节流，已用针对性回归及全量验证核对；未扩展Portal业务范围。

最终全量282/282，0跳过，构建、类型与差异检查通过。保留M0未通过、未知规则阻断、详情pending及实际安装不变的边界。完成本模块后停下等用户审查，不进入M2，不发送邮件/工单，不推送。

2026-11-01 `f6f230b`复审P2修复：身份刷新未完成就超时时丢弃旧详情。内部刷新增加即时失效/验证完成状态，详情返回前检查内部及分页边界核验状态；普通列表超时仍保留可信partial。新增3项Chrome与1项边界回归，身份未完成场景先RED后GREEN。最终全量286/286、0跳过，构建/类型/差异检查通过。证据见验收文档同名小节；集中本地提交，停在M1等用户复审，不进入M2。
