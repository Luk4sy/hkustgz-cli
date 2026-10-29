# 命令参考

<!-- Generated from COMMANDS and DEFAULT_CAPABILITIES; edit source definitions, not rows. -->

状态以本机运行hkustgz-cli capabilities为准；verified指已核实读取路线，不保证全量覆盖或任意账号权限。control不是校园查询能力，pending不能向用户承诺可用。

| 命令 | 状态 | 参数与选项 |
| --- | --- | --- |
| `skill path` | control | `--target <target> --dir <path> --format <json/table>` |
| `skill status` | control | `--target <target> --dir <path> --format <json/table>` |
| `skill install` | control | `--target <target> --dir <path> --dry-run --format <json/table>` |
| `skill uninstall` | control | `--target <target> --dir <path> --dry-run --format <json/table>` |
| `doctor` | control | `--format <json/table>` |
| `capabilities` | control | `--format <json/table>` |
| `auth login` | control | `<service> --format <json/table>` |
| `auth status` | control | `[service] --all --format <json/table>` |
| `auth logout` | control | `--format <json/table>` |
| `browser status` | control | `--format <json/table>` |
| `browser use` | control | `<browser> --format <json/table>` |
| `browser install` | pending | `<browser> --format <json/table>` |
| `portal apps` | verified | `--headed --format <json/table>` |
| `portal notices` | verified | `--query <text> --limit <n> --headed --format <json/table>` |
| `portal notice` | verified | `<id> --headed --format <json/table>` |
| `portal agenda` | verified | `--from <date> --to <date> --headed --format <json/table>` |
| `sis terms` | verified | `--headed --format <json/table>` |
| `sis timetable` | verified | `--term <id> --headed --format <json/table>` |
| `sis today` | verified | `--term <id> --date <date> --headed --format <json/table>` |
| `sis history` | pending | `--term <id> --headed --format <json/table>` |
| `sis grades` | pending | `--term <id> --headed --format <json/table>` |
| `catalog search` | verified | `<text> --term <id> --limit <n> --headed --refresh --format <json/table>` |
| `catalog course` | verified | `<id> --term <id> --headed --refresh --format <json/table>` |
| `canvas courses` | verified | `--limit <n> --headed --format <json/table>` |
| `canvas announcements` | verified | `--course <id> --limit <n> --headed --format <json/table>` |
| `canvas assignments` | verified | `--course <id> --limit <n> --headed --format <json/table>` |
| `canvas agenda` | verified | `--from <date> --to <date> --headed --format <json/table>` |
| `booking providers` | pending | `--headed --format <json/table>` |
| `booking rooms` | pending | `--provider <provider> --floor <id> --limit <n> --headed --format <json/table>` |
| `booking availability` | pending | `--provider <provider> --room <id> --date <date> --headed --format <json/table>` |
| `booking mine` | pending | `--provider <provider> --from <date> --to <date> --limit <n> --headed --format <json/table>` |

命令参数使用上一条结果返回的ID。Canvas课程来自canvas courses；SIS学期来自sis terms；公告详情使用source:id。不传任意URL，不猜接口。每次只运行一个浏览器命令。
