import assert from 'node:assert/strict';
import test from 'node:test';
import {collectPages,buildQueryResult} from '../src/core/query.js';
import {createQueryPolicy} from '../src/core/policy.js';
import {CliFailure} from '../src/core/errors.js';
import type {PageBatch,PageSource} from '../src/core/contracts.js';
import {queryMeta} from './fixtures.js';
function runtime(){let now=0;return createQueryPolicy(90000,{now:()=>now,sleep:async(ms)=>{now+=ms;}});}
const options={refresh:false,deadlineMs:90000};
const batch=(items:number[],next:string|null=null):PageBatch<number>=>({items,next,exhausted:next===null,emptyConfirmed:items.length===0});
test('page 21 is not requested and page cap is explicit',async()=>{
 const cursors:Array<string|null>=[];
 const result=await collectPages({readPage:async cursor=>{cursors.push(cursor);return batch([cursors.length],String(cursors.length));}},options,runtime());
 assert.equal(cursors.length,20);assert.equal(result.pagesRead,20);assert.equal(result.coverage,'partial');assert.equal(result.truncationReason,'page_cap');
});
test('record 2001 is not returned and actual read count is retained',async()=>{
 const result=await collectPages({readPage:async()=>batch(Array.from({length:2001},(_,i)=>i+1))},options,runtime());
 assert.equal(result.items.length,2000);assert.equal(result.recordsRead,2001);assert.equal(result.items.at(-1),2000);assert.equal(result.truncationReason,'record_cap');
});
test('limit is partial only when data is actually omitted',async()=>{
 const source={readPage:async()=>batch([1,2])};
 const result=await collectPages(source,{...options,limit:1},runtime());assert.deepEqual(result.items,[1]);assert.equal(result.recordsRead,2);assert.equal(result.truncationReason,'limit');
 const complete=await collectPages({readPage:async()=>batch([1])},{...options,limit:1},runtime());assert.equal(complete.coverage,'complete');
});
test('unconfirmed empty and contradictory paging are not success',async()=>{
 for(const page of [{items:[],next:null,exhausted:true,emptyConfirmed:false},{items:[1],next:'next',exhausted:true,emptyConfirmed:false},{items:[1],next:null,exhausted:false,emptyConfirmed:false}]){
  await assert.rejects(collectPages({readPage:async()=>page},options,runtime()),{code:'ADAPTER_CHANGED'});
 }
 const empty=await collectPages({readPage:async()=>batch([])},options,runtime());assert.equal(empty.coverage,'complete');assert.equal(empty.recordsRead,0);
});
test('page failure preserves prior rows, while an initial login failure is thrown',async()=>{
 let count=0;const result=await collectPages({readPage:async()=>{if(count++)throw new CliFailure('NETWORK_REQUIRED');return batch([1,2],'next');}},options,runtime());
 assert.deepEqual(result.items,[1,2]);assert.equal(result.truncationReason,'upstream');assert.equal(result.failure?.code,'NETWORK_REQUIRED');
 await assert.rejects(collectPages({readPage:async()=>{throw new CliFailure('LOGIN_REQUIRED');}},options,runtime()),{code:'LOGIN_REQUIRED'});
 const payload=buildQueryResult(result,queryMeta());assert.equal(payload.ok,false);assert.equal('error' in payload&&payload.error.code,'PARTIAL_RESULT');assert.equal(payload.meta.returnedCount,2);
});
test('repeated cursors cannot generate false completeness or duplicate fetches',async()=>{
 let calls=0;const result=await collectPages({readPage:async()=>{calls++;return batch([calls],'same');}},options,runtime());
 assert.equal(calls,2);assert.equal(result.coverage,'partial');assert.equal(result.truncationReason,'upstream');
});
test('exactly exhausted page 20 is complete',async()=>{
 let n=0;const source:PageSource<number>={readPage:async()=>batch([++n],n===20?null:String(n))};
 assert.equal((await collectPages(source,options,runtime())).coverage,'complete');
});
test('a hanging next page preserves data and aborts the operation within budget',async()=>{
 let aborted=false;let n=0;const deadlineMs=Date.now()+1000;
 const result=await collectPages({origin:'https://timeout.test',readPage:async(_cursor,signal)=>{if(!n++)return batch([1],'next');return new Promise<PageBatch<number>>((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true}));}},{refresh:false,deadlineMs});
 assert.deepEqual(result.items,[1]);assert.equal(result.truncationReason,'timeout');
 assert.equal(n,2);assert.equal(aborted,true);
});
test('explicit interruption preserves signal semantics instead of returning partial data',async()=>{
 const stop=new AbortController();let n=0;
 await assert.rejects(collectPages({readPage:async()=>{if(n++)stop.abort(new CliFailure('TERMINATED'));return batch([1],'next');}},{...options,signal:stop.signal},runtime()),{code:'TERMINATED'});
});
