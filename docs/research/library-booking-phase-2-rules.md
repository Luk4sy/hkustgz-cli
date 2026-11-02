# L2-M0规则补证：字段、边界与未决门槛

观察日期：2026-11-01，Asia/Shanghai。范围仅为M0研究，不实现M1，不启用操作能力。

依据：[Spec](../superpowers/specs/2026-11-01-library-booking-phase-2-spec.md)、[已有创建/取消证据](library-booking-phase-2.md)。先前真实预约已取消，本轮不重复创建、取消、占位或签到。以下区分**当前响应/页面观察、公开代码、合成输入观察、仍未证实**，不能用其中一类替代另一类。

> 本文保留2026-11-01证据及当时门槛，不回写为新证据。2026-11-02新增[登录后账号与规则核对、门槛修订提案](library-booking-account-rules-2026-11-02.md)，对应Spec §5.1～§5.3待用户审查；尚未启用真实操作。

## 1. 可复核来源

公开来源origin：`https://libroombooking.hkust-gz.edu.cn`。以下SHA-256为脚本文本UTF-8编码摘要；位置是从0起算的JavaScript字符串偏移，并非源码行号。

| 来源 | SHA-256 | 关键位置/内容 |
|---|---|---|
| `/js/chunk-00b8aa15_1685603939570.js` | `08ea4daf9c04f21dd85885a9b97a294c5f6b930274a8e3ca43861f179838e8fa` | checkTimes约24605；checkStartTime26046；checkEndTime27364；limit28589；watch约31800 |
| `/js/chunk-a88c25ca_1685603939570.js` | `1d1a01e3533b3d3561ea27a3ee4cf5902089a229fab002ef32736f04efc036e5` | handleItemCurrentClass：缺规则/开放表、onlyView、日期范围及开闭馆判据；约2573含提前时间比较 |
| `/js/chunk-common_1685603939570.js` | `5e98811d6903f1b9da837074988cfe9fd8ebb18c00c44fdcc0908e8570ccf10e` | disReservePunishInfo约2680；读取reserve/punishInfo约78924 |
| `/js/chunk-0a13ab7b_1685603939570.js` | `7fd5f94a2c62a58bccfb66319f92dcdf0db841fe2c0238292a828471bae262eb` | limit计算函数内，偏移6442的`value:32`对应前面的`index_main_resvInfo_limit_label9`；这是表中32位“另一规则展示组件”的定位 |
| `/js/chunk-cc9ed112_1685603939570.js` | `db9a0d0983e7252f42728bb25c564223e46557afb6d13b97a302d0416f4bd825` | 偏移39408的`n.maintenanceTime`及后续日期比较命中gray分支；这是维护行所说的其他座位分块，不是研修间维护协议 |

另核对已观察部署清单中的24个非vendor分块，检索maintenanceTime、seriesTimeLimit、prohibtOperationTime、freezingTime及256位相关用法。检索未找到某字段用法，仅表示**该扫描范围未提供解释**，不证明服务端忽略该字段。源文件名中的构建时间不是规则生效时间。

### 1.1 原24个分块的完整清单

以下对应原扫描集合，顺序与扫描相同。此次文档修复重新GET公开文件，均HTTP200，并补录SHA-256；这是来源定位校验，未重跑11项现场函数观察。上表中的`chunk-common`及`chunk-0a13ab7b`为额外引用，不计入原24个分块数量。

| 序号 | 路径（相对于本节官方origin） | SHA-256 |
|---|---|---|
| 1 | `/js/chunk-00b8aa15_1685603939570.js` | `08ea4daf9c04f21dd85885a9b97a294c5f6b930274a8e3ca43861f179838e8fa` |
| 2 | `/js/chunk-22588360_1685603939570.js` | `10c7eca49363f2654ab61bd8219fef870263a3954f27d36f611d6c5e57d07c67` |
| 3 | `/js/chunk-2d0c1b2e_1685603939570.js` | `49acc7fba4ee38ecde1d5345d1aa6c3c492984b910eb16f6a468f213e36dfc2c` |
| 4 | `/js/chunk-2d0e66f7_1685603939570.js` | `c1be02c47c6886ec3aa4faee7cb49b74d37df28a2258bf39f51c1996e4c2fc9d` |
| 5 | `/js/chunk-2d21d0c2_1685603939570.js` | `3b4fea3e5f45315e8243cf56781d0df5722e6133942671dc592ff479ba8213e5` |
| 6 | `/js/chunk-2e46fea2_1685603939570.js` | `b23d66be84f749a13b5ccd0f040d0befa7ff29ceb237de70bb1284797f05426c` |
| 7 | `/js/chunk-30eb510e_1685603939570.js` | `2fed99515b5d3692560a78631a169e9c6cf336b0c8a64c9f9a5867f671b09348` |
| 8 | `/js/chunk-3fe0c0e4_1685603939570.js` | `c73856a77637a12a1e78230fdf8c10c141aa2acdb8470a054c5217573f488edf` |
| 9 | `/js/chunk-3e11ebbf_1685603939570.js` | `9ddb48177d0b0860d9666f3cd9df622965e3e7ab551434be20b15303b0e669a0` |
| 10 | `/js/chunk-460001c9_1685603939570.js` | `12f0f9c97158f60372caa1e6b692a6c39142c6712d57e8588d9e09078426f867` |
| 11 | `/js/chunk-4ebc2a54_1685603939570.js` | `e21cc0221a575c327d32cd4373ddc324b617219369abb5aef8a55459918d61fd` |
| 12 | `/js/chunk-47f1dc9c_1685603939570.js` | `44e659a94443dae89be074a4597ff7d2f63b99285bf18ebff2f97bd6748bdc6a` |
| 13 | `/js/chunk-55abbe92_1685603939570.js` | `4efc2fc44f4bd17b7baa40b65ebd1130003a566d4dd3aa39920ae139b6043fe3` |
| 14 | `/js/chunk-4f0ed230_1685603939570.js` | `8994f7b6bcb3c6958b09143877cb433782b4237b104bff660857c9388aac4bf0` |
| 15 | `/js/chunk-65b4767a_1685603939570.js` | `2ae567e0f945e421dc83cdff98a2f4d87e654ca32d80fb7a765434984c7d8c32` |
| 16 | `/js/chunk-7baba880_1685603939570.js` | `54f1fb03979687490fc4fb4ddb060fe0ac28473edfc5a062743c50e45e8586ee` |
| 17 | `/js/chunk-8e8abf54_1685603939570.js` | `ef219cc708c0205f42d67add825b4636029bfde39310fa896a27c4511935cc5e` |
| 18 | `/js/chunk-976ea74a_1685603939570.js` | `0d8df559b062909f4b48074d92bb8198700fcaa987055991f8ed382ea76315b5` |
| 19 | `/js/chunk-a4493d86_1685603939570.js` | `524a0838970f9633f533dbc5d5fa68bb2f195829663c95b712156cabebf5b58b` |
| 20 | `/js/chunk-a88c25ca_1685603939570.js` | `1d1a01e3533b3d3561ea27a3ee4cf5902089a229fab002ef32736f04efc036e5` |
| 21 | `/js/chunk-c8396544_1685603939570.js` | `19f4928f0744c08eeee9d9949636374b0767ebf6038640b7ea0ee2583bad3238` |
| 22 | `/js/chunk-ccaadd26_1685603939570.js` | `a5b91ebfe2fde32aecd2fb27b293f2600c994fb78d89c36e9ba558dce1d364cc` |
| 23 | `/js/chunk-cc9ed112_1685603939570.js` | `db9a0d0983e7252f42728bb25c564223e46557afb6d13b97a302d0416f4bd825` |
| 24 | `/js/chunk-f20622f6_1685603939570.js` | `a192c5ff69ecf60bfb7c50e78b373aec7318b3db84d58fa97c2631d78137bcaf` |

以下专用profile及11项函数观察均为`ed32f3d`对应取证轮次的记录，本次文档修复未重做。原轮次专用profile正常恢复登录；只投影身份字段是否存在，不保存值。图书馆`/ic-web/**`请求设置额外只读拦截：只允许GET/HEAD/OPTIONS，其他方法立即中止。两次观察均未触发写入拦截（0次），无业务写入。只读页本身可读不代表最终有预约权限。

## 2. 规则位：已解释与未解释分开

正常页面Vue翻译函数返回下列标签；掩码映射来自单次预约表单的limit计算函数，不将翻译序号误当掩码。

| 掩码值 | 当前页面标签/逻辑 | 证据边界 |
|---|---|---|
| 0 | 无限制 | 只有完整掩码确为0才能引用；不能把未识别位当0 |
| 1 | 需要审核 | 审核状态与创建结果分开；没有该位也不能推断其他审批永不存在 |
| 2 | 暂时离开超时仍保留 | 本阶段不实现暂离 |
| 4 | 有违约时可继续预约 | 不代表账号永不被封禁或其他资格检查可以跳过 |
| 8 | 增删改预约不发送短信 | 不能反向推出没有该位就一定发送短信；其他通知渠道仍未知 |
| 16 | 仅适用活动 | 首批单次图书馆路线不能套用 |
| 32 | 预约结束必须操作才能离开 | `chunk-0a13ab7b`偏移6442有该映射（完整路径/摘要见第1节）；不从单次表单缺此条推断不适用 |
| 64 | 开始时间是当前时间或开馆时间 | watch分支会固定/调整开始时间；不能擅自改变用户确认参数 |
| 128 | 结束时间是闭馆时间 | watch与64组合会固定结束；当前首批路线不能静默支持 |
| 256 | **未解释** | 不是resvStatus中的“待审核”；两套字段即使数值相同也不能混用 |

研修间样本的`resvRule.limit=260=4+256`。因此只能解释其中4，**不能宣布整个260已理解，也不能据“本次曾预约成功”把256加入安全放行白名单**。源码还存在1024、8192、16384等主题/附件/人数分支，其语义与适用性需按具体流程核实，不据局部代码扩大首批支持范围。

## 3. 字段到正常页面行为

| 条件 | 当前证据 | 实现时必须保留的边界 |
|---|---|---|
| 目标实体 | roomMenu目录ID，资源devId；来源预约resvId与取消uuid各自独立 | 不能按楼层数字推ID，不能按房名或相似记录关联 |
| 人数 | 研修间样本minUser=1/maxUser=2，正常表单人数1–2；讨论间另有minUser=2样本 | 必须按目标资源及有效参与人判断；本人计入成员，不虚构成员 |
| 开放 | 样本openTimes08:00–23:00；代码按开放段生成选项，openLimit有分支 | 必须用目标日期完整开放表；缺表、未知openLimit不能当全天开放 |
| 提前范围 | latestResvTime=0、earliestResvTime=20160，页面解释0–14天 | 名称容易反读：latest是最近可订边界，earliest是最远边界；不可交换 |
| 整天与分钟范围 | handleItemCurrentClass对整天范围比较学校日期；checkStartTime对非1440整倍数另作时分截断 | 14天样本不能机械变成“现在起精确336小时”；非整天范围需独立取证。整天日期比较属代码证据，本轮未做服务器边界提交 |
| 时长 | minResvTime=15/maxResvTime=120，表单及选项函数一致 | 包含15与120的端点；不是固定只能约2小时 |
| 步长 | timeInterval=5生成开始/结束选项；sysConfig.resvTimeUnit=10同时存在 | 本样本表单实际步长来自timeInterval，不能用全局10覆盖；步长相对可用段起点生成，不能默认任意输入合法 |
| 占用缓冲 | checkTimes读取freezingTime，在占用前后各扩大对应分钟数；排除状态位128的已结束项 | 必须先投影/合并有效占用再计算可信可用段；不能把已结束项永久占用，其他状态未知不能自行释放 |
| 维护/只展示 | `chunk-a88c25ca`的handleItemCurrentClass有onlyView、无规则/开放数据分支；其他座位分块`chunk-cc9ed112`偏移39408有maintenanceTime判据（完整路径/摘要见第1节） | **未验证研修间完整维护协议及非空样本**；不能跨座位/借用资源类型移植该判据 |
| 取消窗口 | cancelTime=10，cancelTimeReduceMinutes=0；正常须知说明开始前超过10分钟可取消不扣信用 | 本人列表取消按钮仅查主体和部分状态，未覆盖时间条件；临界恰好10分钟、已过窗口均未实测，不允许据按钮显示放行 |
| 签到/违约 | 页面与正常成功提示要求至少1人、开始后10分钟内签到；涉及信用 | 本阶段不自动签到；创建前展示后果，不能以有违约可继续预约推断无处罚 |
| 主题/附加字段 | resvTheme、resvthememust、resvthemefix按sysKind按位控制；样本主题必填且正常单次表单成功 | 不能把全局字符串当布尔；有附件/验证码/附加服务等未覆盖流程则停止 |
| 冻结/既有预约额度 | freezingTime有前端时间缓冲语义；seriesTimeLimit=1440、rangeNum=2、deadlineTime=1可见 | **没有证据证明这些数字是“每日次数/每周次数/可持有数”**；不能这样命名或实现 |
| 身份/禁用/资格 | auth/userInfo含稳定标识候选；正常页读取reserve/punishInfo；成员选择禁用部分status/localstatus=2项 | 字段存在、惩罚列表为空、房间可见都不能独立证明所有预约资格；不输出个人属性或做账号画像 |

### 对已有预约限制的结论

本次未取得对本账号适用、语义明确且完整的日/周/同时持有预约额度协议。正常创建样本仅证明那个时刻的那一次提交被接受，不证明无上限，也不证明所有历史状态不计额度。本人列表默认8454、或勾选全部可见状态，都不自动覆盖已删除记录和所有计数口径。存在未决本地操作时继续拦截；学校额度规则未知时不能给出ready预览。

## 4. 11项边界观察（不是CLI测试或服务器拒绝样本）

读取当前页面已加载Vue组件的`$options.computed.checkStartTime/checkEndTime/checkTimes`，以`.call(syntheticContext)`调用。只替换函数接收的上下文，不修改组件状态、不触发submit方法或网络请求。使用Asia/Shanghai，固定合成日期2026-11-02、开放08:00–23:00、min15/max120/step5、提前0–14天，其他所需输入为合成占用。调用原页面函数，没有另写M1规则实现。

### 4.1 实际使用的合成上下文与调用顺序

`vue`为已加载单次预约组件，`c=vue.$options.computed`，`$moment=vue.$moment`。执行时浏览器时区为Asia/Shanghai、实际日期为2026-11-01；只固定目标日期，没有mock当前时钟。后续日期复核应记录实际now，不能在目标日期已过后仍预期得到同一历史输出。

```js
const date = '2026-11-02';
const room = {
  resvRule: {
    minResvTime: 15, maxResvTime: 120, timeInterval: 5,
    earliestResvTime: 20160, latestResvTime: 0, freezingTime: 0
  },
  resvInfo: [], cls: [], openStart: '08:00', openEnd: '23:00'
};
const ctx = {
  $moment,
  $store: {state: {newResearch: {resvDates: date, roomConfig: room}}},
  newResearch: {resvDates: date, roomConfig: room},
  checkTimes: [{startTime: date + ' 08:00', endTime: date + ' 23:00'}],
  formData: {startTime: '08:00'}
};
```

B01–B03从`c.checkStartTime.call(ctx).map(x => x.value)`检查是否包含对应开始时间；B04–B07从`c.checkEndTime.call(ctx).map(x => x.value)`检查结束时间。B08仅将`ctx.formData.startTime`设为`22:45`后检查23:00；B09再设为`22:50`后检查结束选项数量为0。这里的`ctx.checkTimes`是上面的固定合成开放段，不是通过真实占用列表取得。

B10–B11改为直接调用`c.checkTimes.call(ctx)`。B10的有效占用状态**确为数值2**，B11将该字段**直接替换为128，不是按位追加为130**：

```js
ctx.newResearch.roomConfig = {
  ...room,
  resvRule: {...room.resvRule, freezingTime: 10},
  resvInfo: [{
    startTime: date + ' 09:00', endTime: date + ' 10:00',
    resvStatus: 2
  }]
};
const b10 = c.checkTimes.call(ctx).map(x => [x.startTime, x.endTime]);
ctx.newResearch.roomConfig.resvInfo[0].resvStatus = 128;
const b11 = c.checkTimes.call(ctx).map(x => [x.startTime, x.endTime]);
```

`ctx.newResearch`与`ctx.$store.state.newResearch`是两个容器，初始引用同一个room；B10只替换前者的roomConfig，后者仍指向原room。B10/B11调用的checkTimes函数从`this.newResearch`读取数据，所以这两个观察确实使用10分钟缓冲。各断言以`JSON.stringify(actual) === JSON.stringify(expected)`比对；没有身份、来源预约或参与人字段，也没有调用提交函数。

### 4.2 观察结果

| ID | 输入与观察 | 结果 |
|---|---|---|
| B01 | 开始08:00在选项中 | true |
| B02 | 开始08:05在选项中 | true |
| B03 | 开始08:03在选项中 | false |
| B04 | 开始08:00、结束08:10在选项中 | false |
| B05 | 开始08:00、结束08:15在选项中 | true |
| B06 | 开始08:00、结束10:00在选项中 | true |
| B07 | 开始08:00、结束10:05在选项中 | false |
| B08 | 开始22:45、结束23:00在选项中 | true |
| B09 | 开始22:50，合法结束选项数量 | 0 |
| B10 | 合成占用09:00–10:00、resvStatus=2、freezingTime=10 | 间隙08:00–08:50及10:10–23:00 |
| B11 | 将同一合成占用的resvStatus直接替换为128，仍保留freezingTime=10 | 间隙08:00–23:00 |

实跑11/11符合预先列出的期望，进程退出0，写入拦截触发0次，正常清理会话。这里只核对有限前端函数行为，不证明服务端同样接受边界，不覆盖所有区间组合、维护、额度、身份或未知规则位。以后M1仍须自己的TDD与合成Chrome回归，不能把11项计入现有CLI测试总数。

## 5. 证据门槛和继续条件

| 缺口 | 现在可交付的结论 | 补齐途径 | 未补齐前 |
|---|---|---|---|
| G-R1：limit位256 | 当前规则实际含此位，已扫描代码未提供含义 | 学校/供应商字段说明，或正常页面可追溯的明确规则解释 | 不将260标记完整覆盖，不产生ready |
| G-R2：额度与身份资格 | 新官方A1/A2核实校内人员/学术用途及可被限制权限；仍不能用空惩罚列表、一次成功或未解释的数字代替当前资格/额度 | 已确认的规则/额度只读响应、管理方对计数口径与资格限制的说明 | 政策部分补齐，额度及当前资格仍unknown；停止提交 |
| G-R3：研修间维护与取消临界 | 新官方A1证实开始前超过10分钟的取消政策；维护协议、恰好10分钟及已过窗口的服务器判据仍缺 | 对应资源类型的官方说明、正常维护页面/只读样本；不靠制造违约或盲试提交 | 政策部分补齐，不支持未知维护条件；不能只用按钮放行 |

结论：**本轮可获得的补证工作已交付，但以上关键门槛尚未消失，M0整体仍不通过。**“把未知项写成unknown并阻止提交”是当前安全边界，不等于规则已取证完整。不得为了进入M1自行放宽已批准Spec。真实闭环已有样本，不再重复占用资源；获得新的权威规则材料后可继续M0，任何Spec范围调整先交用户确认。

公开辅助资料：[学校Booking用户指南](https://itdid.hkust-gz.edu.cn/web/viewer.html?file=%2Fuploadfile%2F2024%2F03%2F18%2FBooking+System+User+Guide.pdf)支持“选楼层/类型、阅读须知、填表提交、个人中心取消”的正常流程，但该指南不解释位256或额度，不作为缺口替代。未使用清水湾或其他学校的规则填补广州校区证据。

后续权威来源续查见[正式政策与待确认问题](library-booking-phase-2-authorities.md)：沿正常帮助页找到广州校区Study Rooms及Library Study Room Rules，记录正文摘要、适用范围与具体缺口；另核对ITDID当前链接的3页操作手册。三个缺口组仍未整体关闭，不因找到政策页而把服务器行为视为已验证。
