# Booking / Library 读取证据（研究中）

证据编号：R0-LIBRARY-20261026。观察日期：2026-10-26，Asia/Shanghai。产品能力均 pending。

## 入口与正常操作

Booking 入口 `https://booking.hkust-gz.edu.cn/front_page`；未登录页仍能显示分类，并提示“您还未登录/去登录”，因此分类可见不是已认证依据。图书馆入口 `https://libroombooking.hkust-gz.edu.cn/#/ic/home`。

在调研浏览器中选择 Lib_3rd Floo...，进入 `#/ic/researchSpace/2/2`。分页显示共19条，默认10条/页；点击第2页返回9条，下一页按钮 disabled。已实际对照10+9=19，未将第一页当作全楼。

## 房间、开放与占用

UI 自身发出 GET `/ic-web/reserve`，参数名称 sysKind、resvDates、page、pageSize、labIds、kindId。成功样本 HTTP 200、code 数字0、count=19、data 数组。

候选字段映射：devId 为设备/空间候选 ID，devName 为显示名，labId/labName 为楼层候选，minUser/maxUser 为人数限制，roomId/roomName 为房间字段；这些实体层次仍需核实，不能把 devId 与 roomId 混用。openStart/openEnd、openTimes[].openStartTime/openEndTime/openLimit、resvRule、resvInfo、maintenanceTime、timeScopeOpenInfo 等同时存在。样本开放为08:00–23:00，但不是全系统固定规则。

本次两页 resvInfo 均为空；没有取得占用起止的非空样本，不能从空时间轴宣布可订。resvRule 含提前预约、时长、优先级、限制等字段，规则含义未验证。

## 本人记录

点击“个人中心”进入 `#/ic/userinfo`，可见个人信息及预约表，表头预约编号、预约对象、预约时间、状态、操作。观察到 GET `/ic-web/reserve/count` 与 `/ic-web/reserve/resvInfo`，后者参数 beginDate、endDate、needStatus、page、pageNum、orderKey、orderModel；样本 data 为空。未验证业务 code、完整空结果/认证判据或有记录分页，不据此宣称本人没有预约。

未保存姓名、预约主题、个人编号、认证参数值；未点击空闲格、建立草稿、预约、取消或签到。

## 未通过项

专用 profile 认证和冷启动未通过正向验收；其他预约供应商均未验证。占用边界、时区、开闭馆/规则的组合语义、真实本人记录字段尚缺。候选读取路线为响应监听；当前只能交付研究结果，不启用 availability 或 mine。

## 2026-10-30 第八模块补证

新证据编号 R8-LIBRARY-20261030，范围为本人 macOS/Chrome 专用 profile 的只读查询。正常访问 home 时先观察 auth/userInfo code=300，随后沿学校已有 SSO 返回 code=0 且有用户对象；关闭重开后在独立进程再次通过。只判断 logonName 是否存在，不输出或保存其值、账号、token、Cookie。新增读取没有改变现有 auth status 判据，因此 booking/booking-library 的控制状态仍为 unknown；需要交互认证时先运行已支持的 auth login portal 完成学校 SSO，再重试查询。

### 分类

Booking front_page 未登录也显示8张分类卡片。DOM 选择器为 li 内 class 包含 _mask_title_ 的文本及同一卡片 img.src；公开 index-ec56497d.js 中的图片标识、生产入口和内部类别跳转用于有限映射。图书馆入口已验证；体育、学术交流、访客、嗨呗、创客和疗愈等仅列入口并保持 pending，不导航或查询这些供应商。内部类别仍链接门户入口，不声称能直接定位分类。只表示当前页面可见目录，角色不同可能隐藏更多类别；未登录分类可见不证明认证。

### 楼层与房间

GET /ic-web/roomMenu，code=0、data 数组，每项 id/name/spanDay；实测4个楼层。正常导航三楼为 #/ic/researchSpace/2/2；其他楼层同一正常菜单生成 #/ic/researchSpace/2/<floorId>，实际四楼层读取均完成。页面 .tabBox.__vue__ 的 getReserve 是已观察的只读 GET 包装：由 activeName、pageData.page/pageNum、楼层 props、formModel 筛选生成 /ic-web/reserve。CLI 调用该正常页面方法，不提取或重放认证头。

每次响应绑定请求 sysKind=1、labIds、resvDates=YYYYMMDD、page、pageSize=10、kindId 空筛选。code=0、count 非负整数及 data 数组为成功判据；按 count 校验每页条数和结束、楼层名/ID、同楼总数稳定及设备ID不重复。三楼10+9=19、全4楼8页共59项。列表 ID 使用 devId，不能换成 roomId；maxUser 为容量上限，kindName 为类型，缺失为 null。没有提供 --floor 时扫描本次 roomMenu 全集，受公共20页/2000条上限；后页异常保留可信子集并 partial。

### 时间与限制

正常UI点击10-31标签，activeName=2026/10/31，仍显示三楼19项。getReserve 由 activeName 生成 resvDates。openTimes 提供开闭时间和 openLimit；resvInfo 非空时提供毫秒时间戳 startTime/endTime 和 resvStatus。时间轴公开 initData 将 (128 & resvStatus)>0 视为已结束并过滤，其他占用保留；CLI同样处理，交叠/相接区间合并并裁剪到上海时区目标日 [00:00,次日00:00)。只保留时间/状态，剔除他人姓名、主题和其他预约详情。

真实编译适配器指定当日房间读取：开放08:00–23:00且观察到非空占用，并与正常页面所用同一响应投影对照。不能据此证明所有规则、维护或本人资格：维护、临时关闭、openLimit、提前天数、人数/时长等组合语义尚不完整。因此 availability 明示 rulesCoverage=unknown、availableIntervals=[]、unknownIntervals 覆盖目标整天，并提供开放、有效占用及限制说明。coverage=complete 仅表示指定范围的读取完整，不表示所有时段可订。没有点击时间格、建草稿、预约、取消或签到。

### 本人记录

正常个人中心 #/ic/userinfo 发出 GET /ic-web/reserve/resvInfo。页面 initTable 调用 searchDate；参数 beginDate、endDate（UI含当天）、needStatus、page、pageNum、orderKey、orderModel。默认勾选值为2、4、256、8192，总和8454；状态表显示未开始、已开始、待审核、待同意。因此保留 needStatus=8454，不能把查询称为全部历史。CLI 的 [from,to) 转成源 beginDate=from、endDate=to前一天；pageNum=10、gmt_create/desc，不更改学校状态。

已观察非空 code=0、count=1、data 一项。字段 resvId 为编号、resvBeginTime/resvEndTime 为毫秒时间、resvStatus 为位掩码，resvDevInfoList 含 devId/devName。只输出编号、设备列表、起止与原始 statusCode；不解读未知组合，不输出 appAccNo、成员、姓名、备注。count=0/data=[] 仅在同样认证/范围成功判据下为已确认空；页面 reserve/count 并非本次列表总量，不使用它判断为空。合成测试覆盖多页、空、鉴权失败；真实仅证明当前角色及已有一项，未取得真实多页本人记录。
