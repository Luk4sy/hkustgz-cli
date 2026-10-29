# Git 阶段记录

记录日期：2026-10-27（Asia/Shanghai）。当前工作分支为 `feat/cli-foundation`，尚未配置远程仓库。GitHub 建仓和首次推送留待后续进行。

## 已验收节点

以下为开发验收标签，不是发布版本；标签指向各模块通过审查的实现提交。

| 本地标签 | 提交 | 已验收范围 |
|---|---|---|
| `milestone/module-1-accepted` | `3681ae2` | CLI 基础、参数、输出与能力门禁 |
| `milestone/module-2-accepted` | `c3bafa6` | 专用浏览器会话、认证、锁与中断清理 |
| `milestone/module-3-accepted` | `32f0bab` | 查询预算、分页、部分结果、日期与脱敏 |
| `milestone/module-4-accepted` | `7b5c559` | Catalog 搜索、详情与目标学期数据完整性 |
| `milestone/module-5-accepted` | `d708ac5` | SIS 学期、本人计划课表、今日课程和延迟选项修复 |

`e4c8753` 记录第四模块的用户验收。验收细节及当时的测试结果以 `docs/acceptance/` 中各模块记录为准；这些历史记录不代表后来重新运行过测试。

目前 5/9 个开发模块已验收，Task 6 Portal 已实现待审。Catalog 两项、SIS 三项和 Portal 四项共9项能力可调用，其他10项 pending。Portal公告全分类当前partial8条、外部正文不支持；第六模块未验收，不创建其验收标签；用户于2026-10-28授权继续Task7，第七模块四项Canvas读取已实现待用户审查，未进入第八模块；Canvas个人截止/提交证据缺失时unknown、Planner范围明确。Task 0取证随模块推进。包仍为本地alpha，尚未发布。

## 后续提交约定

- 实现、修复、文档分别使用 `feat:`、`fix:`、`docs:` 等前缀，提交说明写清具体变化。
- 每个模块完成后停下来接受用户审查；修复单独提交，通过验收后再添加对应的附注标签。
- 保留现有实现与修复历史。改写已共享历史、合并分支及发布另按当时授权执行。
- `.superpowers/` 为忽略的本地执行记录；长期设计、计划和验收依据保存在已跟踪的 `docs/`。
- 登录 profile、Cookie、票据、原始认证响应及本地运行数据不加入版本控制。默认 profile 位于项目外的 `~/.hkustgz-cli`；项目内 `.hkustgz-cli/` 已被忽略。

## 常用查看命令

```bash
git status --short --branch
git log --oneline --decorate --graph -20
git tag --list 'milestone/*'
git show milestone/module-4-accepted
git diff milestone/module-3-accepted milestone/module-4-accepted --stat
```

本地 Git 提交和标签不是异地备份。后续建立 GitHub 仓库时，再核对公开范围、许可证、已跟踪文件及远程地址，并推送选定分支与验收标签。
