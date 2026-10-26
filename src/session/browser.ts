import {access,lstat,readFile,readdir,rename,writeFile,rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import type {BrowserContext,Page} from 'playwright';
import type {DataPaths,SessionOptions,SessionRunner} from '../core/contracts.js';
import {CliFailure,classifyError} from '../core/errors.js';
import {assertOwned,claimDirectory,ensureDataPaths,resolveDataPaths} from './paths.js';
import {acquireProfileLock} from './lock.js';
export type BrowserName=SessionOptions['browser'];
export const BROWSERS:BrowserName[]=['chrome','edge','chromium'];
export async function selectedBrowser(paths:DataPaths):Promise<BrowserName>{
 try{const info=await lstat(paths.root);if(info.isSymbolicLink()||!info.isDirectory())throw new CliFailure('INVALID_DATA_HOME');if(!(await readdir(paths.root)).length)return 'chrome';}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return 'chrome';throw e;}
 await assertOwned(paths.root);
 try{
  const file=join(paths.root,'config.json');if((await lstat(file)).isSymbolicLink())throw new CliFailure('INVALID_DATA_HOME');
  const value=JSON.parse(await readFile(file,'utf8')) as {browser?:BrowserName};
  if(!BROWSERS.includes(value.browser!))throw new CliFailure('INVALID_DATA_HOME');return value.browser!;
 }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return 'chrome';throw e;}
}
export async function selectBrowser(paths:DataPaths,browser:BrowserName):Promise<void>{
 if(!BROWSERS.includes(browser))throw new CliFailure('INVALID_ARGUMENT');await ensureDataPaths(paths);
 const temp=join(paths.root,`.config-${randomUUID()}.tmp`);
 try{await writeFile(temp,JSON.stringify({schemaVersion:1,browser}),{flag:'wx',mode:0o600});await rename(temp,join(paths.root,'config.json'));}finally{await rm(temp,{force:true});}
}
export async function browserAvailability():Promise<Array<{browser:BrowserName;available:boolean}>>{
 const {chromium}=await import('playwright');
 const paths:Record<BrowserName,string|null>={chrome:process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':null,edge:process.platform==='darwin'?'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge':null,chromium:chromium.executablePath()};
 return Promise.all(BROWSERS.map(async browser=>({browser,available:paths[browser]!==null&&await access(paths[browser]!,constants.X_OK).then(()=>true,()=>false)})));
}
const origins=new Set(['https://myportal.hkust-gz.edu.cn','https://sisn.hkust-gz.edu.cn','https://sso.hkust-gz.edu.cn','https://2fa.hkust-gz.edu.cn','https://hkust-gz.instructure.com','https://sso.canvaslms.com','https://booking.hkust-gz.edu.cn','https://libroombooking.hkust-gz.edu.cn']);
// Playwright routes see only the first request in an HTTP redirect chain.
// Chromium Fetch pauses every document hop before the destination receives it.
async function guardRedirects(context:BrowserContext,page:Page,allowed:ReadonlySet<string>,blocked:(url:string)=>void):Promise<void>{
 const client=await context.newCDPSession(page);
 let mainFrameId=(await client.send('Page.getFrameTree')).frameTree.frame.id;
 client.on('Page.frameNavigated',event=>{if(!event.frame.parentId)mainFrameId=event.frame.id;});
 client.on('Fetch.requestPaused',event=>{
  const deny=event.frameId===mainFrameId&&!allowed.has(new URL(event.request.url).origin);
  if(deny)blocked(event.request.url);
  void client.send(deny?'Fetch.failRequest':'Fetch.continueRequest',deny?{requestId:event.requestId,errorReason:'BlockedByClient'}:{requestId:event.requestId}).catch(()=>{});
 });
 await client.send('Fetch.enable',{patterns:[{urlPattern:'*',resourceType:'Document',requestStage:'Request'}]});
}
type Launch=(profile:string,options:SessionOptions&{timeout:number})=>Promise<BrowserContext>;
const launch:Launch=async(profile,options)=>{
 const {chromium}=await import('playwright');
 try{return await chromium.launchPersistentContext(profile,{...(options.browser==='chromium'?{}:{channel:options.browser==='edge'?'msedge':'chrome'}),
  headless:options.headless,timeout:options.timeout,acceptDownloads:false,chromiumSandbox:true,
  ignoreDefaultArgs:['--password-store=basic','--use-mock-keychain','--unsafely-disable-devtools-self-xss-warnings']});}
 catch(e){if(e instanceof Error&&e.name==='TimeoutError')throw new CliFailure('QUERY_TIMEOUT');throw new CliFailure('BROWSER_UNAVAILABLE');}
};
export function createSessionRunner(paths:DataPaths,dependencies:{launch?:Launch;signals?:EventEmitter;allowedOrigins?:ReadonlySet<string>}={}):SessionRunner{
 return async(service,options,run)=>{
  if(options.deadlineMs<=Date.now())throw new CliFailure('QUERY_TIMEOUT');
  await ensureDataPaths(paths);const profile=join(paths.profile,options.browser);
  const lock=await acquireProfileLock(profile);
  let context:BrowserContext|undefined;let closing:Promise<void>|undefined;let primary:unknown;let failed=false;let navigationBlocked=false;
  let navigationFailure:CliFailure|undefined;
  const blocked=(value:string)=>{navigationBlocked=true;const url=new URL(value);navigationFailure=new CliFailure('ADAPTER_CHANGED','An unverified navigation was blocked. Update the verified service redirect evidence before retrying.');navigationFailure.cause={origin:url.origin,path:url.pathname};};
  const guardedPages=new WeakSet<Page>();const allowed=dependencies.allowedOrigins??origins;
  const signals=dependencies.signals??process;const abort=new AbortController();
  let cancelled:CliFailure|undefined;let rejectCancellation!:(error:CliFailure)=>void;
  const cancellation=new Promise<never>((_,reject)=>{rejectCancellation=reject;});
  // A signal can arrive during browser launch; keep the rejection observed until the callback race exists.
  void cancellation.catch(()=>{});
  const close=()=>closing??(closing=Promise.resolve().then(async()=>{if(context)await context.close();}));
  const cancel=(code:string)=>{if(cancelled)return;cancelled=new CliFailure(code);abort.abort();rejectCancellation(cancelled);if(context)void close().catch(()=>{});};
  const int=()=>cancel('INTERRUPTED');const term=()=>cancel('TERMINATED');
  signals.on('SIGINT',int);signals.on('SIGTERM',term);
  const timer=setTimeout(()=>cancel('QUERY_TIMEOUT'),Math.max(1,options.deadlineMs-Date.now()));
  try{
   await claimDirectory(profile);
   if(cancelled)throw cancelled;
   context=await (dependencies.launch??launch)(profile,{...options,timeout:Math.max(1,Math.min(30000,options.deadlineMs-Date.now()))});
   if(cancelled)throw cancelled;
   await context.route('**/*',async route=>{
    const req=route.request();
    if(req.isNavigationRequest()&&!req.frame().parentFrame()&&(!guardedPages.has(req.frame().page())||!allowed.has(new URL(req.url()).origin))){blocked(req.url());return route.abort('blockedbyclient');}
    await route.continue();
   });
   const page=await context.newPage();
   if(cancelled)throw cancelled;
   await guardRedirects(context,page,allowed,blocked);guardedPages.add(page);
   const result=await Promise.race([run({service,page,context,signal:abort.signal}),cancellation]);
   if(navigationBlocked)throw navigationFailure;
   return result;
  }catch(error){
   primary=cancelled??(navigationBlocked?navigationFailure:error);failed=true;
   if(!cancelled&&!navigationBlocked&&error instanceof Error){
    if(error.name==='TimeoutError')primary=new CliFailure('QUERY_TIMEOUT');
    else if(/net::ERR_(CONNECTION_REFUSED|CONNECTION_RESET|CONNECTION_CLOSED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|NETWORK_CHANGED|TIMED_OUT|ADDRESS_UNREACHABLE|PROXY_CONNECTION_FAILED|TUNNEL_CONNECTION_FAILED|EMPTY_RESPONSE)/.test(error.message))primary=new CliFailure('NETWORK_REQUIRED');
   }
   throw primary;
  }
  finally{
   clearTimeout(timer);
   let cleanupTimer:ReturnType<typeof setTimeout>|undefined;
   try{
    await Promise.race([close(),new Promise<never>((_,reject)=>{cleanupTimer=setTimeout(()=>reject(new CliFailure('CLEANUP_FAILED')),5000);})]);
    await lock.release();
   }
   catch{throw new CliFailure('CLEANUP_FAILED',`Session cleanup failed; the profile may remain locked. Original result: ${cancelled?cancelled.code:failed?classifyError(primary).error.code:'success'}. Inspect the owned browser and lock manually.`);}
   finally{
    if(cleanupTimer)clearTimeout(cleanupTimer);
    signals.removeListener('SIGINT',int);signals.removeListener('SIGTERM',term);
   }
   if(cancelled)throw cancelled;
  }
 };
}
export const withSession:SessionRunner=(...args)=>createSessionRunner(resolveDataPaths(process.env))(...args);
export async function logoutProfiles(paths:DataPaths):Promise<void>{
 try{await lstat(paths.root);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
 await assertOwned(paths.root);await ensureDataPaths(paths);
 const locks:Array<{release:()=>Promise<void>}>=[];
 try{
  for(const browser of BROWSERS)locks.push(await acquireProfileLock(join(paths.profile,browser)));
  // Validate every profile before deleting any one of them.
  for(const browser of BROWSERS){const p=join(paths.profile,browser);try{await lstat(p);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e;}await assertOwned(p);}
  for(const browser of BROWSERS)await rm(join(paths.profile,browser),{recursive:true,force:true});
 }finally{for(const lock of locks.reverse())await lock.release();}
}
