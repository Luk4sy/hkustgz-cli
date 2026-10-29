import fs from 'node:fs';
import {isAbsolute,join,parse,resolve,sep} from 'node:path';
import {assertWindowsLocalPath} from './windows-path.js';
import {CliFailure} from './errors.js';
export function canonicalDirectoryPath(input:string,code:'UNSAFE_SKILL_TARGET'|'INVALID_DATA_HOME'='UNSAFE_SKILL_TARGET'):string{
 if(!isAbsolute(input)||input.split(/[\\/]/).includes('..')||input.includes('\0'))throw new CliFailure(code);
 if(process.platform==='win32'){try{assertWindowsLocalPath(input);}catch{throw new CliFailure(code);}}
 let path=resolve(input);
 if(process.platform==='darwin')for(const alias of ['/var','/tmp','/etc'])if(path===alias||path.startsWith(alias+'/')){path=fs.realpathSync(alias)+path.slice(alias.length);break;}
 let current=parse(path).root;
 for(const part of path.slice(current.length).split(sep).filter(Boolean)){
  current=join(current,part);try{const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw new CliFailure(code);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')break;throw error;}
 }
 return path;
}
