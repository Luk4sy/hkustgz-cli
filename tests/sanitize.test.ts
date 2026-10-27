import assert from 'node:assert/strict';
import test from 'node:test';
import {sanitizeSourceUrl,sanitizeValue} from '../src/core/sanitize.js';
import {executeCommand} from '../src/cli/main.js';
import {queryMeta} from './fixtures.js';
test('URL credentials and temporary query parameters are removed; course/date parameters survive',()=>{
 const safe=sanitizeSourceUrl('https://user:private-marker@school.test/courses?code=private-marker&COURSE=IPEN&from=2026-10-27&ACCESS_TOKEN=private-marker&tt=private-marker');
 assert.doesNotMatch(safe,/private-marker|user:|code=|TOKEN=|tt=/);assert.match(safe,/COURSE=IPEN/);assert.match(safe,/from=2026-10-27/);
});
test('hash routes and nested return URLs do not retain authentication material',()=>{
 const safe=sanitizeSourceUrl('https://school.test/?ReturnUrl=%2Fcallback%3Fticket%3Dprivate-marker%26course%3DIPEN#/ic/home?token=private-marker&roomId=42');
 assert.doesNotMatch(decodeURIComponent(safe),/private-marker/);assert.match(safe,/roomId=42/);assert.match(decodeURIComponent(safe),/course=IPEN/);
});
test('nested credential fields and auth header text are redacted without mutating business data',()=>{
 const original={code:'IPEN1000',state:'authenticated',items:[{title:'Synthetic',access_token:'private-marker',url:'https://school.test/?ticket=private-marker'}],warning:'Authorization: Bearer private-marker'};
 const safe=sanitizeValue(original);assert.doesNotMatch(JSON.stringify(safe),/private-marker/);assert.match(JSON.stringify(safe),/IPEN1000|authenticated/);assert.equal(original.items[0]?.access_token,'private-marker');
});
test('fixture credential markers cannot escape through JSON or table CLI output',async()=>{
 for(const format of ['json','table']){
  const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{code:'IPEN1000',token:'private-marker',url:'https://school.test/?code=private-marker'}]},meta:queryMeta()})}});
  assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(result.stdout,/IPEN1000/);
 }
});
test('serialized diagnostic objects and common credential aliases are also redacted',()=>{
 const value={diagnostic:JSON.stringify({headers:{Authorization:'Bearer private-marker'},api_secret:'private-marker',session_token:'private-marker'}),text:'Cookie=private-marker; authToken=private-marker'};
 assert.doesNotMatch(JSON.stringify(sanitizeValue(value)),/private-marker/);
 const business=' { "courseCode": "IPEN1000", "state": "open" } ';
 assert.equal(sanitizeValue(business),business);
});
test('prefixed quoted diagnostics and all recognized inline credential keys cannot reach either CLI format',async()=>{
 for(const format of ['json','table']){
  const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{code:'IPEN1000',state:'open',message:'upstream reply: {"access_token":"private-marker"}',details:'token=private-marker csrf=private-marker',broken:JSON.stringify({url:'https://%',token:'private-marker'})}]},meta:queryMeta()})}});
  assert.equal(result.exitCode,0,result.stdout);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(result.stdout,/IPEN1000/);assert.match(result.stdout,/open/);
 }
});
test('path-relative nested redirects are cleaned without changing their relative path or course filter',async()=>{
 const url='https://school.test/?ReturnUrl=callback%3Fticket%3Dprivate-marker%26course%3DIPEN';
 const cleaned=new URL(sanitizeSourceUrl(url));assert.equal(cleaned.searchParams.get('ReturnUrl'),'callback?course=IPEN');
 for(const format of ['json','table']){
  const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{code:'IPEN1000',returnUrl:'callback?ticket=private-marker&course=IPEN',url}]},meta:{...queryMeta(),sourceUrl:url}})}});
  assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(decodeURIComponent(result.stdout),/course=IPEN/);
 }
});
test('relative href and other link fields cannot leak tickets in either CLI format',async()=>{
 const links={href:'/callback?ticket=private-marker&course=IPEN',src:'../callback?access_token=private-marker&course=IPEN',link:'callback?ticket=private-marker&course=IPEN',location:'#/callback?token=private-marker&course=IPEN',other:'/callback?ticket=private-marker&course=IPEN',otherPath:'/callback/token=private-marker'};
 assert.doesNotMatch(JSON.stringify(sanitizeValue(links)),/private-marker/);
 for(const format of ['json','table']){
  const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{code:'IPEN1000',state:'open',...links}]},meta:queryMeta()})}});
  assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(result.stdout,/course=IPEN/);assert.match(result.stdout,/IPEN1000/);
 }
 assert.equal(links.href,'/callback?ticket=private-marker&course=IPEN');
 assert.deepEqual(sanitizeValue({location:'Room #class A'}),{location:'Room #class A'});
});
test('prefixed diagnostics recursively sanitize multiply serialized payloads',async()=>{
 for(const levels of [1,2,3]){
  let payload=JSON.stringify({access_token:'private-marker',courseCode:'IPEN1000',state:'open'});
  for(let n=1;n<levels;n++)payload=JSON.stringify(payload);
  const message='response: '+JSON.stringify({payload,href:'/callback?ticket=private-marker&course=IPEN'})+'; complete';
  for(const format of ['json','table']){
   const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{code:'IPEN1000',state:'open',message}]},meta:queryMeta()})}});
   assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(result.stdout,/response:/);assert.match(result.stdout,/complete/);assert.match(result.stdout,/IPEN1000/);
  }
 }
 const plain='response: { "courseCode": "IPEN1000", "state": "open" }; complete';assert.equal(sanitizeValue(plain),plain);
});
test('quoted credential assignments retain their key context in both CLI formats',async()=>{
 const message='token="private-marker" password="private-marker" access_token = "private-marker with spaces"; courseCode="IPEN1000"; state="open"';
 assert.doesNotMatch(JSON.stringify(sanitizeValue(message)),/private-marker/);
 for(const format of ['json','table']){
  const result=await executeCommand(['catalog','search','Synthetic','--format',format],{capabilities:[{id:'catalog.search',service:'catalog',state:'verified',reason:null,evidenceId:'synthetic-only'}],handlers:{'catalog.search':async()=>({ok:true,data:{items:[{message}]},meta:queryMeta()})}});
  assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/private-marker/);assert.match(result.stdout,/IPEN1000/);assert.match(result.stdout,/open/);
 }
});
