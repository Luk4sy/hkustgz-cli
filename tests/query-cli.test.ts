import assert from 'node:assert/strict';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
import {queryMeta} from './fixtures.js';
import {collectPages,buildQueryResult} from '../src/core/query.js';
import {createQueryPolicy} from '../src/core/policy.js';
import {createSessionRunner} from '../src/session/browser.js';
import {resolveDataPaths} from '../src/session/paths.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {EventEmitter} from 'node:events';
import type {BrowserContext} from 'playwright';
import type {PageBatch} from '../src/core/contracts.js';
const now=Date.parse('2026-10-26T16:05:00Z');
test('invalid date arguments are rejected before a pending capability gate',async()=>{
 for(const argv of [['portal','agenda','--from','2026-02-30'],['sis','today','--date','2026-02-30'],['booking','availability','--provider','library','--room','42','--date','2026-02-30'],['canvas','agenda','--from','2026-01-01','--to','2026-02-02']]){
  const result=await executeCommand(argv,{now:()=>now});assert.equal(result.exitCode,2,argv.join(' '));
 }
});
test('future query handlers receive school date defaults and one shared 90-second deadline',async()=>{
 const result=await executeCommand(['portal','agenda'],{now:()=>now,capabilities:[{id:'portal.agenda',service:'portal',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'portal.agenda':async args=>{
  assert.equal(args.from,'2026-10-27');assert.equal(args.to,'2026-11-03');assert.equal(args.deadlineMs,now+90000);
  return{ok:true,data:{items:[]},meta:{...queryMeta(),command:'portal agenda',service:'portal'}};
 }}});assert.equal(result.exitCode,0,result.stdout);
});
test('collected partial results retain coverage and exit 7 at the actual CLI boundary',async()=>{
 let time=0;const options={refresh:false,deadlineMs:90000,limit:1};
 const collected=await collectPages({readPage:async()=>({items:[1,2],next:null,exhausted:true,emptyConfirmed:false})},options,createQueryPolicy(90000,{now:()=>time,sleep:async ms=>{time+=ms;}}));
 const result=await executeCommand(['catalog','search','Synthetic'],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>buildQueryResult(collected,queryMeta())}});
 assert.equal(result.exitCode,7);const payload=JSON.parse(result.stdout);assert.equal(payload.error.code,'PARTIAL_RESULT');assert.equal(payload.meta.truncationReason,'limit');assert.equal(payload.meta.returnedCount,1);assert.equal(payload.meta.recordsRead,2);
});
test('partial query data is returned before a session with the same hard deadline closes',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-query-deadline-'));t.after(()=>rm(root,{recursive:true,force:true}));let closed=0;let reads=0;
 const cdp=Object.assign(new EventEmitter(),{send:async()=>({frameTree:{frame:{id:'synthetic-frame'}}})});
 const context={newPage:async()=>({}),close:async()=>{closed++;},route:async()=>{},newCDPSession:async()=>cdp} as unknown as BrowserContext;
 const deadlineMs=Date.now()+1000;const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}),{launch:async()=>context});
 const result=await runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs},session=>collectPages({origin:'https://shared-deadline.test',readPage:async(_cursor,signal)=>{
  if(!reads++)return{items:[1],next:'next',exhausted:false,emptyConfirmed:false};
  return new Promise<PageBatch<number>>((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }},{deadlineMs,refresh:false,...session.signal?{signal:session.signal}:{}}));
 assert.equal(result.coverage,'partial');assert.equal(result.truncationReason,'timeout');assert.deepEqual(result.items,[1]);assert.equal(closed,1);
});
