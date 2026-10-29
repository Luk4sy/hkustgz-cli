import {homedir} from 'node:os';
import {isAbsolute,join,parse,resolve} from 'node:path';
import {canonicalDirectoryPath} from '../../core/safe-directory.js';
import {CliFailure} from '../../core/errors.js';
export interface SkillTarget {kind:'codex'|'directory';skillsRoot:string;destination:string}
export function safePath(input:string):string{return canonicalDirectoryPath(input);}
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
