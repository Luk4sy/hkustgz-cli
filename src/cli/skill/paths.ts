import fs from 'node:fs';
import {homedir} from 'node:os';
import {isAbsolute,join,parse,resolve,sep} from 'node:path';
import {CliFailure} from '../../core/errors.js';
export interface SkillTarget {kind:'codex'|'directory';skillsRoot:string;destination:string}
export function safePath(input:string):string{
 if(!isAbsolute(input)||input.split(/[\\/]/).includes('..')||input.includes('\0'))throw new CliFailure('UNSAFE_SKILL_TARGET');
 let path=resolve(input);
 if(process.platform==='darwin')for(const alias of ['/var','/tmp','/etc'])if(path===alias||path.startsWith(alias+'/')){path=fs.realpathSync(alias)+path.slice(alias.length);break;}
 let current=parse(path).root;
 for(const part of path.slice(current.length).split(sep).filter(Boolean)){
  current=join(current,part);try{const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw new CliFailure('UNSAFE_SKILL_TARGET');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')break;throw error;}
 }
 return path;
}
export function resolveSkillTarget(input:{target?:'codex';dir?:string},env:NodeJS.ProcessEnv):SkillTarget{
 if(input.target&&input.dir)throw new CliFailure('INVALID_ARGUMENT');
 const base=input.dir??join(env.CODEX_HOME??join(homedir(),'.codex'),'skills');
 if(env.CODEX_HOME!==undefined&&!isAbsolute(env.CODEX_HOME)&&!input.dir)throw new CliFailure('UNSAFE_SKILL_TARGET');
 if(resolve(base)===parse(resolve(base)).root)throw new CliFailure('UNSAFE_SKILL_TARGET');
 const skillsRoot=safePath(base);return{kind:input.dir?'directory':'codex',skillsRoot,destination:join(skillsRoot,'hkustgz-cli')};
}
export function checkTarget(target:SkillTarget):void{
 if(target.destination!==join(target.skillsRoot,'hkustgz-cli')||safePath(target.skillsRoot)!==target.skillsRoot||safePath(target.destination)!==target.destination)throw new CliFailure('UNSAFE_SKILL_TARGET');
}
