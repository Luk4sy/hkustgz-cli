import type {Page} from 'playwright';import type {CliDependencies,QueryOptions} from '../../core/contracts.js';import {CliFailure} from '../../core/errors.js';import {HttpReadError} from '../../core/policy.js';import {visitService} from '../../session/auth.js';import {withSession,selectedBrowser} from '../../session/browser.js';import {resolveDataPaths} from '../../session/paths.js';import {PORTAL_ORIGIN,PORTAL_PATHS} from './manifest.js';import type {PortalReader} from './model.js';
const allowedPaths=new Set<string>(Object.values(PORTAL_PATHS));
function aborted(signal:AbortSignal){if(signal.aborted)throw signal.reason;}
function http(status:number,retryAfter?:string):void{if(status===200)return;if([401,403,408,429,500,502,503,504].includes(status))throw new HttpReadError(status,retryAfter);throw new CliFailure('ADAPTER_CHANGED');}
export function createPortalPageReader(page:Page,templates:ReadonlyMap<string,string>):PortalReader{
 const template=async(path:string,signal:AbortSignal)=>{for(;;){aborted(signal);const raw=templates.get(path);if(raw){const u=new URL(raw);if(u.origin!==PORTAL_ORIGIN||u.pathname!==path||!allowedPaths.has(path))throw new CliFailure('ADAPTER_CHANGED');u.searchParams.delete('callback');u.searchParams.delete('_');return u;}await new Promise<void>((resolve,reject)=>{const done=()=>{signal.removeEventListener('abort',cancel);resolve();};const timer=setTimeout(done,25);const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(signal.reason);};signal.addEventListener('abort',cancel,{once:true});});}};
 const read=async(path:string,params:Record<string,string>,kind:string,signal:AbortSignal)=>{const u=await template(path,signal);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);aborted(signal);
  const wire=await page.evaluate(async({url,kind})=>{
   let projecting=false;try{const response=await fetch(url,{credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(30000)});if(response.status!==200)return{status:response.status,retryAfter:response.headers.get('retry-after')??undefined};const text=await response.text();let b:any;try{b=JSON.parse(text);}catch{const doc=new DOMParser().parseFromString(text,'text/html');return{status:200,error:doc.querySelector('input[type=password],input[autocomplete="one-time-code"]')?'LOGIN_REQUIRED':'ADAPTER_CHANGED'};}
    projecting=true;
    // Copy only business fields. Do not return account data, arbitrary diagnostics or HTML.
    if(kind==='apps')return{status:200,body:{result:b.result,data:{total:b.data?.total,appList:b.data?.appList?.map((a:any)=>({id:a.id,name:a.name,appUrl:a.appUrl}))}}};
    if(kind==='columns')return{status:200,body:{result:b.result,data:b.data?.map((c:any)=>({wybs:c.wybs,lmmc:c.lmmc,...c.jkcs?{jkcs:{siteId:c.jkcs.siteId,columnId:c.jkcs.columnId}}:{}}))}};
    if(kind==='notices')return{status:200,body:{result:b.result,data:{total:b.data?.total,list:b.data?.list?.map((n:any)=>({id:n.id,title:n.title,date:n.date,colName:n.colName,articleUrl:n.articleUrl,linkUrl:n.linkUrl}))}}};
    if(kind==='categories')return{status:200,body:{resultCode:b.resultCode,result:{data:b.result?.data?.map((g:any)=>({teamCategoryVOS:g.teamCategoryVOS?.map((c:any)=>({id:c.id,calendarCateName:c.calendarCateName}))}))}}};
    return{status:200,body:b.map((d:any)=>({day:d.day,...d.events===undefined?{}:{events:d.events.map((e:any)=>({beginTime:e.beginTime,endTime:e.endTime,schedule:{id:e.schedule?.id,tag10:e.schedule?.tag10,title:e.schedule?.title,location:e.schedule?.location,cateGory:{id:e.schedule?.cateGory?.id,name:e.schedule?.cateGory?.name}}}))}}))};
   }catch(error){return{status:0,error:projecting?'ADAPTER_CHANGED':error instanceof Error&&error.name==='TimeoutError'?'QUERY_TIMEOUT':error instanceof TypeError?'NETWORK_REQUIRED':'ADAPTER_CHANGED'};}
  },{url:u.toString(),kind});
  if(wire.error)throw new CliFailure(wire.error);http(wire.status,wire.retryAfter);return wire.body;
 };
 return{
  apps:signal=>read(PORTAL_PATHS.apps,{categoryId:''},'apps',signal),columns:signal=>read(PORTAL_PATHS.columns,{},'columns',signal),
  notices:(source,pageNumber,signal)=>read(source.kind==='mnews'?PORTAL_PATHS.mnews:PORTAL_PATHS.notices,{page:String(pageNumber),pageSize:'50',...(source.kind==='mnews'?{siteId:String(source.siteId),columnId:String(source.columnId)}:{wybs:source.id})},'notices',signal),
  categories:signal=>read(PORTAL_PATHS.categories,{queryType:'2'},'categories',signal),
  agenda:async(category,range,signal)=>({request:{categoryId:category.id,from:range.from,to:range.to,queryType:'2',type:'0'},body:await read(PORTAL_PATHS.agenda,{queryType:'2',type:'0',categoryIds:String(category.id),fromDate:new Date(range.from+'T00:00:00+08:00').toISOString(),endDate:new Date(Date.parse(range.to+'T00:00:00+08:00')-1000).toISOString()},'agenda',signal)}),
  detail:async(notice,signal)=>{
   aborted(signal);if(!notice.url)return{status:200,unsupported:true};let u=new URL(notice.url);if(u.origin!==PORTAL_ORIGIN||!u.pathname.startsWith('/mnews/'))return{status:200,unsupported:true};
   const visited=new Set<string>();for(let hop=0;hop<6;hop++){
    aborted(signal);
    if(hop>0)await new Promise<void>((resolve,reject)=>{const finish=()=>{signal.removeEventListener('abort',cancel);resolve();};const timer=setTimeout(finish,500);const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(signal.reason);};signal.addEventListener('abort',cancel,{once:true});});
    aborted(signal);if(u.origin!==PORTAL_ORIGIN||!u.pathname.startsWith('/mnews/')||u.username||u.password||visited.has(u.toString()))throw new CliFailure('ADAPTER_CHANGED');visited.add(u.toString());
    if(u.pathname==='/mnews/_redirect'&&u.searchParams.get('articleId')!==notice.sourceId)throw new CliFailure('ADAPTER_CHANGED');
    const response=await page.request.get(u.toString(),{maxRedirects:0,timeout:30000});
    try{const status=response.status();if([301,302,303,307,308].includes(status)){const location=response.headers()['location'];if(!location)throw new CliFailure('ADAPTER_CHANGED');const next=new URL(location,u);if(next.hostname==='myportal.hkust-gz.edu.cn'&&next.protocol==='http:')next.protocol='https:';if(next.origin!==PORTAL_ORIGIN||!next.pathname.startsWith('/mnews/'))throw new CliFailure('ADAPTER_CHANGED');u=next;continue;}if(status!==200){http(status,response.headers()['retry-after']);return{status};}
     const articleId=/\/c\d+a(\d+)\/page\.psp$/.exec(u.pathname)?.[1];const text=await response.text();return await page.evaluate(({text,articleId})=>{const doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('script,style,noscript').forEach(n=>n.remove());const nodes=doc.querySelectorAll('.wp_articlecontent');return{status:200,loginForm:!!doc.querySelector('input[type=password],input[autocomplete="one-time-code"]'),contentFound:nodes.length===1,bodyText:nodes.length===1?nodes[0]?.textContent??'':'',articleId};},{text,articleId:articleId??''});
    }finally{await response.dispose();}
   }throw new CliFailure('ADAPTER_CHANGED');
  }
 };
}
export async function withPortalReader<T>(options:QueryOptions,run:(reader:PortalReader,options:QueryOptions)=>Promise<T>,deps?:CliDependencies,headed=false):Promise<T>{
 const browser=await selectedBrowser(resolveDataPaths(deps?.env??process.env));return(deps?.sessionRunner??withSession)('portal',{browser,headless:!headed,deadlineMs:options.deadlineMs,purpose:'query'},async session=>{
  session.page.setDefaultTimeout(Math.max(1,Math.min(30000,options.deadlineMs-Date.now())));const templates=new Map<string,string>();
  const capture=(request:import('playwright').Request)=>{const u=new URL(request.url());if(request.method()==='GET'&&u.origin===PORTAL_ORIGIN&&allowedPaths.has(u.pathname))templates.set(u.pathname,u.toString());};session.page.on('request',capture);
  try{const auth=await visitService('portal',session,options.deadlineMs,false);if(auth.state!=='authenticated')throw new CliFailure('LOGIN_REQUIRED');return await run(createPortalPageReader(session.page,templates),{...options,...session.signal?{signal:session.signal}:{}});}finally{session.page.off('request',capture);}
 });
}
