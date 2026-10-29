import {homedir} from 'node:os';
import {isAbsolute,join,parse,resolve} from 'node:path';
import {lstat,mkdir,readFile,readdir,writeFile,chmod} from 'node:fs/promises';
import type {DataPaths} from '../core/contracts.js';
import {canonicalDirectoryPath} from '../core/safe-directory.js';
import {CliFailure} from '../core/errors.js';
export const OWNER_FILE='.hkustgz-cli-owner.json';
const identity='hkustgz-cli';
export function resolveDataPaths(env:NodeJS.ProcessEnv):DataPaths {
 const root=env.HKUSTGZ_CLI_HOME??join(homedir(),'.hkustgz-cli');
 if(!isAbsolute(root)||resolve(root)===parse(root).root)throw new CliFailure('INVALID_DATA_HOME');
 if(process.platform==='win32')canonicalDirectoryPath(root,'INVALID_DATA_HOME');
 const normalized=resolve(root);
 return{root:normalized,profile:join(normalized,'profiles'),cache:join(normalized,'cache'),logs:join(normalized,'logs')};
}
export async function privateDirectory(path:string):Promise<void>{
 if(process.platform==='win32')canonicalDirectoryPath(path,'INVALID_DATA_HOME');
 await mkdir(path,{recursive:true,mode:0o700});
 const info=await lstat(path);if(info.isSymbolicLink()||!info.isDirectory())throw new CliFailure('INVALID_DATA_HOME');
 if(process.platform!=='win32')await chmod(path,0o700);
}
export async function assertOwned(path:string):Promise<void>{
 try{
  const info=await lstat(path);const marker=await lstat(join(path,OWNER_FILE));
  if(!info.isDirectory()||info.isSymbolicLink()||!marker.isFile()||marker.isSymbolicLink())throw new Error();
  const owner=JSON.parse(await readFile(join(path,OWNER_FILE),'utf8')) as {tool?:unknown;schemaVersion?:unknown};
  if(owner.tool!==identity||owner.schemaVersion!==1)throw new Error();
 }catch{throw new CliFailure('INVALID_DATA_HOME');}
}
export async function claimDirectory(path:string):Promise<void>{
 if(process.platform==='win32')canonicalDirectoryPath(path,'INVALID_DATA_HOME');
 try{await lstat(path);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await mkdir(path,{recursive:true,mode:0o700});}
 const info=await lstat(path);if(info.isSymbolicLink()||!info.isDirectory())throw new CliFailure('INVALID_DATA_HOME');
 const entries=await readdir(path);
 if(!entries.length){try{await writeFile(join(path,OWNER_FILE),JSON.stringify({tool:identity,schemaVersion:1}),{flag:'wx',mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}}
 await assertOwned(path);await privateDirectory(path);
}
export async function ensureDataPaths(paths:DataPaths):Promise<void>{
 await claimDirectory(paths.root);
 for(const path of [paths.profile,paths.cache,paths.logs])await privateDirectory(path);
}
