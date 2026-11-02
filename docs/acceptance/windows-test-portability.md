# Windows 三类测试修复与完整CI交付

日期：2026-11-02。状态：本轮实现待用户审查；不推送，不宣称新的Windows CI已经通过。

## 输入证据与范围

用户提供同学的2026-11-02更新验证报告：Windows NT 10.0.26300、Node24.22.1、npm11.6.2，源码提交8e2390f9b63c4706b8882e3e4b618545e10d723c，CLI/Skill从alpha.2升级为alpha.4，status=current。报告记载本人学校会话下四项Booking查询成功，目录8项/房间59个；原默认套件445项中332通过、14失败、99跳过，另跑42项图书馆Chrome合成测试通过。该报告是同学现场证据，不是本机重做，不保留安装路径、用户名或私人业务正文，也不把未执行场景算成通过。

本轮用户要求修复14项失败对应的三类问题，并补全Windows CI；停止让用户审查，先不推送。范围是测试夹具和CI，未实施图书馆规则Spec的新提案，也未修改产品代码、能力状态、CLI/Skill版本、候选包或日常安装。

计划：[Windows测试可移植性计划](../superpowers/plans/2026-11-02-windows-test-portability-plan.md)。

## 修复

### 日期：5项

`booking-operation-cli.test.ts`的预约固定为2026-11-02 09:00，当前真实时钟已过该时间，输入校验正确拒绝，测试提前失败。本机原样复现9项中5失败/4通过。

每个用例通过node:test仅固定Date到2026-11-01，afterEach恢复；同时覆盖deps.now业务校验和workflow绝对截止检查。真实setTimeout、I/O、系统时钟及其他测试进程不改。没有只把预约日期往后挪，也没有绕过产品过去时间校验。原9项用例恢复通过。

### 符号链接：6项

- 3个目录链接场景（操作存储祖先、数据根、logout外部profile）在Windows使用原生junction，仍实际验证产品拒绝链接、不改外部文件；不因无文件symlink权限而跳过。
- 3个真正文件symlink场景（操作key、doctor的JSON/table配置）通过`createTestSymlink`只包裹测试材料创建。仅Windows文件链接创建报EPERM/EACCES时，非严格环境明确skip该独立用例；产品断言在帮助函数之外，不捕获产品失败。
- CI设置`HKUSTGZ_REQUIRE_SYMLINK_TESTS=1`，权限不足直接失败，不算通过也不跳过。其他平台、目录创建或其他错误始终失败。无需在同学电脑以管理员运行或修改安全设置。
- 5项帮助函数策略测试覆盖两种权限错误的明确skip、strict失败、非权限/目录/POSIX错误不吞、CI环境变量默认生效。模拟错误仅验证测试辅助策略，不冒充Windows文件系统实测。

### 路径：3项及启用全量后的同类2处

Booking、Portal、SIS默认handler用例改为`tmpdir()+join()+随机名称`，保持测试根尚未创建及原LOGIN_REQUIRED/调用次数断言。扩大全量Chrome覆盖时，另发现Canvas browser同类两处POSIX根也会在Windows提前失败，一并修正。未放宽产品Windows路径校验。

## Windows CI

`.github/workflows/ci.yml`的Windows job从指定5个文件扩展为原生`npm test`完整套件，启用`HKUSTGZ_TEST_BROWSER=1`及严格文件链接模式；保留构建、typecheck、离线升级元数据准备和独立Windows Chrome loopback smoke，新增差异检查，job预算35分钟。

完整套件包括既有的所有Chrome/会话/操作状态/路径/Skill/打包升级测试。Chrome测试以拦截合成页面或loopback运行，不使用学校账号。Windows上专用于验证“非Windows拒绝”的用例仍会按平台正常跳过；不能用这个有意排除的场景冒充Windows验证。缺文件链接权限不能靠skip过CI，托管runner权限不足时必须如实失败后处理。

本轮遵守不推送，因此没有触发远端Windows job。本机macOS的严格模式通过不能代替Windows真实执行；之后经用户授权推送，再以远端结果更新验收。

## 验证记录

- RED：原日期文件9项中5失败、4通过；帮助函数新增前模块不存在，随后策略用例验证真实分支。
- GREEN：针对性9个测试文件53/53通过；随后新增CI环境变量策略用例单文件5/5通过。
- 最终完整命令：`HKUSTGZ_TEST_BROWSER=1 HKUSTGZ_REQUIRE_SYMLINK_TESTS=1 npm test`，包含pretest构建，**450/450通过，0失败/取消/跳过**，约152秒；本机为macOS/Node24.20.0/Chrome。
- `npm run typecheck`、`actionlint .github/workflows/ci.yml`、`git diff --check`通过。
- 一次独立内部检查未发现可确认缺陷；补跑严格时钟/链接策略14项通过。这不替代用户审查，也不计入450之外的新增覆盖。
- 文档本地链接检查通过，最终只涉及测试、CI及对应说明。Windows远端全套尚未执行，日常安装/候选包未更新；完成后停下，不推送。
