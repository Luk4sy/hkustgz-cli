import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {sameFixturePath} from './helpers/path-match.js';
import test from 'node:test';
import {resolveSkillTarget} from '../src/cli/skill/paths.js';
import {inspectSkill,MANIFEST} from '../src/cli/skill/manifest.js';
import {installSkill,uninstallSkill} from '../src/cli/skill/install.js';
import type {BundleInfo} from '../src/cli/skill/bundle.js';
function setup(){const root=fs.mkdtempSync(join(tmpdir(),'hkustgz-skill-'));const source=join(root,'bundle');fs.mkdirSync(source);fs.writeFileSync(join(source,'SKILL.md'),'version A');const bundle:BundleInfo={name:'hkustgz-cli',version:'0.1.0-alpha.1',schemaVersion:'1',root:source,files:['SKILL.md']};return{root,bundle,target:resolveSkillTarget({dir:join(root,'new','skills')},{})};}
const code=(code:string)=>(e:unknown)=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code===code);
test('install_is_idempotent, status is readonly and dry runs do not create directories',async()=>{
 const f=setup();try{
  assert.equal((await inspectSkill(f.target,f.bundle)).state,'absent');assert.equal(fs.existsSync(f.target.skillsRoot),false);
  assert.equal((await installSkill(f.target,f.bundle,{dryRun:true})).dryRun,true);assert.equal(fs.existsSync(f.target.skillsRoot),false);
  await installSkill(f.target,f.bundle,{dryRun:false});assert.equal((await inspectSkill(f.target,f.bundle)).state,'current');
  const before=fs.readFileSync(join(f.target.destination,MANIFEST),'utf8');assert.deepEqual((await installSkill(f.target,f.bundle,{dryRun:false})).changed,[]);assert.equal(fs.readFileSync(join(f.target.destination,MANIFEST),'utf8'),before);
  const next={...f.bundle,version:'0.1.0-alpha.2'};fs.writeFileSync(join(f.bundle.root,'SKILL.md'),'version B');assert.equal((await inspectSkill(f.target,next)).state,'outdated');
  await installSkill(f.target,next,{dryRun:true});assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'version A');
  await installSkill(f.target,next,{dryRun:false});assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'version B');assert.equal((await inspectSkill(f.target,next)).state,'current');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('modified_and_unowned_targets_are_preserved including unknown empty directories',async()=>{
 const f=setup();try{
  fs.mkdirSync(f.target.destination,{recursive:true});fs.writeFileSync(join(f.target.destination,'mine'),'keep');
  assert.equal((await inspectSkill(f.target,f.bundle)).state,'unowned');await assert.rejects(installSkill(f.target,f.bundle,{dryRun:false}),code('SKILL_CONFLICT'));
  fs.rmSync(f.target.destination,{recursive:true});await installSkill(f.target,f.bundle,{dryRun:false});
  fs.mkdirSync(join(f.target.destination,'user-empty'));await assert.rejects(installSkill(f.target,f.bundle,{dryRun:false}),code('SKILL_CONFLICT'));
  fs.rmdirSync(join(f.target.destination,'user-empty'));fs.writeFileSync(join(f.target.destination,'SKILL.md'),'user edit');
  assert.equal((await inspectSkill(f.target,f.bundle)).state,'modified');await assert.rejects(installSkill(f.target,f.bundle,{dryRun:false}),code('SKILL_CONFLICT'));assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'user edit');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('symlink_ancestor_is_rejected and malformed manifests cannot escape the target',async()=>{
 const f=setup();try{
  fs.symlinkSync(f.bundle.root,join(f.root,'alias'),process.platform==='win32'?'junction':'dir');assert.throws(()=>resolveSkillTarget({dir:join(f.root,'alias','skills')},{}),code('UNSAFE_SKILL_TARGET'));assert.equal(fs.existsSync(join(f.bundle.root,'skills')),false);
  await installSkill(f.target,f.bundle,{dryRun:false});const marker=join(f.root,'outside');fs.writeFileSync(marker,'keep');
  fs.writeFileSync(join(f.target.destination,MANIFEST),JSON.stringify({schemaVersion:'1',packageName:'hkustgz-cli',version:'1',files:{'../../outside':'0'.repeat(64)}}));
  await assert.rejects(uninstallSkill(f.target,f.bundle,{dryRun:false}),code('SKILL_CONFLICT'));assert.equal(fs.readFileSync(marker,'utf8'),'keep');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('upgrade_failure_restores_old_bundle and concurrent target edits prevent replacement',async(t)=>{
 const f=setup();try{
  await installSkill(f.target,f.bundle,{dryRun:false});const next={...f.bundle,version:'0.1.0-alpha.2'};fs.writeFileSync(join(f.bundle.root,'SKILL.md'),'version B');
  const rename=fs.renameSync;let failedStage=false;t.mock.method(fs,'renameSync',(from:fs.PathLike,to:fs.PathLike)=>{if(sameFixturePath(from,join(f.target.destination+'.lock','stage'))){failedStage=true;throw new Error('injected secret');}return rename(from,to);});
  await assert.rejects(installSkill(f.target,next,{dryRun:false}),code('SKILL_OPERATION_FAILED'));assert.equal(failedStage,true);t.mock.restoreAll();
  assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'version A');assert.equal((await inspectSkill(f.target,next)).state,'outdated');
  const write=fs.writeFileSync;let edited=false;t.mock.method(fs,'writeFileSync',(...args:Parameters<typeof fs.writeFileSync>)=>{if(sameFixturePath(dirname(String(args[0])),join(f.target.destination+'.lock','stage'))&&!edited){edited=true;write(join(f.target.destination,'new-user-file'),'keep');}return write(...args);});
  await assert.rejects(installSkill(f.target,next,{dryRun:false}),code('SKILL_CONFLICT'));assert.equal(edited,true);t.mock.restoreAll();assert.equal(fs.readFileSync(join(f.target.destination,'new-user-file'),'utf8'),'keep');assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'version A');
 }finally{t.mock.restoreAll();fs.rmSync(f.root,{recursive:true,force:true});}
});
test('uninstall_preserves_unknown_and_edited_files and dry run is readonly',async()=>{
 const f=setup();try{
  f.bundle.files.push('references/help.md');fs.mkdirSync(join(f.bundle.root,'references'));fs.writeFileSync(join(f.bundle.root,'references/help.md'),'owned');
  await installSkill(f.target,f.bundle,{dryRun:false});fs.writeFileSync(join(f.target.destination,'SKILL.md'),'edit');fs.writeFileSync(join(f.target.destination,'user'),'keep');
  const preview=await uninstallSkill(f.target,f.bundle,{dryRun:true});assert.equal(preview.complete,false);assert.ok(fs.existsSync(join(f.target.destination,'references/help.md')));
  const result=await uninstallSkill(f.target,f.bundle,{dryRun:false});assert.equal(result.complete,false);assert.deepEqual(result.preserved,['SKILL.md','user']);assert.equal(fs.existsSync(join(f.target.destination,'references/help.md')),false);assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'edit');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('uninstall owned bundle leaves other skills and configuration intact',async()=>{
 const f=setup();try{fs.mkdirSync(f.target.skillsRoot,{recursive:true});fs.writeFileSync(join(f.target.skillsRoot,'other'),'keep');fs.writeFileSync(join(f.root,'config.toml'),'keep');await installSkill(f.target,f.bundle,{dryRun:false});assert.equal((await uninstallSkill(f.target,f.bundle,{dryRun:false})).complete,true);assert.equal(fs.existsSync(f.target.destination),false);assert.equal(fs.readFileSync(join(f.target.skillsRoot,'other'),'utf8'),'keep');assert.equal(fs.readFileSync(join(f.root,'config.toml'),'utf8'),'keep');}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('staging write failure preserves old bundle and permits retry',async(t)=>{
 const f=setup();try{
 await installSkill(f.target,f.bundle,{dryRun:false});const next={...f.bundle,version:'0.1.0-alpha.2'};fs.writeFileSync(join(f.bundle.root,'SKILL.md'),'B');
 const write=fs.writeFileSync;let failedWrite=false;t.mock.method(fs,'writeFileSync',(...args:Parameters<typeof fs.writeFileSync>)=>{if(sameFixturePath(args[0],join(f.target.destination+'.lock','stage','SKILL.md'))){failedWrite=true;throw Error('disk failure');}return write(...args);});
 await assert.rejects(installSkill(f.target,next,{dryRun:false}),code('SKILL_OPERATION_FAILED'));assert.equal(failedWrite,true);t.mock.restoreAll();
 assert.equal(fs.readFileSync(join(f.target.destination,'SKILL.md'),'utf8'),'version A');await installSkill(f.target,next,{dryRun:false});assert.equal((await inspectSkill(f.target,next)).state,'current');
 }finally{t.mock.restoreAll();fs.rmSync(f.root,{recursive:true,force:true});}
});
test('busy or unowned persistent transaction is never reported current or deleted',async()=>{
 const f=setup();try{await installSkill(f.target,f.bundle,{dryRun:false});const lock=f.target.destination+'.lock';fs.mkdirSync(lock);fs.writeFileSync(join(lock,'unknown'),'keep');await assert.rejects(inspectSkill(f.target,f.bundle),code('SKILL_OPERATION_FAILED'));await assert.rejects(installSkill(f.target,f.bundle,{dryRun:false}),code('SKILL_OPERATION_FAILED'));assert.equal(fs.readFileSync(join(lock,'unknown'),'utf8'),'keep');}finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('dead producer transaction recovers verified backup before next install',async()=>{
 const f=setup();try{
 await installSkill(f.target,f.bundle,{dryRun:false});const next={...f.bundle,version:'0.1.0-alpha.2'};fs.writeFileSync(join(f.bundle.root,'SKILL.md'),'B');
 const moduleUrl=new URL('../src/cli/skill/install.ts',import.meta.url).href;
 const script=`import fs from 'node:fs';import {installSkill} from ${JSON.stringify(moduleUrl)};const rename=fs.renameSync;fs.renameSync=(a,b)=>{if(String(a)===${JSON.stringify(join(f.target.destination+'.lock','stage'))})process.exit(77);return rename(a,b)};await installSkill(${JSON.stringify(f.target)},${JSON.stringify(next)},{dryRun:false});`;
 const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{encoding:'utf8'});assert.equal(child.status,77,child.stderr);
 assert.equal(fs.existsSync(f.target.destination),false);await assert.rejects(inspectSkill(f.target,next),code('SKILL_OPERATION_FAILED'));
 await installSkill(f.target,next,{dryRun:false});assert.equal((await inspectSkill(f.target,next)).state,'current');assert.equal(fs.existsSync(f.target.destination+'.lock'),false);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('cleanup never follows a backup directory replaced by a symbolic link',async(t)=>{
 const f=setup();try{
  await installSkill(f.target,f.bundle,{dryRun:false});const external=join(f.root,'external');fs.cpSync(f.target.destination,external,{recursive:true});
  const next={...f.bundle,version:'0.1.0-alpha.2'};fs.writeFileSync(join(f.bundle.root,'SKILL.md'),'B');
  const rename=fs.renameSync;let swapped=false;t.mock.method(fs,'renameSync',(from:fs.PathLike,to:fs.PathLike)=>{rename(from,to);if(sameFixturePath(to,join(f.target.destination+'.lock','backup'))){swapped=true;rename(to,join(f.root,'saved-old'));fs.symlinkSync(external,to,process.platform==='win32'?'junction':'dir');}});
  await assert.rejects(installSkill(f.target,next,{dryRun:false}));assert.equal(swapped,true);assert.equal(fs.lstatSync(join(f.target.destination+'.lock','backup')).isSymbolicLink(),true);assert.equal(fs.readFileSync(join(external,'SKILL.md'),'utf8'),'version A');
 }finally{t.mock.restoreAll();fs.rmSync(f.root,{recursive:true,force:true});}
});
test('status does not report current when a transaction starts during inspection',async(t)=>{
 const f=setup();try{
  await installSkill(f.target,f.bundle,{dryRun:false});const read=fs.readFileSync;let injected=false;
  t.mock.method(fs,'readFileSync',(...args:Parameters<typeof fs.readFileSync>)=>{const value=read(...args);if(String(args[0])===join(f.target.destination,MANIFEST)&&!injected){injected=true;fs.mkdirSync(f.target.destination+'.lock');}return value;});
  await assert.rejects(inspectSkill(f.target,f.bundle),code('SKILL_OPERATION_FAILED'));
 }finally{t.mock.restoreAll();fs.rmSync(f.root,{recursive:true,force:true});}
});
