import {lstat,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {win32} from 'node:path';
import {assertWindowsLocalPath} from '../core/windows-path.js';
export function chromeCandidates(platform:NodeJS.Platform,env:NodeJS.ProcessEnv):string[]{
 if(platform==='darwin')return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
 if(platform!=='win32')return [];
 const value=(name:string)=>env[Object.keys(env).find(key=>key.toLowerCase()===name.toLowerCase())??name];
 const roots=['PROGRAMW6432','ProgramFiles','ProgramFiles(x86)','LOCALAPPDATA'].map(value).filter((v):v is string=>Boolean(v));
 const paths:string[]=[];
 for(const root of roots){try{assertWindowsLocalPath(root);}catch{continue;}const candidate=win32.join(root,'Google','Chrome','Application','chrome.exe');if(!paths.some(path=>path.toLowerCase()===candidate.toLowerCase()))paths.push(candidate);}
 return paths;
}
export async function findChrome(platform:NodeJS.Platform=process.platform,env:NodeJS.ProcessEnv=process.env,probe?:(path:string)=>Promise<boolean>):Promise<string|null>{
 const available=probe??(async(path:string)=>{try{const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink())return false;await access(path,platform==='win32'?constants.F_OK:constants.X_OK);return true;}catch{return false;}});
 for(const path of chromeCandidates(platform,env))if(await available(path))return path;return null;
}
