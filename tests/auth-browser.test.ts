import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSessionRunner} from '../src/session/browser.js';
import {resolveDataPaths} from '../src/session/paths.js';
import {checkAuth,visitService} from '../src/session/auth.js';
const enabled=process.env.HKUSTGZ_TEST_BROWSER==='1';

test('real browser follows SIS Login once, restores cold sessions, and never submits credentials',{skip:!enabled,timeout:30000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-browser-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));let clicks=0;
 for(let cold=0;cold<2;cold++)await runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000},async session=>{
  await session.context.route('https://sisn.hkust-gz.edu.cn/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/auth-sign'){
    await route.fulfill({contentType:'text/html',body:'<button onclick="sessionStorage.setItem(\'synthetic\',\'yes\');location.href=\'/system/my-calendar\'">Login</button>'});
   }else{
    clicks++;
    await route.fulfill({contentType:'text/html',body:'<script>if(sessionStorage.getItem("synthetic")!=="yes")location.replace("/auth-sign")</script><input placeholder="Select" value="synthetic-term"><div>2026-09-01 - 2026-12-07</div>'});
   }
  });
  const report=await visitService('sis',session,Date.now()+7000,false);assert.equal(report.state,'authenticated');
 });
 // Each new context starts without sessionStorage; missing restore on the second launch must fail.
 assert.ok(clicks>=4);
});

test('real browser treats HTTP 200 login and empty shells as non-authenticated',{skip:!enabled,timeout:20000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-login-page-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));
 await runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+12000},async session=>{
  await session.context.route('https://sso.hkust-gz.edu.cn/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Login</h1><input type="password">'}));
  await session.page.goto('https://sso.hkust-gz.edu.cn/Account/Login?code=synthetic-private-marker');
  const report=await checkAuth('sis',session);assert.equal(report.state,'unauthenticated');assert.doesNotMatch(JSON.stringify(report),/synthetic-private-marker/);
  await session.page.evaluate(()=>document.body.remove());assert.equal((await checkAuth('sis',session)).state,'unknown');
  await session.context.route('https://sisn.hkust-gz.edu.cn/**',route=>route.fulfill({contentType:'text/html',body:'<h1>My Calendar</h1><input placeholder="Select">'}));
  await session.page.goto('https://sisn.hkust-gz.edu.cn/system/my-calendar');assert.equal((await checkAuth('sis',session)).state,'unknown');
  await session.page.evaluate(()=>document.body.remove());assert.equal((await checkAuth('sis',session)).state,'unknown');
 });
});

test('real browser rejects navigation outside verified school origins',{skip:!enabled,timeout:15000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-origin-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));
 await assert.rejects(runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000},async session=>{
  await assert.rejects(session.page.goto('https://unrecognized.invalid/'),/ERR_BLOCKED_BY_CLIENT/);
 }),{code:'ADAPTER_CHANGED'});
});
test('real browser does not authenticate portal or Canvas placeholder shells',{skip:!enabled,timeout:15000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-shell-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));
 await runner('portal',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000},async session=>{
  await session.context.route('https://myportal.hkust-gz.edu.cn/**',r=>r.fulfill({contentType:'text/html',body:'<span>我的应用</span>'}));
  await session.page.goto('https://myportal.hkust-gz.edu.cn/');assert.equal((await checkAuth('portal',session)).state,'unknown');
  await session.context.route('https://hkust-gz.instructure.com/**',r=>r.fulfill({contentType:'text/html',body:'<table id="my_courses_table"><tbody><tr><td>Loading</td></tr></tbody></table>'}));
  await session.page.goto('https://hkust-gz.instructure.com/courses');assert.equal((await checkAuth('canvas',session)).state,'unknown');
 });
});
