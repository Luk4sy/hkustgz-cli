import type {CommandHandler} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';
import {readBundleInfo} from './bundle.js';
import {resolveSkillTarget} from './paths.js';
import {inspectSkill} from './manifest.js';
import {installSkill,uninstallSkill} from './install.js';
export function createSkillHandlers():Record<string,CommandHandler>{
 return Object.fromEntries(['path','status','install','uninstall'].map(action=>['skill.'+action,async(args,deps)=>{
  if(args.target!==undefined&&args.target!=='codex')throw new CliFailure('INVALID_ARGUMENT');
  const target=resolveSkillTarget({...args.target==='codex'?{target:'codex' as const}:{},...typeof args.dir==='string'?{dir:args.dir}:{}},deps.env??process.env);
  const bundle=await readBundleInfo();
  let data:unknown;
  if(action==='path')data={path:bundle.root,version:bundle.version};
  else if(action==='status')data=await inspectSkill(target,bundle);
  else{
   const report=await(action==='install'?installSkill:uninstallSkill)(target,bundle,{dryRun:args.dryRun===true});
   if(!report.complete)throw new CliFailure('SKILL_CONFLICT',undefined,report);
   data=report;
  }
  return{ok:true as const,data,meta:{schemaVersion:'1' as const,command:`skill ${action}`}};
 }]));
}
