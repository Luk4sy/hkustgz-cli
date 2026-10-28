# 第七模块 Canvas：认证前置记录

日期：2026-10-28（Asia/Shanghai）。用户在实测Portal后授权继续第七模块。当前仅处理认证前置，未实现或启用Canvas业务适配器；四项业务能力仍pending，不进入第八模块。

## 当前观察

- 已有专用profile从本校`https://hkust-gz.instructure.com/login/saml`出发，新的真实跳转到精确来源`https://47277e8d-a0fd-490e-b982-ee46ab1fd96f.sin.login.instructure.com`的`/am/oauth2/alpha/authorize`。原导航保护正确拦截未验证来源。
- 经默认TLS校验直接读取该精确租户的公开HTTPS入口，HTTP200、标题`Log in to Canvas`；它位于已确认的Instructure自有域名层级，且由学校Canvas入口实际重定向。仅加入这一精确来源，不允许其他同级租户，不放开通配域名。不记录authorize中的任何查询值。
- 新登录链期间观察到末次认证检查发生DOM上下文替换，原实现在观察循环结束后直接抛内部错误。现只对已知导航上下文替换返回unknown，不延长观察窗口、不猜authenticated；其他异常仍正常抛出。
- 重复真实冷启动尚未确认本人课程表，最新观察为unknown/空白中间文档。已打开本工具专用可见登录窗口，需要本人完成正常学校认证后重新验证。密码、验证码、Cookie值和原始认证响应不读取、不输出、不保存到仓库。

## 前置门槛

[开发Spec EVID-03](../superpowers/specs/2026-10-26-hkustgz-cli-development-spec.md)要求实验profile冷启动失败时停止该读取路线并记录原因。计划Task7 Step1要求认证前置未通过时保持pending，不开始真实读取实现。因此本次不以合成测试通过、登录页HTTP200或公开文档代替真实业务验收。

[Canvas官方Cookie说明](https://www.instructure.com/policies/canvas-lms-cookie-notice)说明其网页认证和CSRF Cookie用途；[官方OAuth2说明](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)说明API客户端认证。公开文档不是本校对第三方客户端的批准。本阶段仅验证本人正常浏览器会话，不申请个人Token、不创建开发者密钥、不分发secret。独立API分发资格、第二名学生及其他平台仍未验收。

## 回归范围

- 精确租户可沿正常合成登录链回到本人课程页；同级其他租户继续在导航前被拒绝。
- 精确租户出现密码表单时为unauthenticated；同名/其他来源不作信任提升。
- 最后一次认证观察遇上下文替换时为unknown，checkedUrl不含state等查询值。

三项回归均已先在旧实现失败，修复后通过。完整验证结果在最终运行后补充。所有自动浏览器测试均为临时profile/合成页面，不访问学校或触碰用户可见的登录窗口。

## 下一步

本人在专用窗口完成学校认证后，关闭、重开并核实本人课程读取；随后再核实作业个人有效截止日期、提交与完成标记、公告和Planner分页等源语义，达到证据门槛后才进入适配器TDD。不会把Planner可见条目宣称为全部作业。

最终前置修复验证：179/179项测试通过（含47项隔离Chrome），构建、类型检查通过。第七模块Step1仍待真实认证完成，不将此测试结果标为业务功能已完成。
