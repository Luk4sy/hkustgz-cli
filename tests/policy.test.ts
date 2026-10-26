import assert from 'node:assert/strict';
import test from 'node:test';
import {createQueryPolicy,HttpReadError,resolveDateRange} from '../src/core/policy.js';
import {CliFailure} from '../src/core/errors.js';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
function clock(){let time=0;return{now:()=>time,sleep:async(ms:number)=>{time+=ms;},advance:(ms:number)=>{time+=ms;}};}
test('same-origin calls are serial and separated by at least 500ms',async()=>{
 const time=clock();const policy=createQueryPolicy(90000,time);const starts:number[]=[];let active=0;
 await Promise.all([1,2,3].map(()=>policy.run('https://service.test',async()=>{assert.equal(active++,0);starts.push(time.now());await Promise.resolve();active--;return 1;})));
 assert.deepEqual(starts,[0,500,1000]);
});
test('only explicit read-only transient failures retry, at most once',async()=>{
 for(const readOnly of [false,true]){const time=clock();const policy=createQueryPolicy(90000,time);let calls=0;
  await assert.rejects(policy.run('https://retry.test',async()=>{calls++;throw new CliFailure('NETWORK_REQUIRED');},{readOnly}),{code:'NETWORK_REQUIRED'});
  assert.equal(calls,readOnly?2:1);
 }
});
test('401 and 403 never retry and preserve their public categories',async()=>{
 for(const [status,code] of [[401,'LOGIN_REQUIRED'],[403,'PERMISSION_DENIED']] as const){let calls=0;const policy=createQueryPolicy(90000,clock());
  await assert.rejects(policy.run('https://auth.test',async()=>{calls++;throw new HttpReadError(status);},{readOnly:true}),{code});assert.equal(calls,1);
 }
});
test('429 respects Retry-After seconds and never waits beyond the query budget',async()=>{
 const time=clock();const policy=createQueryPolicy(90000,time);let calls=0;const starts:number[]=[];
 await policy.run('https://rate.test',async()=>{starts.push(time.now());if(!calls++)throw new HttpReadError(429,'2');return 'ok';},{readOnly:true});assert.deepEqual(starts,[0,2000]);
 let attempted=0;const short=createQueryPolicy(1000,clock());await assert.rejects(short.run('https://rate.test',async()=>{attempted++;throw new HttpReadError(429,'2');},{readOnly:true}),{code:'RATE_LIMITED'});assert.equal(attempted,1);
});
test('one read cannot consume more than 30 seconds even within a longer budget',async()=>{
 const time=clock();const policy=createQueryPolicy(90000,time);
 await assert.rejects(policy.run('https://slow.test',async()=>{time.advance(30001);return 'late';}),{code:'QUERY_TIMEOUT'});
});
test('query default is bounded at 90 seconds and queued work is not launched after timeout',async()=>{
 const time=clock();const policy=createQueryPolicy(undefined,time);let calls=0;time.advance(89000);
 await policy.run('https://late.test',async()=>{calls++;return 'within budget';});time.advance(1001);
 await assert.rejects(policy.run('https://late.test',async()=>{calls++;}),{code:'QUERY_TIMEOUT'});assert.equal(calls,1);
});
test('school date is independent of host timezone and default window is seven days',()=>{
 const now=Date.parse('2026-10-26T16:05:00Z');
 assert.deepEqual(resolveDateRange({},now),{from:'2026-10-27',to:'2026-11-03',timezone:'Asia/Shanghai'});
 assert.equal(resolveDateRange({from:'2026-02-25'},now).to,'2026-03-04');assert.equal(resolveDateRange({to:'2026-10-30'},now).from,'2026-10-27');
});
test('invalid civil dates, reversed intervals and 32-day windows are rejected',()=>{
 const now=Date.parse('2026-01-01T00:00:00Z');
 for(const input of [{from:'2026-02-30'},{from:'2026-1-01'},{from:'2026-01-02',to:'2026-01-01'},{from:'2026-01-01',to:'2026-01-01'},{from:'2026-01-01',to:'2026-02-02'}])assert.throws(()=>resolveDateRange(input,now),{code:'INVALID_ARGUMENT'});
 assert.equal(resolveDateRange({from:'2026-01-01',to:'2026-02-01'},now).to,'2026-02-01');
});
test('a null rejection cannot be mistaken for a successful read',async()=>{
 let rejected=false;try{await createQueryPolicy(90000,clock()).run('https://null.test',async()=>{throw null;});}catch{rejected=true;}assert.equal(rejected,true);
});
test('uncooperative cancelled reads retain origin ownership until they really settle',async()=>{
 const origin='https://uncooperative.test';let release!:(value:number)=>void;let calls=0;
 const first=createQueryPolicy(Date.now()+80).run(origin,async()=>{calls++;return new Promise<number>(resolve=>{release=resolve;});});
 await assert.rejects(first,{code:'QUERY_TIMEOUT'});
 await assert.rejects(createQueryPolicy(Date.now()+80).run(origin,async()=>{calls++;return 2;}),{code:'QUERY_TIMEOUT'});
 assert.equal(calls,1);release(1);
});
test('HTTP-date Retry-After and read-only HTTP server retries use the same budget',async()=>{
 const time=clock();let calls=0;const policy=createQueryPolicy(90000,time);
 await policy.run('https://date-rate.test',async()=>{if(!calls++)throw new HttpReadError(429,new Date(3000).toUTCString());return 'ok';},{readOnly:true});assert.equal(time.now(),3000);assert.equal(calls,2);
});
test('different actual host timezones produce the same school date range',async()=>{
 const run=promisify(execFile);const windows=[];const hosts=[];
 for(const TZ of ['America/Los_Angeles','Asia/Tokyo']){
  const {stdout}=await run(process.execPath,['--import','tsx','--input-type=module','-e',"import {resolveDateRange} from './src/core/policy.ts';const now=Date.parse('2026-10-26T16:05:00Z');console.log(JSON.stringify({host:new Date(now).toLocaleDateString('en-CA'),range:resolveDateRange({},now)}));"],{cwd:new URL('../',import.meta.url),env:{...process.env,TZ}});
  const value=JSON.parse(stdout);hosts.push(value.host);windows.push(value.range);
 }
 assert.notEqual(hosts[0],hosts[1]);
 for(const window of windows)assert.deepEqual(window,{from:'2026-10-27',to:'2026-11-03',timezone:'Asia/Shanghai'});
});
