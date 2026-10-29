import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {hostname} from 'node:os';
import {join} from 'node:path';
import type {CliDependencies,CommandHandler,DoctorCheck,DoctorProbes,DoctorReport} from '../core/contracts.js';
import {DoctorReportSchema} from '../core/contracts.js';
import {CliFailure} from '../core/errors.js';
import {browserAvailability,selectedBrowser,BROWSERS} from '../session/browser.js';
import {assertOwned,resolveDataPaths} from '../session/paths.js';
import {safePath,resolveSkillTarget} from './skill/paths.js';
import {readBundleInfo} from './skill/bundle.js';
import {inspectSkill} from './skill/manifest.js';
const {version}=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')) as {version:string};
async function present(path:string):Promise<boolean>{try{await fs.lstat(path);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}}
const production:DoctorProbes={
 runtime:()=>({nodeVersion:process.version,platform:process.platform,arch:process.arch}),
 data:async env=>{
  const paths=resolveDataPaths(env);
  try{
   safePath(paths.root);
   if(!await present(paths.root))return 'absent';
   if((await fs.readdir(paths.root)).length)await assertOwned(paths.root);
   for(const path of [paths.profile,paths.cache,paths.logs])safePath(path);
   let state:'safe'|'busy'|'unknown-lock'='safe';
   for(const browser of BROWSERS){
    const profile=join(paths.profile,browser);safePath(profile);
    if(await present(profile))await assertOwned(profile);
    const lock=profile+'.lock';if(!await present(lock))continue;
    // A lock can be unowned or stale. Never follow a lock symlink or mutate it.
    let busy=false;
    try{
     const stat=await fs.lstat(lock);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error();
     const marker=join(lock,'owner.json');const file=await fs.lstat(marker);if(!file.isFile()||file.isSymbolicLink())throw Error();
     const owner=JSON.parse(await fs.readFile(marker,'utf8'));
     if(owner.tool==='hkustgz-cli'&&owner.hostname===hostname()&&Number.isSafeInteger(owner.pid)&&owner.pid>0){process.kill(owner.pid,0);busy=true;}
    }catch{}
    if(!busy)state='unknown-lock';else if(state!=='unknown-lock')state='busy';
   }
   return state;
  }catch(error){if(error instanceof CliFailure)throw new CliFailure('INVALID_DATA_HOME');throw error;}
 },
 browser:async env=>{
  const selected=await selectedBrowser(resolveDataPaths(env));const availability=await browserAvailability();
  return{selected,chromeAvailable:availability.some(item=>item.browser==='chrome'&&item.available)};
 },
 skill:async env=>{
  const bundle=await readBundleInfo();try{return await inspectSkill(resolveSkillTarget({},env),bundle);}catch(error){if(error instanceof CliFailure)return{state:'unavailable',installedVersion:null,expectedVersion:bundle.version};throw error;}
 },
};
export async function getDoctorReport(deps:CliDependencies):Promise<DoctorReport>{
 const probes=deps.doctorProbes??production;const runtime=probes.runtime();const checks:DoctorCheck[]=[];
 const add=(id:string,status:DoctorCheck['status'],code:string,remediation:string)=>checks.push({id,status,code,remediation});
 const supported=/^v?24\./.test(runtime.nodeVersion);
 add('node',supported?'pass':'fail',supported?'NODE_SUPPORTED':'NODE_UNSUPPORTED',supported?'Node 24.x is available.':'Install Node.js 24.x manually, then run doctor again.');
 add('platform',runtime.platform==='darwin'?'pass':'fail',runtime.platform==='darwin'?'PLATFORM_SUPPORTED':'PLATFORM_UNVERIFIED',runtime.platform==='darwin'?'macOS is the alpha target.':'Use macOS with Google Chrome for this alpha; this platform is not verified.');
 let safe=true;
 try{
  const state=await probes.data(deps.env??process.env);
  add('data',state==='busy'||state==='unknown-lock'?'warn':'pass',state==='absent'?'DATA_HOME_ABSENT':state==='busy'?'PROFILE_BUSY':state==='unknown-lock'?'PROFILE_LOCK_UNKNOWN':'DATA_HOME_SAFE',state==='busy'||state==='unknown-lock'?'Wait for the existing session or inspect the CLI-owned lock manually; do not delete unknown locks.':'The CLI data directory is safe or will be created on explicit use.');
 }catch(error){if(!(error instanceof CliFailure)||error.code!=='INVALID_DATA_HOME')throw error;safe=false;add('data','fail','DATA_HOME_UNSAFE','Set HKUSTGZ_CLI_HOME to a new empty absolute CLI-owned directory.');}
 if(safe){
  const browser=await probes.browser(deps.env??process.env);
  add('browser',browser.chromeAvailable?'pass':'fail',browser.chromeAvailable?'CHROME_AVAILABLE':'CHROME_MISSING',browser.chromeAvailable?'Google Chrome is available; no browser was launched.':'Install Google Chrome manually, then run browser use chrome and doctor.');
  if(browser.selected!=='chrome')add('browser_selection','fail','BROWSER_UNVERIFIED','Run browser use chrome; other browser selections are not verified for this alpha.');
 }else add('browser','warn','BROWSER_NOT_CHECKED','Resolve the unsafe data directory before checking browser selection.');
 const skill=await probes.skill(deps.env??process.env);
 add('skill',skill.state==='current'?'pass':'warn',skill.state==='current'?'SKILL_CURRENT':skill.state==='outdated'?'SKILL_OUTDATED':skill.state==='absent'?'SKILL_ABSENT':'SKILL_NEEDS_ATTENTION',skill.state==='current'?'The installed management Skill matches this CLI.':'Inspect skill status and explicitly install or synchronize the bundled Skill; terminal queries do not require it.');
 const capabilities={verified:0,pending:0,unsupported:0,disabled:0};for(const item of deps.capabilities)capabilities[item.state]++;
 return DoctorReportSchema.parse({cliVersion:version,...runtime,checks,capabilities});
}
export function createDoctorHandler():CommandHandler{
 return async(_args,deps)=>{
  const report=await getDoctorReport(deps);
  if(report.checks.some(check=>check.code==='DATA_HOME_UNSAFE'))throw new CliFailure('INVALID_DATA_HOME',undefined,report);
  if(report.checks.some(check=>check.status==='fail'))throw new CliFailure('ENVIRONMENT_NOT_READY',undefined,report);
  return{ok:true,data:report,meta:{schemaVersion:'1',command:'doctor'}};
 };
}
