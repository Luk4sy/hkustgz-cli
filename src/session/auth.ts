import type {AuthReport,CommandHandler,DataPaths,ServiceId,Session} from '../core/contracts.js';
import {CANVAS_IDENTITY_ORIGIN} from './origins.js';
import {CliFailure} from '../core/errors.js';
import {resolveDataPaths} from './paths.js';
import {browserAvailability,logoutProfiles,selectBrowser,selectedBrowser} from './browser.js';
export interface AuthObservation {
 url:string;loginForm:boolean;challenge:boolean;portalApps:boolean;sisTerm:boolean;sisMeetings:boolean;canvasCourses:boolean;documentReady?:boolean;
}
const entries:Record<ServiceId,string>={portal:'https://myportal.hkust-gz.edu.cn/',sis:'https://sisn.hkust-gz.edu.cn/system/my-calendar',canvas:'https://hkust-gz.instructure.com/courses',catalog:'https://sisn.hkust-gz.edu.cn/cq',booking:'https://booking.hkust-gz.edu.cn/front_page','booking-library':'https://libroombooking.hkust-gz.edu.cn/#/ic/home'};
const supported=new Set<ServiceId>(['portal','sis','canvas']);
export function classifyAuthObservation(service:ServiceId,value:AuthObservation,nowMs:number):AuthReport{
 const url=new URL(value.url);const checkedUrl=url.origin+url.pathname;
 if(value.documentReady===false)return{service,state:'unknown',checkedAt:new Date(nowMs).toISOString(),checkedUrl,reason:'The document is changing during authentication.'};
 let state:AuthReport['state']='unknown';let reason='No verified authenticated-data or login-page evidence.';
 const authOrigin=url.origin==='https://sso.hkust-gz.edu.cn'||url.origin==='https://2fa.hkust-gz.edu.cn'||service==='canvas'&&url.origin===CANVAS_IDENTITY_ORIGIN;
 const serviceOrigin=url.origin===new URL(entries[service]).origin;
 if((authOrigin||serviceOrigin)&&(value.loginForm||value.challenge||url.pathname==='/Account/Login'||url.origin==='https://2fa.hkust-gz.edu.cn')){
  state='unauthenticated';reason='Normal school authentication requires user interaction.';
 }else if(serviceOrigin&&((service==='portal'&&url.pathname==='/'&&value.portalApps)||(service==='sis'&&url.pathname==='/system/my-calendar'&&value.sisTerm&&value.sisMeetings)||(service==='canvas'&&url.pathname==='/courses'&&value.canvasCourses))){
  state='authenticated';reason='Verified service-specific page data is present.';
 }
 if(!supported.has(service)){state='unknown';reason=service==='catalog'?'Public catalog visibility does not establish account identity.':'Service authentication evidence is incomplete.';}
 return{service,state,checkedAt:new Date(nowMs).toISOString(),checkedUrl,reason};
}
export async function checkAuth(service:ServiceId,session:Session):Promise<AuthReport>{
 const observation=await session.page.evaluate(()=>{
  const text=document.body?.innerText??'';
  return {url:location.href,documentReady:document.body!==null,loginForm:!!document.querySelector('input[type=password]'),challenge:!!document.querySelector('input[autocomplete="one-time-code"],iframe[src*="captcha"],.g-recaptcha'),
   portalApps:text.includes('我的应用')&&text.includes('退出'),sisTerm:!!document.querySelector('input[placeholder="Select"]'),sisMeetings:/\d{4}-\d{2}-\d{2}\s*-\s*\d{4}-\d{2}-\d{2}/.test(text),canvasCourses:!!document.querySelector('#my_courses_table tbody tr a[href^="/courses/"]')};
 });
 return classifyAuthObservation(service,observation,Date.now());
}
/** Follow only the observed SIS Login button. Never fill or submit an authentication form. */
export async function visitService(service:ServiceId,session:Session,deadlineMs:number,interactive:boolean):Promise<AuthReport>{
 const page=session.page;const timeout=()=>Math.max(1,Math.min(30000,deadlineMs-Date.now()));
 let loginClicked=false;let canvasCoursesOpened=false;
 // /login/saml was observed in the school's normal Canvas entry chain.
 // Unauthenticated /courses deep links can instead select a different native-login provider.
 await page.goto(service==='canvas'?'https://hkust-gz.instructure.com/login/saml':entries[service],{timeout:timeout(),waitUntil:'domcontentloaded'});
 const observeUntil=interactive?deadlineMs:Math.min(deadlineMs-250,Date.now()+5000);
 while(Date.now()<observeUntil){
  if(session.signal?.aborted)throw new CliFailure('QUERY_TIMEOUT');
  let report:AuthReport|undefined;
  try{report=await checkAuth(service,session);}catch(e){
   if(!(e instanceof Error)||!/Execution context was destroyed|Cannot find context with specified id/.test(e.message))throw e;
  }
  if(report?.state==='authenticated'||(report?.state==='unauthenticated'&&!interactive))return report;
  const current=new URL(page.url());
  if(service==='sis'&&!loginClicked&&current.origin==='https://sisn.hkust-gz.edu.cn'&&current.pathname==='/auth-sign'){
   const login=page.getByRole('button',{name:'Login',exact:true});
   if(await login.isVisible()){await login.click({timeout:timeout()});loginClicked=true;continue;}
  }
  if(service==='canvas'&&!canvasCoursesOpened&&current.origin==='https://hkust-gz.instructure.com'&&current.pathname!=='/courses'){
   const courses=page.locator('#menu a[href="/courses"]');
   if(await courses.isVisible()){await courses.click({timeout:timeout()});canvasCoursesOpened=true;continue;}
  }
  // Waiting is DOM-only: no additional requests, polling clicks, password reads or credential storage.
  await new Promise<void>((resolve,reject)=>{
   const done=()=>{clearTimeout(timer);session.signal?.removeEventListener('abort',aborted);resolve();};
   const aborted=()=>{clearTimeout(timer);session.signal?.removeEventListener('abort',aborted);reject(new CliFailure('QUERY_TIMEOUT'));};
   const timer=setTimeout(done,Math.min(200,Math.max(1,observeUntil-Date.now())));session.signal?.addEventListener('abort',aborted,{once:true});
  });
 }
 try{return await checkAuth(service,session);}catch(error){
  if(!(error instanceof Error)||!/Execution context was destroyed|Cannot find context with specified id/.test(error.message))throw error;
  return classifyAuthObservation(service,{url:page.url(),documentReady:false,loginForm:false,challenge:false,portalApps:false,sisTerm:false,sisMeetings:false,canvasCourses:false},Date.now());
 }
}
export function createControlHandlers():Record<string,CommandHandler>{
 const result=(command:string,data:unknown)=>({ok:true as const,data,meta:{schemaVersion:'1' as const,command}});
 const dataPaths=(env:NodeJS.ProcessEnv|undefined):DataPaths=>resolveDataPaths(env??process.env);
 return {
  'browser.status':async(_,deps)=>result('browser status',{selected:await selectedBrowser(dataPaths(deps.env)),items:await browserAvailability(),platform:process.platform,platformAcceptance:'not-verified-for-distribution'}),
  'browser.use':async(args,deps)=>{const browser=args.browser as 'chrome'|'edge'|'chromium';await selectBrowser(dataPaths(deps.env),browser);return result('browser use',{browser});},
  'auth.logout':async(_,deps)=>{await logoutProfiles(dataPaths(deps.env));return result('auth logout',{localProfilesCleared:true,schoolSessionsRevoked:false});},
  'auth.login':async(args,deps)=>{
   const service=args.service as ServiceId;if(!supported.has(service))throw new CliFailure('CAPABILITY_PENDING');
   const browser=await selectedBrowser(dataPaths(deps.env));const deadlineMs=Date.now()+600000;
   const report=await deps.sessionRunner(service,{browser,deadlineMs,headless:false,purpose:'login'},session=>visitService(service,session,deadlineMs,true));
   if(report.state!=='authenticated')throw new CliFailure('LOGIN_REQUIRED',`Run hkustgz-cli auth login ${service} and complete normal school authentication.`);
   return result('auth login',report);
  },
  'auth.status':async(args,deps)=>{
   const services:ServiceId[]=args.all?['portal','sis','catalog','canvas','booking','booking-library']:[args.service as ServiceId];
   const browser=await selectedBrowser(dataPaths(deps.env));const deadlineMs=Date.now()+90000;const items:AuthReport[]=[];
   for(const service of services){
    if(!supported.has(service)){
     items.push(classifyAuthObservation(service,{url:entries[service],loginForm:false,challenge:false,portalApps:false,sisTerm:false,sisMeetings:false,canvasCourses:false},Date.now()));
    }else items.push(await deps.sessionRunner(service,{browser,deadlineMs,headless:true,purpose:'query'},session=>visitService(service,session,deadlineMs,false)));
   }
   return result('auth status',{items});
  },
 };
}
