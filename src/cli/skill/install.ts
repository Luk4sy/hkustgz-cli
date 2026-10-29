import fs from 'node:fs';
import {hostname} from 'node:os';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {CliFailure} from '../../core/errors.js';
import type {SkillChangeReport} from '../../core/contracts.js';
import type {BundleInfo} from './bundle.js';
import {checkTarget,safePath,type SkillTarget} from './paths.js';
import {MANIFEST,ManifestSchema,bundleManifest,exists,expectedEntries,hashFile,inventory,ownedUnchanged,readManifest,type SkillManifest} from './manifest.js';
export type {SkillChangeReport} from '../../core/contracts.js';
function failure(error:unknown):never{if(error instanceof CliFailure)throw error;throw new CliFailure('SKILL_OPERATION_FAILED');}
function claimLock(target:SkillTarget):{lock:string;release:()=>void}{
 const lock=target.destination+'.lock';safePath(target.skillsRoot);fs.mkdirSync(target.skillsRoot,{recursive:true,mode:0o700});checkTarget(target);
 try{fs.mkdirSync(lock,{mode:0o700});}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new CliFailure('SKILL_OPERATION_FAILED');throw error;}
 const token=randomUUID();fs.writeFileSync(join(lock,'owner.json'),JSON.stringify({tool:'hkustgz-cli',pid:process.pid,hostname:hostname(),token}),{flag:'wx',mode:0o600});
 return{lock,release:()=>{safePath(lock);const owner=JSON.parse(fs.readFileSync(join(lock,'owner.json'),'utf8'));if(owner.token!==token)throw new CliFailure('SKILL_OPERATION_FAILED');const entries=fs.readdirSync(lock);if(entries.length!==1||entries[0]!=='owner.json')throw new CliFailure('SKILL_OPERATION_FAILED');fs.unlinkSync(join(lock,'owner.json'));fs.rmdirSync(lock);}};
}
function removeOwned(root:string):void{
 const manifest=readManifest(root);if(!manifest||!ownedUnchanged(root,manifest))throw new CliFailure('SKILL_OPERATION_FAILED');
 for(const name of expectedEntries(manifest).filter(s=>!s.endsWith('/')))fs.unlinkSync(join(root,name));
 for(const name of expectedEntries(manifest).filter(s=>s.endsWith('/')).sort((a,b)=>b.length-a.length))fs.rmdirSync(join(root,name));fs.rmdirSync(root);
}
function removeStage(root:string):void{
 const manifest=readManifest(root);const names=inventory(root);
 if(!manifest){if(names.length===0){fs.rmdirSync(root);return;}throw new CliFailure('SKILL_OPERATION_FAILED');}
 const allowed=new Set(expectedEntries(manifest));
 if(names.some(name=>!allowed.has(name)))throw new CliFailure('SKILL_OPERATION_FAILED');
 for(const name of names.filter(n=>n!==MANIFEST&&!n.endsWith('/'))){safePath(dirname(join(root,name)));if(hashFile(join(root,name))!==manifest.files[name])throw new CliFailure('SKILL_OPERATION_FAILED');}
 for(const name of names.filter(n=>!n.endsWith('/')))fs.unlinkSync(join(root,name));
 for(const name of names.filter(n=>n.endsWith('/')).sort((a,b)=>b.length-a.length))fs.rmdirSync(join(root,name));fs.rmdirSync(root);
}
function readRegularJson(path:string):unknown{if(!fs.lstatSync(path).isFile()||fs.lstatSync(path).isSymbolicLink())throw new CliFailure('SKILL_OPERATION_FAILED');return JSON.parse(fs.readFileSync(path,'utf8'));}
// Read-only status never recovers. A mutating call may recover only a positively dead,
// same-host producer with a complete ownership journal and no unexpected entries.
function recoverTransaction(target:SkillTarget):void{
 const lock=target.destination+'.lock';if(!exists(lock))return;safePath(lock);
 const owner=readRegularJson(join(lock,'owner.json')) as Record<string,unknown>;
 if(owner.tool!=='hkustgz-cli'||owner.hostname!==hostname()||!Number.isSafeInteger(owner.pid)||Number(owner.pid)<=0||typeof owner.token!=='string'||!/^[a-f0-9-]{36}$/.test(owner.token))throw new CliFailure('SKILL_OPERATION_FAILED');
 let dead=false;try{process.kill(Number(owner.pid),0);}catch(error){dead=(error as NodeJS.ErrnoException).code==='ESRCH';}if(!dead)throw new CliFailure('SKILL_OPERATION_FAILED');
 const entries=fs.readdirSync(lock);if(entries.some(name=>!['owner.json','transaction.json','stage','backup'].includes(name)))throw new CliFailure('SKILL_OPERATION_FAILED');
 const raw=readRegularJson(join(lock,'transaction.json')) as {before:unknown;next:unknown};
 const before=raw.before===null?null:ManifestSchema.parse(raw.before);const next=ManifestSchema.parse(raw.next);
 const backup=join(lock,'backup'),stage=join(lock,'stage');
 if(exists(backup)){safePath(backup);if(!before||!ownedUnchanged(backup,before)||JSON.stringify(readManifest(backup))!==JSON.stringify(before))throw new CliFailure('SKILL_OPERATION_FAILED');}
 if(exists(stage))safePath(stage);
 if(exists(target.destination)){
  checkTarget(target);const manifest=readManifest(target.destination);
  if(!manifest||!ownedUnchanged(target.destination,manifest)||![before,next].some(m=>m&&JSON.stringify(m)===JSON.stringify(manifest)))throw new CliFailure('SKILL_OPERATION_FAILED');
 }else if(before&&!exists(backup))throw new CliFailure('SKILL_OPERATION_FAILED');
 // Recovery itself is exclusive. A crash during recovery leaves a visible manual-inspection marker.
 fs.mkdirSync(join(lock,'recover'),{mode:0o700});
 try{
  checkTarget(target);
  if(!exists(target.destination)&&exists(backup))fs.renameSync(backup,target.destination);
  if(exists(stage))removeStage(stage);
  if(exists(backup))removeOwned(backup);
  fs.unlinkSync(join(lock,'transaction.json'));fs.unlinkSync(join(lock,'owner.json'));fs.rmdirSync(join(lock,'recover'));fs.rmdirSync(lock);
 }catch(error){throw new CliFailure('SKILL_OPERATION_FAILED');}
}
function verifySame(root:string,before:SkillManifest|null):void{
 if(before){const now=readManifest(root);if(!now||JSON.stringify(now)!==JSON.stringify(before)||!ownedUnchanged(root,before))throw new CliFailure('SKILL_CONFLICT');}
 else if(exists(root))throw new CliFailure('SKILL_CONFLICT');
}
export async function installSkill(target:SkillTarget,bundle:BundleInfo,options:{dryRun:boolean}):Promise<SkillChangeReport>{
 try{
 checkTarget(target);if(!options.dryRun)recoverTransaction(target);const next=bundleManifest(bundle);const before=exists(target.destination)?readManifest(target.destination):null;
 if(exists(target.destination)&&(!before||!ownedUnchanged(target.destination,before)))throw new CliFailure('SKILL_CONFLICT');
 if(exists(target.destination+'.lock'))throw new CliFailure('SKILL_OPERATION_FAILED');
 const identical=before&&JSON.stringify(before)===JSON.stringify(next);
 const report:SkillChangeReport={action:'install',dryRun:options.dryRun,changed:identical?[]:[...Object.keys(next.files)],preserved:[],complete:true};
 if(options.dryRun||identical)return report;
 const {lock,release}=claimLock(target);const stage=join(lock,'stage'),backup=join(lock,'backup');
 try{
  fs.writeFileSync(join(lock,'transaction.json'),JSON.stringify({before,next}),{flag:'wx',mode:0o600});
  fs.mkdirSync(stage,{mode:0o700});
  // Write the manifest first: even interrupted staging has an explicit ownership list.
  fs.writeFileSync(join(stage,MANIFEST),JSON.stringify(next),{flag:'wx',mode:0o600});
  for(const name of Object.keys(next.files)){fs.mkdirSync(dirname(join(stage,name)),{recursive:true,mode:0o700});fs.writeFileSync(join(stage,name),fs.readFileSync(join(bundle.root,name)),{flag:'wx',mode:0o600});}
  if(!ownedUnchanged(stage,next))throw new CliFailure('SKILL_OPERATION_FAILED');
  checkTarget(target);verifySame(target.destination,before);
  if(before)fs.renameSync(target.destination,backup);
  try{checkTarget(target);if(exists(target.destination))throw new CliFailure('SKILL_CONFLICT');fs.renameSync(stage,target.destination);}
  catch(error){if(before&&!exists(target.destination))fs.renameSync(backup,target.destination);throw error;}
  if(before)removeOwned(backup);
 }finally{
  if(exists(stage)){
   // Delete only stage files still matching our manifest; otherwise retain the lock for inspection.
   removeStage(stage);
  }
  if(!exists(stage)&&!exists(backup)){if(exists(join(lock,'transaction.json')))fs.unlinkSync(join(lock,'transaction.json'));release();}
 }
 return report;
 }catch(error){failure(error);}
}
export async function uninstallSkill(target:SkillTarget,bundle:BundleInfo,options:{dryRun:boolean}):Promise<SkillChangeReport>{
 try{
 checkTarget(target);if(!options.dryRun)recoverTransaction(target);if(exists(target.destination+'.lock'))throw new CliFailure('SKILL_OPERATION_FAILED');
 const report:SkillChangeReport={action:'uninstall',dryRun:options.dryRun,changed:[],preserved:[],complete:true};
 if(!exists(target.destination))return report;
 const manifest=readManifest(target.destination);if(!manifest)throw new CliFailure('SKILL_CONFLICT');
 const allowed=new Set(expectedEntries(manifest));
 for(const name of inventory(target.destination)){
  if(name===MANIFEST||name.endsWith('/')&&allowed.has(name))continue;
  if(!name.endsWith('/')&&Object.hasOwn(manifest.files,name)){
   try{safePath(dirname(join(target.destination,name)));if(hashFile(join(target.destination,name))===manifest.files[name]){report.changed.push(name);continue;}}catch{}
  }
  report.preserved.push(name);
 }
 report.complete=report.preserved.length===0;
 if(options.dryRun)return report;
 const {release}=claimLock(target);
 try{
  checkTarget(target);
  const now=readManifest(target.destination);if(!now||JSON.stringify(now)!==JSON.stringify(manifest))throw new CliFailure('SKILL_CONFLICT');
  for(const name of report.changed){safePath(dirname(join(target.destination,name)));if(hashFile(join(target.destination,name))!==manifest.files[name])throw new CliFailure('SKILL_CONFLICT');fs.unlinkSync(join(target.destination,name));}
  for(const dir of expectedEntries(manifest).filter(s=>s.endsWith('/')).sort((a,b)=>b.length-a.length))if(exists(join(target.destination,dir))){safePath(join(target.destination,dir));if(fs.readdirSync(join(target.destination,dir)).length===0)fs.rmdirSync(join(target.destination,dir));}
  if(report.complete){if(inventory(target.destination).some(name=>name!==MANIFEST))throw new CliFailure('SKILL_CONFLICT');fs.unlinkSync(join(target.destination,MANIFEST));fs.rmdirSync(target.destination);}
 }finally{release();}
 return report;
 }catch(error){failure(error);}
}
