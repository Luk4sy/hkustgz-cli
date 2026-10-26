import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSessionRunner} from '../src/session/browser.js';
import {resolveDataPaths} from '../src/session/paths.js';
import {visitService} from '../src/session/auth.js';
const enabled=process.env.HKUSTGZ_TEST_BROWSER==='1';
test('302 redirect cannot send a request to an unverified origin',{skip:!enabled,timeout:15000},async t=>{
 let outside=0;
 const server=createServer((req,res)=>{if(req.url==='/outside'){outside++;res.end('outside');}else{res.writeHead(302,{Location:`http://127.0.0.1:${(server.address() as {port:number}).port}/outside`});res.end();}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const port=(server.address() as {port:number}).port;const origin=`http://localhost:${port}`;
 const root=await mkdtemp(join(tmpdir(),'hkust-redirect-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}),{allowedOrigins:new Set([origin])});
 await assert.rejects(runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000},async s=>{await s.page.goto(origin);}),{code:'ADAPTER_CHANGED'});
 assert.equal(outside,0,'unverified server must never receive the redirected request');
});
test('network refusal is classified separately from internal and policy errors',{skip:!enabled,timeout:15000},async t=>{
 const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;await new Promise<void>(resolve=>server.close(()=>resolve()));
 const origin=`http://127.0.0.1:${port}`;const root=await mkdtemp(join(tmpdir(),'hkust-network-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}),{allowedOrigins:new Set([origin])});
 await assert.rejects(runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs:Date.now()+10000},s=>s.page.goto(origin)),{code:'NETWORK_REQUIRED'});
});
test('unknown supported-service status returns before the outer deadline',{skip:!enabled,timeout:15000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-observe-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));
 const deadlineMs=Date.now()+5000;
 const report=await runner('canvas',{browser:'chrome',headless:true,purpose:'query',deadlineMs},async s=>{
  await s.context.route('https://hkust-gz.instructure.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Loading</h1>'}));
  return visitService('canvas',s,deadlineMs,false);
 });assert.equal(report.state,'unknown');
});
test('SIS Login is never clicked on a different unverified path',{skip:!enabled,timeout:10000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-login-path-'));t.after(()=>rm(root,{recursive:true,force:true}));const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));
 const deadlineMs=Date.now()+3500;
 await runner('sis',{browser:'chrome',headless:true,purpose:'query',deadlineMs},async s=>{
  await s.context.route('https://sisn.hkust-gz.edu.cn/**',r=>r.fulfill({contentType:'text/html',body:new URL(r.request().url()).pathname==='/system/my-calendar'?'<script>location.replace("/auth-sign-other")</script>':'<button onclick="document.body.dataset.clicked=\'yes\'">Login</button>'}));
  assert.equal((await visitService('sis',s,deadlineMs,false)).state,'unknown');
  assert.equal(await s.page.evaluate(()=>document.body.dataset.clicked??'no'),'no');
 });
});
test('observed official Canvas SSO pass-through can return to personal courses',{skip:!enabled,timeout:10000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-canvas-sso-'));t.after(()=>rm(root,{recursive:true,force:true}));const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));const deadlineMs=Date.now()+7000;
 const report=await runner('canvas',{browser:'chrome',headless:true,purpose:'query',deadlineMs},async s=>{
  await s.context.route('https://hkust-gz.instructure.com/**',r=>new URL(r.request().url()).searchParams.has('syntheticReturn')?r.fulfill({contentType:'text/html',body:'<table id="my_courses_table"><tbody><tr><td><a href="/courses/123">Synthetic course</a></td></tr></tbody></table>'}):r.fulfill({contentType:'text/html',body:'<script>location.replace("https://sso.canvaslms.com/delegated_auth_pass_through")</script>'}));
  await s.context.route('https://sso.canvaslms.com/**',r=>r.fulfill({contentType:'text/html',body:'<script>location.replace("https://hkust-gz.instructure.com/courses?syntheticReturn=1")</script>'}));
  return visitService('canvas',s,deadlineMs,false);
 });assert.equal(report.state,'authenticated');
});
test('Canvas enters the observed school SAML flow before opening course deep links',{skip:!enabled,timeout:10000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-canvas-entry-'));t.after(()=>rm(root,{recursive:true,force:true}));const runner=createSessionRunner(resolveDataPaths({HKUSTGZ_CLI_HOME:root}));const deadlineMs=Date.now()+7000;
 const report=await runner('canvas',{browser:'chrome',headless:true,purpose:'query',deadlineMs},async s=>{
  await s.context.route('https://hkust-gz.instructure.com/**',r=>{
   const url=new URL(r.request().url());
   return r.fulfill({contentType:'text/html',body:url.pathname==='/login/saml'?'<nav id="menu"><a href="/courses">Courses</a></nav><script>sessionStorage.setItem("syntheticSchoolSso","yes")</script>':'<script>if(sessionStorage.getItem("syntheticSchoolSso")!=="yes")location.replace("https://unverified.invalid/")</script><table id="my_courses_table"><tbody><tr><td><a href="/courses/123">Synthetic course</a></td></tr></tbody></table>'});
  });return visitService('canvas',s,deadlineMs,false);
 });assert.equal(report.state,'authenticated');
});
