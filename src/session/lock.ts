import {mkdir,readFile,writeFile,unlink,rmdir,lstat,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {hostname} from 'node:os';
import {join} from 'node:path';
import {CliFailure} from '../core/errors.js';
export async function acquireProfileLock(profile:string):Promise<{release:()=>Promise<void>}>{
 const path=profile+'.lock';const token=randomUUID();
 try{await mkdir(path,{mode:0o700});}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new CliFailure('PROFILE_BUSY');throw e;}
 const ownerFile=join(path,'owner.json');
 try{await writeFile(ownerFile,JSON.stringify({tool:'hkustgz-cli',pid:process.pid,hostname:hostname(),token,createdAt:new Date().toISOString()}),{flag:'wx',mode:0o600});}
 catch(e){await rmdir(path).catch(()=>{});throw e;}
 let released=false;
 return{release:async()=>{
  if(released)return;
  try{
   if((await lstat(path)).isSymbolicLink()||(await lstat(ownerFile)).isSymbolicLink())throw new Error();
   const owner=JSON.parse(await readFile(ownerFile,'utf8')) as {token?:unknown};if(owner.token!==token)throw new Error();
   const entries=await readdir(path);if(entries.length!==1||entries[0]!=='owner.json')throw new Error();
   await unlink(ownerFile);await rmdir(path);released=true;
  }catch{throw new CliFailure('CLEANUP_FAILED','Profile lock ownership could not be verified or released. Inspect it manually; no process was terminated.');}
 }};
}
