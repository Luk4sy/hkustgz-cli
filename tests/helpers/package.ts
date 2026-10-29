import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
export const repo = fileURLToPath(new URL('../../', import.meta.url));
export function run(command:string,args:string[],cwd:string,env:NodeJS.ProcessEnv=process.env) {
  const result=spawnSync(command,args,{cwd,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  assert.equal(result.status,0,`${command} ${args.join(' ')}\n${result.error??''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
export function fixture(){
  const root=mkdtempSync(join(tmpdir(),'hkustgz package '));
  const checkout=join(root,'checkout');mkdirSync(checkout);
  for(const path of ['src','bin','scripts','skills','package.json','package-lock.json','tsconfig.json','tsconfig.build.json','README.md'])cpSync(join(repo,path),join(checkout,path),{recursive:true});
  for(const path of ['installation.md','cli-contract.md','errors.md']){
    try{mkdirSync(join(checkout,'docs'),{recursive:true});cpSync(join(repo,'docs',path),join(checkout,'docs',path));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  if(existsSync(join(repo,'LICENSE')))cpSync(join(repo,'LICENSE'),join(checkout,'LICENSE'));
  // Build tooling belongs to the producer only, never the installed consumer.
  run('ln',['-s',join(repo,'node_modules'),join(checkout,'node_modules')],root);
  const cache=join(root,'cache');
  return {root,checkout,cache,env:{...process.env,npm_config_cache:cache}};
}
export function pack(f:ReturnType<typeof fixture>){
  const output=run('npm',['pack','--json','--pack-destination',f.root],f.checkout,f.env);
  const metadata=JSON.parse(output) as Array<{filename:string;files:Array<{path:string}>}>;
  const artifact=join(f.root,metadata[0]!.filename);
  const unpacked=join(f.root,'unpacked');mkdirSync(unpacked);
  run('tar',['-xzf',artifact,'-C',unpacked],f.root);
  return {artifact,packageRoot:join(unpacked,'package'),files:metadata[0]!.files.map(f=>f.path)};
}
export function tree(root:string,prefix=''):string[]{return readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(join(root,e.name),`${prefix}${e.name}/`):[`${prefix}${e.name}`]);}
export const readJson=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
// Copy only cached production registry entries into an isolated npm cache.
export async function seedCache(destination:string){
  const npmRoot=run('npm',['root','-g'],repo).trim();
  const {createRequire}=await import('node:module');
  const require=createRequire(join(npmRoot,'npm','package.json'));
  const cacache=require('cacache');
  const source=join(run('npm',['config','get','cache'],repo).trim(),'_cacache');
  const entries=await cacache.ls(source);
  let count=0;
  for(const key of Object.keys(entries))if(/^make-fetch-happen:request-cache:https:\/\/registry\.npmjs\.org\/(commander|playwright|playwright-core|zod|fsevents)(\/|$)/.test(key)){
    const entry=await cacache.get(source,key);
    await cacache.put(join(destination,'_cacache'),key,entry.data,{metadata:entry.metadata});count++;
  }
  assert.ok(count>0,'Production registry entries must be cached; seed them explicitly before offline verification.');
}
