import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir,hostname} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
import {claimDirectory} from '../src/session/paths.js';
import {probes} from './helpers/doctor.js';
test('unsafe_home_exits_two and unknown internal details stay private',async()=>{
 const result=await executeCommand(['doctor'],{doctorProbes:{...probes,data:async()=>{const {CliFailure}=await import('../src/core/errors.js');throw new CliFailure('INVALID_DATA_HOME');}}});assert.equal(result.exitCode,2);
 const failure=await executeCommand(['doctor'],{doctorProbes:{...probes,data:async()=>{throw Error('/Users/private/token=secret');}}});assert.equal(failure.exitCode,1);assert.ok(!failure.stdout.includes('/Users/private'));
});
test('real doctor never creates data or Skill directories and retains unknown locks',async()=>{
 const root=fs.mkdtempSync(join(tmpdir(),'doctor-'));try{
 const data=join(root,'data'),codex=join(root,'codex');const env={HKUSTGZ_CLI_HOME:data,CODEX_HOME:codex};
 const first=await executeCommand(['doctor'],{env,sessionRunner:async()=>{throw Error('no browser');}});assert.ok([0,8].includes(first.exitCode));assert.equal(fs.existsSync(data),false);assert.equal(fs.existsSync(codex),false);
 await claimDirectory(data);fs.mkdirSync(join(data,'profiles/chrome.lock'),{recursive:true});fs.writeFileSync(join(data,'profiles/chrome.lock','owner.json'),JSON.stringify({pid:process.pid,hostname:hostname(),tool:'hkustgz-cli',token:'test'}));
 const before=fs.readFileSync(join(data,'profiles/chrome.lock/owner.json'),'utf8');const result=await executeCommand(['doctor'],{env});assert.ok([0,8].includes(result.exitCode));assert.equal(fs.readFileSync(join(data,'profiles/chrome.lock/owner.json'),'utf8'),before);assert.equal(fs.existsSync(codex),false);
 fs.writeFileSync(join(data,'profiles/chrome.lock/owner.json'),'unowned');const unknown=await executeCommand(['doctor'],{env});const unknownValue=JSON.parse(unknown.stdout);assert.ok((unknownValue.data??unknownValue.error.details).checks.some((v:{code:string})=>v.code==='PROFILE_LOCK_UNKNOWN'));assert.equal(fs.readFileSync(join(data,'profiles/chrome.lock/owner.json'),'utf8'),'unowned');
 fs.mkdirSync(join(root,'outside'));fs.symlinkSync(join(root,'outside'),join(root,'alias'));assert.equal((await executeCommand(['doctor'],{env:{...env,HKUSTGZ_CLI_HOME:join(root,'alias')}})).exitCode,2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unsupported_node_exits_eight_before_imports from standalone executable',()=>{
 const root=fs.mkdtempSync(join(tmpdir(),'doctor-bin-'));try{
 const bin=join(root,'bin');fs.mkdirSync(bin);fs.copyFileSync(new URL('../bin/hkustgz-cli.mjs',import.meta.url),join(bin,'hkustgz-cli.mjs'));
 const preload=join(root,'old.cjs');fs.writeFileSync(preload,"Object.defineProperty(process,'version',{value:'v22.0.0'});Object.defineProperty(process,'versions',{value:{...process.versions,node:'22.0.0'}});");
 const result=spawnSync(process.execPath,['--require',preload,join(bin,'hkustgz-cli.mjs'),'doctor'],{encoding:'utf8'});assert.equal(result.status,8);const value=JSON.parse(result.stdout);assert.equal(value.error.code,'ENVIRONMENT_NOT_READY');assert.equal(value.meta.schemaVersion,'1');assert.equal(value.error.details.checks[0].code,'NODE_UNSUPPORTED');assert.equal(result.stderr,'');
 const table=spawnSync(process.execPath,['--require',preload,join(bin,'hkustgz-cli.mjs'),'doctor','--format','table'],{encoding:'utf8'});assert.equal(table.status,8);assert.match(table.stdout,/NODE_UNSUPPORTED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('early runtime failure reads package version instead of a stale built-in value',()=>{
 const root=fs.mkdtempSync(join(tmpdir(),'doctor-version-'));try{
 fs.mkdirSync(join(root,'bin'));fs.copyFileSync(new URL('../bin/hkustgz-cli.mjs',import.meta.url),join(root,'bin/cli.mjs'));fs.writeFileSync(join(root,'package.json'),JSON.stringify({version:'0.1.0-alpha.9'}));fs.writeFileSync(join(root,'old.cjs'),"Object.defineProperty(process,'versions',{value:{...process.versions,node:'22.0.0'}});");
 const result=spawnSync(process.execPath,['--require',join(root,'old.cjs'),join(root,'bin/cli.mjs'),'doctor'],{encoding:'utf8'});assert.equal(result.status,8);assert.equal(JSON.parse(result.stdout).error.details.cliVersion,'0.1.0-alpha.9');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
