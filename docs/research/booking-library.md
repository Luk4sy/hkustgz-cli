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
