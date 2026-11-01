import type {Page,Response} from 'playwright';
import {CliFailure} from '../../core/errors.js';
import {HttpReadError} from '../../core/policy.js';
import type {LibraryInspectionReader} from './detail.js';
import {bindLibraryIdentity,LibraryIdentityReadError,type LibraryIdentity} from './identity.js';
import {LIBRARY_ORIGIN} from './manifest.js';
async function json(response:Response):Promise<any>{
 if(response.status()!==200)throw new HttpReadError(response.status(),response.headers()['retry-after']);
 let body:any;try{body=await response.json();}catch{throw new CliFailure('ADAPTER_CHANGED');}
 if(body?.code===300)throw new CliFailure('LOGIN_REQUIRED');if(body?.code!==0)throw new CliFailure('ADAPTER_CHANGED');return body;
}
export function createLibraryInspectionReader(page:Page):LibraryInspectionReader {
 let binding:LibraryIdentity|undefined;let lastRequest=0;let identityVerified=false;
 const check=(signal:AbortSignal)=>{if(signal.aborted)throw signal.reason;if(new URL(page.url()).origin!==LIBRARY_ORIGIN)throw new CliFailure('LOGIN_REQUIRED');};
 const pace=async(signal:AbortSignal)=>{check(signal);const minimum=lastRequest+500;while(Date.now()<minimum){await page.waitForTimeout(Math.max(1,minimum-Date.now()));check(signal);}check(signal);lastRequest=Date.now();};
 const assertIdentity=async(signal:AbortSignal)=>{
  identityVerified=false;
  try{
  check(signal);await page.waitForFunction(()=>[...document.querySelectorAll('*')].some(e=>(e as any).__vue__?.$store?._actions?.disCaseUserInfo));
  await pace(signal);
  const waiting=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).origin===LIBRARY_ORIGIN&&new URL(r.url()).pathname==='/ic-web/auth/userInfo');void waiting.catch(()=>{});
  // Reuse the already-observed normal GET action. Its raw return is never exported.
  await page.evaluate(()=>{const store=[...document.querySelectorAll('*')].map(e=>(e as any).__vue__?.$store).find(s=>s?._actions?.disCaseUserInfo);void store.dispatch('disCaseUserInfo').catch(()=>{});});
  const body=await json(await waiting);lastRequest=Date.now();check(signal);
  if(binding)binding.assertFresh(body);else binding=bindLibraryIdentity(body);
  identityVerified=true;
  }catch(failure){throw new LibraryIdentityReadError(failure);}
 };
 return{get identityVerified(){return identityVerified;},assertIdentity,page:async(range,p,signal)=>{
  check(signal);if(!binding)throw new CliFailure('LOGIN_REQUIRED');
  if(new URL(page.url()).hash!=='#/ic/userinfo')await page.goto(LIBRARY_ORIGIN+'/#/ic/userinfo',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>[...document.querySelectorAll('*')].some(e=>typeof (e as any).__vue__?.initTable==='function'&&(e as any).__vue__?.search?.date&&Array.isArray((e as any).__vue__?.statusOption)));
  const status=await page.evaluate(()=>{const v=[...document.querySelectorAll('*')].map(e=>(e as any).__vue__).find(v=>v?.initTable&&v?.search?.date&&Array.isArray(v.statusOption));return v.statusOption.map((x:any)=>x.value) as unknown[];});
  const known=new Set([1,2,4,8,16,32,64,128,256,512,1024,2048,8192,16384]);
  if(!status.length||status.some(x=>typeof x!=='number'||!known.has(x))||new Set(status).size!==status.length)throw new CliFailure('ADAPTER_CHANGED');
  const values=status as number[],filter=values.reduce((a,b)=>a+b,0);
  const endDate=new Date(Date.parse(range.to+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  await pace(signal);
  const waiting=page.waitForResponse(r=>{const u=new URL(r.url());return r.request().method()==='GET'&&u.origin===LIBRARY_ORIGIN&&u.pathname==='/ic-web/reserve/resvInfo'&&u.searchParams.get('beginDate')===range.from&&u.searchParams.get('endDate')===endDate&&u.searchParams.get('needStatus')===String(filter)&&u.searchParams.get('page')===String(p)&&u.searchParams.get('pageNum')==='10'&&u.searchParams.get('orderKey')==='gmt_create'&&u.searchParams.get('orderModel')==='desc';});void waiting.catch(()=>{});
  await page.evaluate(({from,endDate,p,values,filter})=>{
   const v=[...document.querySelectorAll('*')].map(e=>(e as any).__vue__).find(v=>v?.initTable&&v?.search?.date&&Array.isArray(v.statusOption));
   if(!v||v.statusOption.length!==values.length||v.statusOption.some((x:any)=>!values.includes(x.value))||v.statusOption.reduce((n:number,x:any)=>n+x.value,0)!==filter)throw new Error('Source status options changed');
   v.search.date=[from,endDate];v.search.check=[...values];v.pageDate.page=p;v.pageDate.pageNum=10;v.initTable();
  },{from:range.from,endDate,p,values,filter});
  const body=await json(await waiting);lastRequest=Date.now();check(signal);await assertIdentity(signal);
  if(!Array.isArray(body.data))throw new CliFailure('ADAPTER_CHANGED');
  return{scope:{...range,page:p,needStatus:filter},body:{code:0,count:body.count,data:body.data.map((r:any)=>({resvId:r.resvId,resvBeginTime:r.resvBeginTime,resvEndTime:r.resvEndTime,resvStatus:r.resvStatus,ownerMatches:binding!.owns(r.appAccNo),memberCount:Array.isArray(r.resvMemberInfoList)?r.resvMemberInfoList.length:null,resvDevInfoList:Array.isArray(r.resvDevInfoList)?r.resvDevInfoList.map((d:any)=>({devId:d.devId,devName:d.devName})):null}))}};
 }};
}
