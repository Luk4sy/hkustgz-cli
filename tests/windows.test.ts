import assert from 'node:assert/strict';
import test from 'node:test';
import {win32} from 'node:path';
import {chromeCandidates,findChrome} from '../src/session/chrome.js';
import {assertWindowsLocalPath} from '../src/core/windows-path.js';
import {launchBrowser} from '../src/session/browser.js';
import {executeCommand} from '../src/cli/main.js';
import {probes} from './helpers/doctor.js';
import {chromium} from 'playwright';
const env={ProgramFiles:'C:\\Program Files', 'ProgramFiles(x86)':'C:\\Program Files (x86)',LOCALAPPDATA:'C:\\Users\\测试 用户\\AppData\\Local'};
test('Windows Chrome searches system and user installations, deduplicates and rejects nonlocal roots',async()=>{
 const candidates=chromeCandidates('win32',{...env,PROGRAMW6432:env.ProgramFiles});
 assert.deepEqual(candidates,[win32.join(env.ProgramFiles,'Google/Chrome/Application/chrome.exe'),win32.join(env['ProgramFiles(x86)'],'Google/Chrome/Application/chrome.exe'),win32.join(env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe')]);
 assert.equal(await findChrome('win32',env,async path=>path===candidates[2]),candidates[2]);assert.equal(await findChrome('win32',env,async()=>false),null);
 assert.deepEqual(chromeCandidates('win32',{ProgramFiles:'relative',LOCALAPPDATA:'\\\\server\\share'}),[]);
});
test('Windows local paths reject ambiguous roots, network/device paths and alternate streams',()=>{
 for(const good of ['C:\\Users\\测试 用户\\skills','D:/tools/skills'])assert.doesNotThrow(()=>assertWindowsLocalPath(good));
 for(const bad of ['C:relative','\\skills','/skills','\\\\host\\share','\\\\?\\C:\\skills','C:\\skills:stream','C:\\a\\..\\b'])assert.throws(()=>assertWindowsLocalPath(bad));
});
test('Windows detected Chrome executable is used by the actual Playwright launcher',async t=>{
 const calls:Array<Record<string,unknown>>=[];t.mock.method(chromium,'launchPersistentContext',async(_profile:string,options:Record<string,unknown>)=>{calls.push(options);return{};});
 const target=win32.join(env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe');
 await launchBrowser('synthetic',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000,timeout:1000},{platform:'win32',env,probe:async path=>path===target});
 assert.equal(calls[0]!.executablePath,target);assert.equal(calls[0]!.channel,'chrome');
 await assert.rejects(launchBrowser('synthetic',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000,timeout:1000},{platform:'win32',env,probe:async()=>false}),{code:'BROWSER_UNAVAILABLE'});assert.equal(calls.length,1);
});
test('Windows 11 compatible build is a warning candidate, Windows 10 and unknown builds fail readiness',async()=>{
 for(const [osRelease,code] of [['10.0.22631',0],['10.0.19045',8],['unknown',8]] as const){
  const result=await executeCommand(['doctor'],{doctorProbes:{...probes,runtime:()=>({nodeVersion:'v24.20.0',platform:'win32',arch:'x64',osRelease})}});
  assert.equal(result.exitCode,code);const value=JSON.parse(result.stdout);const report=value.data??value.error.details;
  if(code===0)assert.ok(report.checks.some((check:{code:string;status:string})=>check.code==='WINDOWS_CANDIDATE'&&check.status==='warn'));
 }
});
test('explicit Windows smoke refuses other platforms before opening a browser',{skip:process.platform==='win32'},async()=>{
 const {spawnSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../bin/windows-smoke.mjs',import.meta.url))],{encoding:'utf8'});
 assert.equal(result.status,2);assert.equal(JSON.parse(result.stdout).error.code,'WINDOWS_SMOKE_WRONG_PLATFORM');assert.equal(result.stderr,'');
});
test('package test runner resolves Windows prefix layout without Unix bin or lib directories',async()=>{
 const helpers=await import('./helpers/package.js');assert.equal(typeof helpers.globalPackageRoot,'function');assert.equal(helpers.globalPackageRoot('C:\\用户 空格\\npm','win32'),'C:\\用户 空格\\npm\\node_modules\\hkustgz-cli');assert.equal(helpers.installedBin('C:\\用户 空格\\npm','win32'),'C:\\用户 空格\\npm\\node_modules\\hkustgz-cli\\bin\\hkustgz-cli.mjs');
});
test('loopback smoke flow closes the isolated browser and reacquires its lock on the test host',{skip:process.env.HKUSTGZ_TEST_BROWSER!=='1'},async()=>{
 const {runLoopbackSmoke}=await import('../src/cli/windows-smoke.js');
 const result=await runLoopbackSmoke();assert.deepEqual(result,{ok:true,data:{scope:'loopback-only',browserClosed:true,profileLockReacquired:true,schoolAccessed:false}});
});
test('shared directory safety rejects a junction ancestor before creating a data directory',async()=>{
 const {canonicalDirectoryPath}=await import('../src/core/safe-directory.js');const fs=(await import('node:fs')).default;const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const root=fs.mkdtempSync(join(tmpdir(),'windows-junction-'));try{const outside=join(root,'outside');fs.mkdirSync(outside);const alias=join(root,'alias');fs.symlinkSync(outside,alias,process.platform==='win32'?'junction':'dir');assert.throws(()=>canonicalDirectoryPath(join(alias,'new-cli'),'INVALID_DATA_HOME'),{code:'INVALID_DATA_HOME'});assert.equal(fs.existsSync(join(outside,'new-cli')),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('fault-injection fixture paths match Windows separators without matching sibling directories',async()=>{
 const {sameFixturePath}=await import('./helpers/path-match.js');
 assert.equal(sameFixturePath(win32.join('C:\\tmp','owned.lock','stage'),'C:/tmp/owned.lock/stage'),true);
 assert.equal(sameFixturePath(win32.join('C:\\tmp','owned.lock','stage','SKILL.md'),'C:/tmp/owned.lock/stage/SKILL.md'),true);
 assert.equal(sameFixturePath(win32.join('C:\\tmp','owned.lock','backup'),'C:/tmp/owned.lock/backup'),true);
 assert.equal(sameFixturePath(win32.join('C:\\tmp','other.lock','stage'),'C:/tmp/owned.lock/stage'),false);
});
