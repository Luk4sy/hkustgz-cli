import type {Page,Response} from 'playwright';import type {CliDependencies,QueryOptions} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';import {withSession,selectedBrowser} from '../../session/browser.js';import {resolveDataPaths} from '../../session/paths.js';
import {CATALOG_URL} from './manifest.js';import type {CatalogReader} from './model.js';import {snapshotFromBatch} from './batch.js';
interface Capture {sequence:number;terms:Record<string,string>;readSubjects?:(termId:string)=>Promise<string>;completed?:{sequence:number;label:string;termId:string;subject:string;body:string}}
/** Verified public page client: observe UI course reads; read its public term list for label/id binding. */
async function installCapture(page:Page,timeout:number):Promise<void>{
 const installed=await page.evaluate(async timeout=>{
  const root=window as unknown as {webpackChunkapp?:{push:(value:unknown)=>void};__hkustgzCatalogCapture?:Capture};
  if(!root.webpackChunkapp)return false;

  let installed=false;let terms:Promise<unknown>|undefined;
  root.webpackChunkapp.push([['hkustgz-cli-catalog-capture'],{},(require:(id:number)=>{ue?:Record<string,unknown>})=>{
   const api=require(74604).ue;if(!api||typeof api.pageCourseSupermarkeView!=='function'||typeof api.listPublicMarketTermInfo!=='function'||typeof api.listPublicMarketCourseSubjectAreas!=='function')return;
   const original=api.pageCourseSupermarkeView as (...args:unknown[])=>Promise<{data:Record<string,unknown>}>;
   const state:Capture={sequence:0,terms:Object.create(null) as Record<string,string>};root.__hkustgzCatalogCapture=state;
   api.pageCourseSupermarkeView=async function(...args:unknown[]){
    const sequence=++state.sequence;const request={...(args[0] as {termId:string;subjectArea:string})};
    let result:{data:Record<string,unknown>};
    try{result=await original.apply(this,args);}catch(error){const e=error as {response?:{status?:number};code?:string};const status=e?.response?.status;const readError=status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408||e?.code==='ECONNABORTED'||e?.code==='ETIMEDOUT'?'QUERY_TIMEOUT':[500,502,503,504].includes(status??0)||e?.code==='ERR_NETWORK'?'NETWORK_REQUIRED':'ADAPTER_CHANGED';state.completed={sequence,label:(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value??'',termId:request.termId,subject:request.subjectArea,body:JSON.stringify({readError})};throw error;}
    const body=result.data;
    // Copy a strict public-course whitelist before Vue can render or mutate any part of it.
    // Credentials, response config, staff ids, emails and accounts never enter the capture.
    try{
     const courses=body.data as Array<{courseInfo:Record<string,unknown>;classSections:Array<Record<string,unknown>>}>;
     const projected={code:body.code,totalSize:body.totalSize,totalPage:body.totalPage,nextPage:body.nextPage,pageIndex:body.pageIndex,data:courses.map(c=>({courseInfo:{crseCode:c.courseInfo.crseCode,crseShortDesc:c.courseInfo.crseShortDesc,totalCredits:c.courseInfo.totalCredits},classSections:c.classSections.map(s=>({termId:s.termId,classNbr:s.classNbr,classSection:s.classSection,notes:s.notes,addConsentInd:s.addConsentInd,dropConsentInd:s.dropConsentInd,enrollmentCapacity:s.enrollmentCapacity,enrollmentNbr:s.enrollmentNbr,availableNbr:s.availableNbr,waitListNbr:s.waitListNbr,meetingInfoList:(s.meetingInfoList as Array<Record<string,unknown>>).map(m=>({startDate:m.startDate,endDate:m.endDate,meetingStartTime:m.meetingStartTime,meetingEndTime:m.meetingEndTime,weekDay:m.weekDay,facilityName:m.facilityName,instructorList:(m.instructorList as Array<Record<string,unknown>>).map(p=>({instructorRoleInd:p.instructorRoleInd,instructorName:p.instructorName}))}))}))}))};
     state.completed={sequence,label:(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value??'',termId:request.termId,subject:request.subjectArea,body:JSON.stringify(projected)};
    }catch{state.completed={sequence,label:(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value??'',termId:request.termId,subject:request.subjectArea,body:'null'};}
    return result;
   };
   state.readSubjects=async function(termId:string){
    await new Promise<void>(resolve=>setTimeout(resolve,500));
    try{
     const result=await (api.listPublicMarketCourseSubjectAreas as (input:{termId:string})=>Promise<{data:{code:unknown;data:unknown}}> )({termId});
     const body=result.data;
     if(body.code!=='0'||!Array.isArray(body.data)||body.data.some(value=>typeof value!=='string'))return JSON.stringify({readError:'ADAPTER_CHANGED'});
     return JSON.stringify({termId,code:body.code,subjects:[...body.data]});
    }catch(error){const e=error as {response?:{status?:number};code?:string};const status=e?.response?.status;const readError=status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408||e?.code==='ECONNABORTED'||e?.code==='ETIMEDOUT'?'QUERY_TIMEOUT':[500,502,503,504].includes(status??0)||e?.code==='ERR_NETWORK'?'NETWORK_REQUIRED':'ADAPTER_CHANGED';return JSON.stringify({readError});}
   };
   terms=new Promise<void>(resolve=>setTimeout(resolve,500)).then(()=>(api.listPublicMarketTermInfo as (input:object)=>Promise<unknown>)({})).catch(error=>{const e=error as {response?:{status?:number};code?:string};const status=e?.response?.status;const readError=status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408||e?.code==='ECONNABORTED'||e?.code==='ETIMEDOUT'?'QUERY_TIMEOUT':[500,502,503,504].includes(status??0)||e?.code==='ERR_NETWORK'?'NETWORK_REQUIRED':'ADAPTER_CHANGED';return{readError};});installed=true;
  }]);
  if(!installed||!terms)return false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const value=await Promise.race([terms,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),timeout);})]) as {readError?:string;data?:{code?:string;data?:{termList?:Array<{termId?:unknown;description?:unknown}>}}}|null;
   if(value===null)return 'timeout';if(value.readError)return value.readError;
   const list=value?.data?.data?.termList;if(value?.data?.code!=='0'||!Array.isArray(list)||!list.length)return false;
   for(const term of list){if(typeof term.termId!=='string'||typeof term.description!=='string'||Object.hasOwn(root.__hkustgzCatalogCapture!.terms,term.description))return false;root.__hkustgzCatalogCapture!.terms[term.description]=term.termId;}
   return true;
  }finally{if(timer)clearTimeout(timer);}
 },timeout).catch(()=>false);
 if(installed==='timeout')throw new CliFailure('QUERY_TIMEOUT');
 if(typeof installed==='string')throw new CliFailure(installed);
 if(!installed)throw new CliFailure('ADAPTER_CHANGED','The verified public Catalog response reader is unavailable.');
}
async function sequence(page:Page):Promise<number>{return page.evaluate(()=>(window as unknown as {__hkustgzCatalogCapture:Capture}).__hkustgzCatalogCapture.sequence);}
async function captured(page:Page,after:number,label:string,termId:string,subject:string|undefined,timeout:number):Promise<NonNullable<Capture['completed']>>{
 const handle=await page.waitForFunction(({after,label,termId,subject})=>{
  const state=(window as unknown as {__hkustgzCatalogCapture:Capture}).__hkustgzCatalogCapture;const c=state.completed;
  return c&&c.sequence>after&&(c.label===label&&c.termId===termId)&&(subject===null||c.subject===subject)?c:false;
 },{after,label,termId,subject:subject??null},{timeout});
 try{const value=await handle.jsonValue();if(value===false)throw new CliFailure('ADAPTER_CHANGED');return value;}finally{await handle.dispose();}
}
async function subjectDirectory(page:Page,termId:string,timeout:number):Promise<string[]>{
 const text=await page.evaluate(async({termId,timeout})=>{
  const state=(window as unknown as {__hkustgzCatalogCapture:Capture}).__hkustgzCatalogCapture;
  if(!state.readSubjects)return JSON.stringify({readError:'ADAPTER_CHANGED'});
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([state.readSubjects(termId),new Promise<string>(resolve=>{timer=setTimeout(()=>resolve(JSON.stringify({readError:'QUERY_TIMEOUT'})),timeout);})]);}
  finally{if(timer)clearTimeout(timer);}
 },{termId,timeout});
 const result=JSON.parse(text) as {readError?:string;termId?:string;code?:string;subjects?:unknown};
 if(result.readError&&['ADAPTER_CHANGED','LOGIN_REQUIRED','PERMISSION_DENIED','RATE_LIMITED','QUERY_TIMEOUT','NETWORK_REQUIRED'].includes(result.readError))throw new CliFailure(result.readError);
 const subjects=result.subjects;
 if(result.termId!==termId||result.code!=='0'||!Array.isArray(subjects)||!subjects.length||subjects.some(value=>typeof value!=='string'||! /^[A-Z]+$/.test(value))||new Set(subjects).size!==subjects.length)throw new CliFailure('ADAPTER_CHANGED','The target term subject directory could not be verified.');
 return subjects;
}
const isList=(response:Response)=>new URL(response.url()).origin==='https://sisn-service.hkust-gz.edu.cn'&&new URL(response.url()).pathname==='/api/course/pageCourseSupermarkeView';
export async function createReader(page:Page,term:string|undefined,options:QueryOptions):Promise<CatalogReader>{
 const timeout=()=>Math.max(1,Math.min(30000,options.deadlineMs-Date.now()));page.setDefaultTimeout(timeout());
 const initial=page.waitForResponse(isList,{timeout:timeout()});void initial.catch(()=>{});await page.goto(CATALOG_URL,{timeout:timeout()});await initial;
 await page.locator('.course-code-list .code-item').first().waitFor();await installCapture(page,timeout());
 const input=page.getByPlaceholder('Select',{exact:true});await input.waitFor();
 const label=term??await input.inputValue();const sourceTerm=await page.evaluate(label=>(window as unknown as {__hkustgzCatalogCapture:Capture}).__hkustgzCatalogCapture.terms[label],label);
 if(!sourceTerm)throw new CliFailure('INVALID_ARGUMENT','The requested Catalog term is not in the source term list.');
 if(term!==undefined&&await input.inputValue()!==term){
  await input.click();await page.locator('.el-select-dropdown:visible').waitFor();const option=page.locator('.el-select-dropdown:visible').getByText(term,{exact:true});
  if(await option.count()!==1)throw new CliFailure('INVALID_ARGUMENT','Use an exact visible Catalog term label, for example 2026-27 Fall.');
  const before=await sequence(page);await option.click();await captured(page,before,term,sourceTerm,undefined,timeout());
 }
 const termId=await input.inputValue();if(!termId||term!==undefined&&termId!==term)throw new CliFailure('ADAPTER_CHANGED');
 const subjects=await subjectDirectory(page,sourceTerm,timeout());
 return{readMethod:'response',subjects,read:async(subject,signal)=>{
  if(signal.aborted)throw signal.reason;page.setDefaultTimeout(timeout());
  const before=await sequence(page);
  // Even the active subject is read anew: no startup batch or old DOM is reused.
  await page.locator('.course-code-list .code-item').getByText(subject,{exact:true}).click();
  const batch=await captured(page,before,termId,sourceTerm,subject,timeout());
  if(await input.inputValue()!==termId)throw new CliFailure('ADAPTER_CHANGED');
  return snapshotFromBatch(JSON.parse(batch.body),termId,batch.termId,subject);
 }};
}
export async function withCatalogReader<T>(term:string|undefined,options:QueryOptions,run:(reader:CatalogReader)=>Promise<T>,deps?:CliDependencies,headed=false):Promise<T>{
 const paths=resolveDataPaths(deps?.env??process.env);const browser=await selectedBrowser(paths);
 return (deps?.sessionRunner??withSession)('catalog',{browser,headless:!headed,deadlineMs:options.deadlineMs,purpose:'query'},async session=>run(await createReader(session.page,term,options)));
}
