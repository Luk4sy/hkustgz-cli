import {createServer,type Server} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSessionRunner} from '../session/browser.js';
import {resolveDataPaths} from '../session/paths.js';
import {acquireProfileLock} from '../session/lock.js';
type SmokeResult={ok:true;data:{scope:'loopback-only';browserClosed:true;profileLockReacquired:true;schoolAccessed:false}}|{ok:false;error:{code:string}};
/** Synthetic check only: never accepts a user's existing profile or a school URL. */
export async function runLoopbackSmoke():Promise<SmokeResult>{
 let root:string|undefined,server:Server|undefined,result:SmokeResult;
 try{
  root=await mkdtemp(join(tmpdir(),'hkustgz-windows-smoke-'));const paths=resolveDataPaths({HKUSTGZ_CLI_HOME:join(root,'owned')});
  server=createServer((_req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end('<main>hkustgz-loopback-fixture</main>');});
  await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string')throw Error();const origin='http://127.0.0.1:'+address.port;
  const value=await createSessionRunner(paths,{allowedOrigins:new Set([origin])})('catalog',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+30000},async({page,context})=>{
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
   await page.goto(origin,{timeout:10000});return await page.locator('main').textContent();
  });
  if(value!=='hkustgz-loopback-fixture')throw Error();const lock=await acquireProfileLock(join(paths.profile,'chrome'));await lock.release();
  result={ok:true,data:{scope:'loopback-only',browserClosed:true,profileLockReacquired:true,schoolAccessed:false}};
 }catch{result={ok:false,error:{code:'WINDOWS_SMOKE_FAILED'}};}
 finally{
  if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
  if(root)try{await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{result={ok:false,error:{code:'WINDOWS_SMOKE_CLEANUP_FAILED'}};}
 }
 return result;
}
