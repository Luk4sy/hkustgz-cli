import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {z} from 'zod';
import type {BundleInfo} from './bundle.js';
import {checkTarget,safePath,type SkillTarget} from './paths.js';
import {CliFailure} from '../../core/errors.js';
export const MANIFEST='.hkustgz-cli-manifest.json';
const validName=(s:string)=>s==='SKILL.md'||/^references\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.md$/.test(s);
export const ManifestSchema=z.strictObject({schemaVersion:z.literal('1'),packageName:z.literal('hkustgz-cli'),version:z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/),files:z.record(z.string().refine(validName),z.string().regex(/^[a-f0-9]{64}$/))}).refine(m=>Object.hasOwn(m.files,'SKILL.md'));
export type SkillManifest=z.infer<typeof ManifestSchema>;
export interface SkillStatus {state:'absent'|'current'|'outdated'|'modified'|'unowned';installedVersion:string|null;expectedVersion:string}
export function exists(path:string):boolean{try{fs.lstatSync(path);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}}
export function hashFile(path:string):string{if(!fs.lstatSync(path).isFile()||fs.lstatSync(path).isSymbolicLink())throw new CliFailure('SKILL_CONFLICT');return createHash('sha256').update(fs.readFileSync(path)).digest('hex');}
export function inventory(root:string,prefix=''):string[]{return fs.readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(e=>{const name=prefix+e.name;return e.isDirectory()?[name+'/',...inventory(root,name+'/')]:[name];}).sort();}
export function expectedEntries(manifest:SkillManifest):string[]{const entries=new Set([MANIFEST,...Object.keys(manifest.files)]);for(const file of Object.keys(manifest.files)){let dir=dirname(file);while(dir!=='.'){entries.add(dir+'/');dir=dirname(dir);}}return [...entries].sort();}
export function readManifest(root:string):SkillManifest|null{
 const file=join(root,MANIFEST);try{if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())return null;return ManifestSchema.parse(JSON.parse(fs.readFileSync(file,'utf8')));}catch{return null;}
}
export function ownedUnchanged(root:string,manifest:SkillManifest):boolean{
 try{return JSON.stringify(inventory(root))===JSON.stringify(expectedEntries(manifest))&&Object.entries(manifest.files).every(([name,hash])=>{safePath(dirname(join(root,name)));return hashFile(join(root,name))===hash;});}catch{return false;}
}
export function bundleManifest(bundle:BundleInfo):SkillManifest{
 try{
  safePath(bundle.root);const files:Record<string,string>={};
  for(const name of bundle.files){if(!validName(name)||Object.hasOwn(files,name))throw Error();safePath(dirname(join(bundle.root,name)));files[name]=hashFile(join(bundle.root,name));}
  return ManifestSchema.parse({schemaVersion:bundle.schemaVersion,packageName:bundle.name,version:bundle.version,files});
 }catch{throw new CliFailure('SKILL_OPERATION_FAILED');}
}
export async function inspectSkill(target:SkillTarget,bundle:BundleInfo):Promise<SkillStatus>{
 checkTarget(target);
 const unlocked=()=>{checkTarget(target);if(exists(target.destination+'.lock'))throw new CliFailure('SKILL_OPERATION_FAILED');};
 const finish=(status:SkillStatus):SkillStatus=>{unlocked();return status;};
 unlocked();
 const result:SkillStatus={state:'absent',installedVersion:null,expectedVersion:bundle.version};
 if(!exists(target.destination))return finish(result);
 const manifest=readManifest(target.destination);if(!manifest)return finish({...result,state:'unowned'});
 result.installedVersion=manifest.version;
 if(!ownedUnchanged(target.destination,manifest))return finish({...result,state:'modified'});
 if(manifest.version!==bundle.version)return finish({...result,state:'outdated'});
 return finish({...result,state:JSON.stringify(manifest.files)===JSON.stringify(bundleManifest(bundle).files)?'current':'modified'});
}
