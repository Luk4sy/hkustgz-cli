import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import type {BrowserContext} from 'playwright';
import {resolveDataPaths} from '../src/session/paths.js';
import {acquireProfileLock} from '../src/session/lock.js';
import {createSessionRunner} from '../src/session/browser.js';
const options=()=>({browser:'chrome' as const,headless:true,deadlineMs:Date.now()+5000,purpose:'query' as const});
async function setup(t:{after:(fn:()=>Promise<void>)=>void}, close:()=>Promise<void>){
 const root=await mkdtemp(join(tmpdir(),'hkust-session-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths=resolveDataPaths({HKUSTGZ_CLI_HOME:root});const signals=new EventEmitter();
 const cdp=Object.assign(new EventEmitter(),{send:async()=>({frameTree:{frame:{id:'synthetic-frame'}}})});
 const context={newPage:async()=>({}),close,route:async()=>{},newCDPSession:async()=>cdp} as unknown as BrowserContext;
 const runner=createSessionRunner(paths,{launch:async()=>context,signals});return{runner,paths,signals};
}
test('callback error closes owned context exactly once and releases its profile',async t=>{
 let closed=0;const {runner,paths}=await setup(t,async()=>{closed++;});
 await assert.rejects(runner('sis',options(),async()=>{throw new Error('callback failure');}),/callback failure/);
 assert.equal(closed,1);const lock=await acquireProfileLock(join(paths.profile,'chrome'));await lock.release();
});
test('deadline closes context, aborts callback signal, and releases lock',async t=>{
 let closed=0;let aborted=false;const {runner,paths}=await setup(t,async()=>{closed++;});
 await assert.rejects(runner('sis',{...options(),deadlineMs:Date.now()+100},async s=>{s.signal?.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});}),{code:'QUERY_TIMEOUT'});
 assert.equal(closed,1);assert.equal(aborted,true);const lock=await acquireProfileLock(join(paths.profile,'chrome'));await lock.release();
});
for(const [signal,code] of [['SIGINT','INTERRUPTED'],['SIGTERM','TERMINATED']])test(`${signal} cleans up and removes listeners`,async t=>{
 let closed=0;const {runner,paths,signals}=await setup(t,async()=>{closed++;});
 await assert.rejects(runner('sis',options(),async()=>{signals.emit(signal!);return new Promise(()=>{});}),{code:code!});
 assert.equal(closed,1);assert.equal(signals.listenerCount(signal!),0);const lock=await acquireProfileLock(join(paths.profile,'chrome'));await lock.release();
});
test('failed browser cleanup is reported with original failure and lock retained',async t=>{
 const {runner,paths}=await setup(t,async()=>{throw new Error('private browser detail');});
 await assert.rejects(runner('sis',options(),async()=>{throw new Error('private callback detail');}),e=>{
  assert.equal((e as {code:string}).code,'CLEANUP_FAILED');assert.match((e as {remediation:string}).remediation,/INTERNAL_ERROR/);assert.doesNotMatch(String(e),/private/);return true;
 });await assert.rejects(acquireProfileLock(join(paths.profile,'chrome')),{code:'PROFILE_BUSY'});
});
test('a browser close that never settles is bounded and retains the lock',{timeout:6500},async t=>{
 const {runner,paths}=await setup(t,async()=>new Promise(()=>{}));
 await assert.rejects(runner('sis',options(),async()=>1),{code:'CLEANUP_FAILED'});
 await assert.rejects(acquireProfileLock(join(paths.profile,'chrome')),{code:'PROFILE_BUSY'});
});
test('a signal during page setup preserves the signal result instead of a closed-page error',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-setup-signal-'));t.after(()=>rm(root,{recursive:true,force:true}));const signals=new EventEmitter();let closed=0;
 const context={route:async()=>{},newPage:async()=>{signals.emit('SIGINT');throw new Error('Target closed private detail');},close:async()=>{closed++;}} as unknown as BrowserContext;
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}),{signals,launch:async()=>context});
 await assert.rejects(runner('sis',options(),async()=>{throw new Error('callback must not run');}),{code:'INTERRUPTED'});assert.equal(closed,1);
});
test('failed cleanup retains the classified network cause without exposing raw details',async t=>{
 const {runner}=await setup(t,async()=>{throw new Error('private-close-marker');});
 await assert.rejects(runner('sis',options(),async()=>{throw new Error('page.goto: net::ERR_CONNECTION_REFUSED private-network-marker');}),e=>{
  assert.equal((e as {code:string}).code,'CLEANUP_FAILED');assert.match((e as {remediation:string}).remediation,/NETWORK_REQUIRED/);assert.doesNotMatch(JSON.stringify(e),/private-/);return true;
 });
});
for(const [signal,code,exitCode] of [['SIGINT','INTERRUPTED',130],['SIGTERM','TERMINATED',143]] as const)test(`${signal} during cleanup waits for close, releases lock and preserves interruption`,async t=>{
 let closed=0;let handlerPresent=false;
 const {runner,paths,signals}=await setup(t,async()=>{
  closed++;handlerPresent=signals.emit(signal);await Promise.resolve();
 });
 await assert.rejects(runner('sis',options(),async()=>42),{code});
 assert.equal(handlerPresent,true);assert.equal(closed,1);assert.equal(signals.listenerCount(signal),0);
 const {classifyError,CliFailure}=await import('../src/core/errors.js');assert.equal(classifyError(new CliFailure(code)).exitCode,exitCode);
 const next=await acquireProfileLock(join(paths.profile,'chrome'));await next.release();
});
