import type {Page} from 'playwright';import type {CliDependencies,QueryOptions} from '../../core/contracts.js';import {CliFailure} from '../../core/errors.js';import {HttpReadError} from '../../core/policy.js';import {visitService} from '../../session/auth.js';import {withSession,selectedBrowser} from '../../session/browser.js';import {resolveDataPaths} from '../../session/paths.js';import type {SisReader,SourceTerm} from './model.js';
interface Wire {sequence:number;readError?:string;status?:number;retryAfter?:string|undefined;request?:{startDate:unknown;endDate:unknown;includeWaitlistedClass:unknown;own:boolean;selectedTermLabel:string;finishedTermLabel:string};body?:unknown}
interface Bridge {sequence:number;completed?:Wire;read:(kind:string,page:number)=>Promise<string>}
function decode(text:string):unknown{const body=JSON.parse(text) as {readError?:string;status?:number;retryAfter?:string};if(body.readError){if(typeof body.status==='number'&&[401,403,408,429,500,502,503,504].includes(body.status))throw new HttpReadError(body.status,body.retryAfter);throw new CliFailure(['LOGIN_REQUIRED','PERMISSION_DENIED','QUERY_TIMEOUT','NETWORK_REQUIRED','RATE_LIMITED'].includes(body.readError)?body.readError:'ADAPTER_CHANGED');}return body;}
export async function createSisPageReader(page:Page):Promise<SisReader>{
 const installed=await page.evaluate(()=>{
  const root=window as unknown as {webpackChunkapp?:{push:(value:unknown)=>void};__hkustgzSis?:Bridge};if(!root.webpackChunkapp)return 'ADAPTER_CHANGED';
  let result='ADAPTER_CHANGED';
  root.webpackChunkapp.push([['hkustgz-cli-sis-reader'],{},(require:(id:number)=>any)=>{
   const modules=require(74604),store=require(63863).P();const terms=modules.Xb,schedule=modules.i$;
   if(!store.userInfo?.userId){result='LOGIN_REQUIRED';return;}if(![1,5].includes(store.userInfo.userType)){result='PERMISSION_DENIED';return;}
   if(typeof terms?.queryCurrentTerm!=='function'||typeof terms?.queryTermValueByPage!=='function'||typeof schedule?.queryStagingStudentCurriculumTimeSlot!=='function')return;
   const owner=store.userInfo.userId;const state={sequence:0} as Bridge;state.read=async function(kind,index){
    try{
     const result=kind==='current'?await terms.queryCurrentTerm({}):await terms.queryTermValueByPage({pageIndex:index,pageSize:50});const body=result.data;
     if(kind==='current')return JSON.stringify({code:body.code,data:body.data===null?null:{termId:body.data?.termId}});
     return JSON.stringify({code:body.code,totalSize:body.totalSize,totalPage:body.totalPage,nextPage:body.nextPage,pageIndex:body.pageIndex,data:body.data?.map((t:any)=>({termId:t.termId,termName:t.termName,description:t.description,termStartDate:t.termStartDate,termEndDate:t.termEndDate}))});
    }catch(error){const e=error as any,status=e?.response?.status;return JSON.stringify({readError:status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408||e?.code==='ECONNABORTED'?'QUERY_TIMEOUT':status>=500||e?.code==='ERR_NETWORK'?'NETWORK_REQUIRED':'ADAPTER_CHANGED',status,retryAfter:typeof e?.response?.headers?.['retry-after']==='string'?e.response.headers['retry-after']:undefined});}
   };root.__hkustgzSis=state;
   const original=schedule.queryStagingStudentCurriculumTimeSlot;
   schedule.queryStagingStudentCurriculumTimeSlot=async function(...args:any[]){
    const sequence=++state.sequence;const r=args[0];
    // Compare identity in the page realm. Never copy the user's id into the bridge.
    const account=owner;
    const own=Boolean(account)&&store.userInfo?.userId===account&&r.currentUserId===account&&[1,5].includes(store.userInfo.userType);
    if(!own){state.completed={sequence,readError:'PERMISSION_DENIED'};throw new Error('SIS account scope mismatch');}
    const selectedTermLabel=(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value??'';
    const request={startDate:r.startDate,endDate:r.endDate,includeWaitlistedClass:r.includeWaitlistedClass,own,selectedTermLabel,finishedTermLabel:''};
    let result:any;
    try{result=await original.apply(this,args);}catch(error){const e=error as any,status=e?.response?.status;state.completed={sequence,readError:status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408||e?.code==='ECONNABORTED'?'QUERY_TIMEOUT':status>=500||e?.code==='ERR_NETWORK'?'NETWORK_REQUIRED':'ADAPTER_CHANGED',status,retryAfter:typeof e?.response?.headers?.['retry-after']==='string'?e.response.headers['retry-after']:undefined};throw error;}
    if(!account||account!==store.userInfo?.userId||![1,5].includes(store.userInfo.userType)){state.completed={sequence,readError:'PERMISSION_DENIED'};return result;}
    request.finishedTermLabel=(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value??'';
    try{
     const b=result.data;
     const projected={code:b.code,totalSize:b.totalSize,totalPage:b.totalPage,nextPage:b.nextPage,pageIndex:b.pageIndex,data:b.data.map((c:any)=>({classId:c.classId,classSection:c.classSection,crseId:c.crseId,crseCode:c.crseCode,crseName:c.crseName,enrollmentStatus:c.enrollmentStatus,classSectionId:c.classSectionId,weekDay:c.weekDay,meetingStartTime:c.meetingStartTime,meetingEndTime:c.meetingEndTime,facilityName:c.facilityName,meetingInfoList:c.meetingInfoList.map((m:any)=>({classSectionId:m.classSectionId,classId:m.classId,startDate:m.startDate,endDate:m.endDate,weekDay:m.weekDay,meetingStartTime:m.meetingStartTime,meetingEndTime:m.meetingEndTime,facilityName:m.facilityName,instructorList:(m.instructorList??[]).map((p:any)=>({instructorName:p.instructorName}))}))}))};
     // Synchronous whitelist copy of one complete response before Vue can render it.
     state.completed=JSON.parse(JSON.stringify({sequence,request,body:projected}));
    }catch{state.completed={sequence,readError:'ADAPTER_CHANGED'};}
    return result;
   };result='ready';
  }]);return result;
 }).catch(()=>'ADAPTER_CHANGED');
 if(installed!=='ready')throw new CliFailure(installed);
 const rpc=async(kind:string,index:number,signal:AbortSignal)=>{if(signal.aborted)throw signal.reason;return decode(await page.evaluate(({kind,index})=>(window as unknown as {__hkustgzSis:Bridge}).__hkustgzSis.read(kind,index),{kind,index}));};
 return{current:signal=>rpc('current',1,signal),terms:(index,signal)=>rpc('terms',index,signal),timetable:async(term,signal)=>{
  if(signal.aborted)throw signal.reason;
  const input=page.getByPlaceholder('Select',{exact:true});if(await input.inputValue()!==term.name){
   await input.click();await page.locator('.el-select-dropdown:visible').waitFor();const option=page.locator('.el-select-dropdown:visible').getByText(term.name,{exact:true});
   if(await option.count()!==1)throw new CliFailure('INVALID_ARGUMENT','The verified term is not uniquely selectable in the SIS calendar.');await option.click();
   await page.waitForFunction(name=>(document.querySelector('input[placeholder="Select"]') as HTMLInputElement)?.value===name,term.name);
  }
  const waitlist=page.getByRole('checkbox',{name:'Include Waitlisted Class',exact:true});if(await waitlist.isChecked())await waitlist.uncheck();
  await page.getByText('Weekly Calendar',{exact:true}).click();
  const before=await page.evaluate(()=>(window as unknown as {__hkustgzSis:Bridge}).__hkustgzSis.sequence);
  await page.getByText('Time Slots Overview',{exact:true}).click();
  const handle=await page.waitForFunction(({before,term})=>{
   const c=(window as unknown as {__hkustgzSis:Bridge}).__hkustgzSis.completed;
   return c&&c.sequence>before&&(c.readError||c.request?.own&&c.request.startDate===term.startDate&&c.request.endDate===term.endDate&&c.request.includeWaitlistedClass==='N'&&c.request.selectedTermLabel===term.name&&c.request.finishedTermLabel===term.name)?JSON.stringify(c):false;
  },{before,term});
  try{const value=await handle.jsonValue();if(value===false)throw new CliFailure('ADAPTER_CHANGED');return decode(value);}finally{await handle.dispose();}
 }};
}
export async function withSisReader<T>(options:QueryOptions,run:(reader:SisReader,options:QueryOptions)=>Promise<T>,deps?:CliDependencies,headed=false):Promise<T>{
 const paths=resolveDataPaths(deps?.env??process.env);const browser=await selectedBrowser(paths);
 return (deps?.sessionRunner??withSession)('sis',{browser,headless:!headed,deadlineMs:options.deadlineMs,purpose:'query'},async session=>{
  session.page.setDefaultTimeout(Math.max(1,Math.min(30000,options.deadlineMs-Date.now())));
  const auth=await visitService('sis',session,options.deadlineMs,false);const url=new URL(session.page.url());
  if(auth.state==='unauthenticated'||url.origin!=='https://sisn.hkust-gz.edu.cn'||url.pathname!=='/system/my-calendar')throw new CliFailure('LOGIN_REQUIRED');
  if(url.searchParams.has('studentId'))throw new CliFailure('PERMISSION_DENIED');
  return run(await createSisPageReader(session.page),{...options,...session.signal?{signal:session.signal}:{}});
 });
}
