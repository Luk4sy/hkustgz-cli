import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
import {COMMANDS} from '../src/cli/commands.js';
import {DEFAULT_CAPABILITIES} from '../src/core/capabilities.js';
import {readBundleInfo} from '../src/cli/skill/bundle.js';
import {installSkill} from '../src/cli/skill/install.js';
import {resolveSkillTarget} from '../src/cli/skill/paths.js';
import {queryMeta} from './fixtures.js';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const read=(path:string)=>fs.readFileSync(new URL('../skills/hkustgz-cli/'+path,import.meta.url),'utf8');
test('skill_matches_installed_cli and every documented example parses as a real command',async()=>{
 const bundle=await readBundleInfo(),skill=read('SKILL.md');assert.equal(skill.match(/^  version: (.+)$/m)?.[1],bundle.version);assert.equal(skill.match(/^  compatible_cli: (.+)$/m)?.[1],bundle.version);assert.match(skill,/^  schemaVersion: '1'$/m);
 assert.ok(fs.existsSync(new URL('../skills/hkustgz-cli/references/examples.md',import.meta.url)),'missing examples reference');
 const examples=JSON.parse(read('references/examples.md').match(/```json\n([\s\S]*?)\n```/)![1]!) as Array<{argv:string[];kind:string}>;
 for(const example of examples){
  const def=[...COMMANDS].sort((a,b)=>b.path.length-a.path.length).find(d=>d.path.split(' ').every((part,i)=>example.argv[i]===part));assert.ok(def,example.argv.join(' '));
  let calls=0;const control={ok:true as const,data:{},meta:{schemaVersion:'1' as const,command:def.path}};
  const query={ok:true as const,data:{items:[]},meta:{...queryMeta(),command:def.path,service:def.service!,recordsRead:0,returnedCount:0}};
  const key=def.capabilityId??def.path.replace(' ','.');
  const result=await executeCommand(example.argv,{sessionRunner:async()=>{throw Error('no live browser');},handlers:{[key]:async()=>{calls++;return def.capabilityId?query:control;}}});
  if(def.capabilityId&&DEFAULT_CAPABILITIES.find(c=>c.id===def.capabilityId)?.state==='pending'){assert.equal(result.exitCode,8);assert.equal(calls,0);}else{assert.equal(result.exitCode,0,example.argv.join(' ')+result.stdout);assert.equal(calls,def.path==='capabilities'?0:1);}
 }
});
test('pending_commands_are_not_promoted and generated reference matches runtime capabilities',()=>{
 assert.ok(fs.existsSync(new URL('../skills/hkustgz-cli/references/commands.md',import.meta.url)),'missing generated commands');
 const rows=read('references/commands.md').split('\n').filter(line=>line.startsWith('| `')).map(line=>line.split('|').slice(1,-1).map(v=>v.trim()));
 assert.equal(rows.length,COMMANDS.length);
 for(const def of COMMANDS){const row=rows.find(r=>r[0]===`\`${def.path}\``);assert.ok(row,def.path);if(def.capabilityId)assert.equal(row[1],DEFAULT_CAPABILITIES.find(c=>c.id===def.capabilityId)!.state);}
 assert.equal(rows.filter(r=>r[1]==='verified').length,13);assert.equal(rows.filter(r=>r[1]==='pending'&&r[0]?.startsWith('`browser')===false).length,6);
});
test('references_ship_in_same_bundle and owned installation includes every reference',async()=>{
 const bundle=await readBundleInfo();for(const file of ['SKILL.md','references/commands.md','references/errors.md','references/examples.md','references/privacy.md'])assert.ok(bundle.files.includes(file),file);
 const root=fs.mkdtempSync(join(tmpdir(),'skill-contract-'));try{const target=resolveSkillTarget({dir:root},{});await installSkill(target,bundle,{dryRun:false});for(const file of bundle.files)assert.equal(fs.readFileSync(join(target.destination,file),'utf8'),read(file));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('synthetic planner partial and unknown survive CLI boundary without a live school request',async()=>{
 const result=await executeCommand(['canvas','agenda'],{handlers:{'canvas.agenda':async()=>({ok:false,data:{scope:'planner',items:[{id:'synthetic',markedComplete:true,submissionStatus:'unknown',dueAt:null}]},error:{code:'PARTIAL_RESULT',message:'Incomplete',retryable:false,remediation:'Inspect coverage'},meta:{...queryMeta(),command:'canvas agenda',service:'canvas',coverage:'partial',truncationReason:'page_cap'}})}});
 assert.equal(result.exitCode,7);const value=JSON.parse(result.stdout);assert.equal(value.data.scope,'planner');assert.equal(value.data.items[0].submissionStatus,'unknown');assert.equal(value.data.items[0].markedComplete,true);assert.equal(value.meta.truncationReason,'page_cap');
});
