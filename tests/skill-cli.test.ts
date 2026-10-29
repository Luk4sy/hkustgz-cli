import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
test('skill controls use isolated Codex home without browser or configuration changes',async()=>{
 const root=fs.mkdtempSync(join(tmpdir(),'skill-cli-'));const env={CODEX_HOME:join(root,'codex')};try{
 const run=(args:string[])=>executeCommand(['skill',...args],{env,sessionRunner:async()=>{throw Error('no browser');}});
 assert.equal((await run(['status'])).exitCode,0);assert.equal(fs.existsSync(env.CODEX_HOME),false);
 assert.equal((await run(['install','--dry-run'])).exitCode,0);assert.equal(fs.existsSync(env.CODEX_HOME),false);
 assert.equal((await run(['install','--target','codex'])).exitCode,0);
 assert.equal(JSON.parse((await run(['status'])).stdout).data.state,'current');
 for(const format of ['json','table']){
 fs.writeFileSync(join(env.CODEX_HOME,'skills/hkustgz-cli/SKILL.md'),'edit');const result=await run(['uninstall','--format',format]);assert.equal(result.exitCode,8);assert.match(result.stdout,/SKILL_CONFLICT/);assert.match(result.stdout,/SKILL.md/);assert.ok(!result.stdout.includes(root));
 }
 assert.equal((await run(['path'])).exitCode,0);
 assert.equal((await run(['install','--target','codex','--dir',root])).exitCode,2);
 assert.equal((await run(['install','--dir','relative'])).exitCode,2);
 assert.equal((await run(['install','--target','other'])).exitCode,2);
 assert.equal(fs.existsSync(join(env.CODEX_HOME,'config.toml')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('conflict details preserve relative Unicode names while arbitrary details never escape',async()=>{
 const root=fs.mkdtempSync(join(tmpdir(),'skill-cli-'));try{
 const env={CODEX_HOME:join(root,'codex')};await executeCommand(['skill','install'],{env});fs.writeFileSync(join(env.CODEX_HOME,'skills/hkustgz-cli/我的笔记.md'),'keep');
 const result=await executeCommand(['skill','uninstall'],{env});assert.equal(result.exitCode,8);assert.ok(JSON.parse(result.stdout).error.details.preserved.includes('我的笔记.md'));
 const {classifyError,CliFailure}=await import('../src/core/errors.js');assert.equal(classifyError(new CliFailure('INTERNAL_ERROR',undefined,{secret:'must not escape'})).error.details,undefined);assert.equal(classifyError(new CliFailure('SKILL_CONFLICT',undefined,{secret:'must not escape'})).error.details,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
