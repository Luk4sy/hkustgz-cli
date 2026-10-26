import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm,access,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {executeCommand} from '../src/cli/main.js';
import {claimDirectory,ensureDataPaths,resolveDataPaths} from '../src/session/paths.js';
import {acquireProfileLock} from '../src/session/lock.js';
const noSession=async()=>{throw new Error('Unexpected browser launch');};
test('browser selection is persistent and status never launches a browser',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-controls-'));t.after(()=>rm(root,{recursive:true,force:true}));const env={HKUSTGZ_CLI_HOME:root};
 const initial=await executeCommand(['browser','status'],{env,sessionRunner:noSession});assert.equal(initial.exitCode,0,initial.stdout);
 const result=await executeCommand(['browser','use','edge'],{env,sessionRunner:noSession});assert.equal(result.exitCode,0,result.stdout);
 const status=await executeCommand(['browser','status'],{env,sessionRunner:noSession});assert.equal(status.exitCode,0);assert.equal(JSON.parse(status.stdout).data.selected,'edge');
});
test('unverified auth services remain unknown without browser or data writes',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'hkust-unknown-'));t.after(()=>rm(parent,{recursive:true,force:true}));const root=join(parent,'not-created');
 const status=await executeCommand(['auth','status','booking-library'],{env:{HKUSTGZ_CLI_HOME:root},sessionRunner:noSession});
 assert.equal(status.exitCode,0,status.stdout);assert.equal(JSON.parse(status.stdout).data.items[0].state,'unknown');await assert.rejects(access(root));
});
test('auth login uses a visible session and login budget; status uses query budget',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'hkust-budget-'));t.after(()=>rm(parent,{recursive:true,force:true}));const env={HKUSTGZ_CLI_HOME:join(parent,'home')};
 for(const command of ['login','status']){
  const before=Date.now();const calls:unknown[]=[];
  const result=await executeCommand(['auth',command,'sis'],{env,sessionRunner:async(service,options)=>{
   calls.push(options);assert.equal(service,'sis');assert.equal(options.headless,command==='status');assert.equal(options.purpose,command==='login'?'login':'query');
   assert.ok(options.deadlineMs-before>=(command==='login'?599000:89000));assert.ok(options.deadlineMs-before<=(command==='login'?601000:91000));
   return {service:'sis',state:'authenticated',checkedAt:'2026-10-27T00:00:00+08:00',checkedUrl:'https://sisn.hkust-gz.edu.cn/system/my-calendar',reason:'Synthetic session boundary'} as never;
  }});assert.equal(result.exitCode,0,result.stdout);assert.equal(calls.length,1);
 }
});
test('logout refuses busy and foreign profiles, then clears only owned browser data',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-logout-'));t.after(()=>rm(root,{recursive:true,force:true}));const paths=resolveDataPaths({HKUSTGZ_CLI_HOME:join(root,'owned')});await ensureDataPaths(paths);
 const chrome=join(paths.profile,'chrome');await claimDirectory(chrome);await writeFile(join(chrome,'synthetic-cookie'),'secret');
 const lock=await acquireProfileLock(chrome);const env={HKUSTGZ_CLI_HOME:paths.root};
 assert.equal((await executeCommand(['auth','logout'],{env})).exitCode,9);assert.equal(await readFile(join(chrome,'synthetic-cookie'),'utf8'),'secret');await lock.release();
 const foreign=join(root,'personal');await mkdir(foreign);await writeFile(join(foreign,'keep'),'keep');await symlink(foreign,join(paths.profile,'edge'));
 assert.equal((await executeCommand(['auth','logout'],{env})).exitCode,2);assert.equal(await readFile(join(chrome,'synthetic-cookie'),'utf8'),'secret');await rm(join(paths.profile,'edge'));
 const result=await executeCommand(['auth','logout'],{env});assert.equal(result.exitCode,0,result.stdout);await assert.rejects(access(chrome));assert.equal(await readFile(join(foreign,'keep'),'utf8'),'keep');assert.equal(JSON.parse(result.stdout).data.schoolSessionsRevoked,false);
});
