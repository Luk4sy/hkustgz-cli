import {writeFileSync} from 'node:fs';
import {COMMANDS} from '../dist/cli/commands.js';
import {DEFAULT_CAPABILITIES} from '../dist/core/capabilities.js';
const rows=COMMANDS.map(command=>{
 const state=command.capabilityId?DEFAULT_CAPABILITIES.find(c=>c.id===command.capabilityId)?.state:command.path==='browser install'?'pending':'control';
 const args=[...(command.args??[]).map(arg=>arg.syntax),...(command.options??[]).map(option=>option.flags),...command.limit?['--limit <n>']:[],...command.headed?['--headed']:[],...command.refresh?['--refresh']:[],'--format <json|table>'].join(' ').replaceAll('|','/');
 return `| \`${command.path}\` | ${state} | \`${args}\` |`;
});
writeFileSync(new URL('../skills/hkustgz-cli/references/commands.md',import.meta.url),`# 命令参考\n\n<!-- Generated from COMMANDS and DEFAULT_CAPABILITIES; edit source definitions, not rows. -->\n\n状态以本机运行hkustgz-cli capabilities为准；verified指已核实读取路线，不保证全量覆盖或任意账号权限。control不是校园查询能力，pending不能向用户承诺可用。\n\n| 命令 | 状态 | 参数与选项 |\n| --- | --- | --- |\n${rows.join('\n')}\n\n命令参数使用上一条结果返回的ID。Canvas课程来自canvas courses；SIS学期来自sis terms；公告详情使用source:id。不传任意URL，不猜接口。每次只运行一个浏览器命令。\n`);
