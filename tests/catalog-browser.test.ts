import assert from 'node:assert/strict';import test from 'node:test';import {chromium} from 'playwright';import {createReader} from '../src/adapters/catalog/reader.js';import {queryCatalog} from '../src/adapters/catalog/index.js';import {HEADERS} from '../src/adapters/catalog/parser.js';
const skip=process.env.HKUSTGZ_TEST_BROWSER!=='1';
import {sourceBatch} from './fixtures/catalog/batch.js';

function pageHtml(mode:string){return `<input placeholder="Select" value="2026-27 Fall" onclick="setTimeout(()=>document.querySelector('.el-select-dropdown').style.display='block',30)"><div class="el-select-dropdown" style="display:none"><div onclick="change()">2025-26 Winter</div></div><div class="course-code-list"><div class="code-item active" onclick="show('IPEN')">IPEN</div><div class="code-item" onclick="show('AIAA')">AIAA</div></div><main></main><script>
 let term='fall';const api={listPublicMarketTermInfo:async()=>({data:{code:'0',data:{termList:[{termId:'fall',description:'2026-27 Fall'},{termId:'winter',description:'2025-26 Winter'}]}}}),pageCourseSupermarkeView:async input=>({data:await fetch('https://sisn-service.hkust-gz.edu.cn/api/course/pageCourseSupermarkeView',{method:'POST',body:JSON.stringify(input)}).then(r=>{if(!r.ok)throw {response:{status:r.status},message:'private-marker'};return r.json();})})};
 window.webpackChunkapp=[];window.webpackChunkapp.push=chunk=>{chunk[2](id=>({ue:api}));};
 function render(subject,title,room){document.querySelector('main').innerHTML='<div class="course-card"><div class="course-header">'+subject+'5100 - '+title+' [3 Credits]</div><div class="hint">Ready</div><table class="el-table__header"><tr>'+${JSON.stringify(HEADERS)}.map(x=>'<th><div class="cell">'+x+'</div></th>').join('')+'</tr></table><table class="el-table__body"><tbody><tr>'+['L01 (1234)','TBA',room,'Synthetic','','80','79','0','1','Consent'].map(x=>'<td>'+x+'</td>').join('')+'</tr></tbody></table></div>';}
 async function show(subject){document.querySelectorAll('.code-item').forEach(x=>x.classList.toggle('active',x.textContent===subject));const result=await api.pageCourseSupermarkeView({termId:term,subjectArea:subject,pageIndex:1,pageSize:999});const c=result.data.data[0];const title=c.courseInfo.crseShortDesc;const room=c.classSections[0].meetingInfoList[0].facilityName;
 if(term==='winter'&&document.querySelector('.course-card')){
  if('${mode}'==='title-first')document.querySelector('.course-header').textContent=subject+'5100 - '+title+' [3 Credits]';
  if('${mode}'==='rows-first')document.querySelectorAll('tbody td')[2].textContent=room;
  if('${mode}'==='loading-first')document.querySelector('.hint').textContent='Loading Winter...';
  if('${mode}'!=='unchanged-dom')setTimeout(()=>render(subject,title,room),700);
 }else render(subject,title,room);
 }
 async function change(){term='winter';document.querySelector('input').value='2025-26 Winter';await show('IPEN');}
 show('IPEN');</script>`;}
async function harness(mode:string,run:(page:import('playwright').Page,reads:()=>number)=>Promise<void>,wrongTerm=false){
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();let reads=0;
 await page.route('**/*',route=>{if(route.request().url().includes('/api/course/')){reads++;const input=JSON.parse(route.request().postData()!);const body=sourceBatch(input.subjectArea,wrongTerm?'fall':input.termId,mode==='shared');return route.fulfill({status:mode==='401'?401:mode==='403'?403:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});}return route.fulfill({contentType:'text/html',body:pageHtml(mode)});});await run(page,()=>reads);
 }finally{await browser.close();}
}
test('Catalog reads fresh complete UI response batches for two subject tabs',{skip},async()=>harness('atomic',async(page,reads)=>{
 const options={refresh:true,deadlineMs:Date.now()+10000};const reader=await createReader(page,undefined,options);const result=await queryCatalog({text:'Course'},options,reader);assert.equal(result.ok,true);assert.equal(result.data.items.length,2);assert.equal(result.meta.pagesRead,2);assert.equal(reads(),3);assert.equal(result.data.items[1]?.code,'AIAA5100');
 assert.doesNotMatch(await page.evaluate(()=>JSON.stringify((window as any).__hkustgzCatalogCapture)),/private-marker|email/);
}));
for(const mode of ['atomic','title-first','rows-first','loading-first','unchanged-dom','shared'])test('target term batch remains coherent despite DOM rendering: '+mode,{skip},async()=>harness(mode,async page=>{
 const options={refresh:true,deadlineMs:Date.now()+10000};const reader=await createReader(page,'2025-26 Winter',options);const result=await queryCatalog({text:'Course'},options,reader);assert.equal(result.ok,true);assert.equal(result.data.items[0]?.termId,'2025-26 Winter');assert.equal(result.data.items[0]?.title,mode==='shared'?'Shared Course':'Winter Course');assert.equal(result.data.items[0]?.sections[0]?.meetings[0]?.location,mode==='shared'?'Shared Room':'Winter Room');assert.equal(result.data.items[0]?.sections[0]?.available,0);
}));
test('source sections from a different term cannot be relabeled',{skip},async()=>harness('title-first',async page=>{
 const options={refresh:true,deadlineMs:Date.now()+10000};const reader=await createReader(page,'2025-26 Winter',options);await assert.rejects(queryCatalog({text:'Course'},options,reader),{code:'ADAPTER_CHANGED'});
},true));
test('missing verified batch reader fails closed without a DOM fallback',{skip},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:r.request().url().includes('/api/course/')?'application/json':'text/html',body:r.request().url().includes('/api/course/')?'{}':'<div class="course-code-list"><div class="code-item">IPEN</div></div><script>fetch("https://sisn-service.hkust-gz.edu.cn/api/course/pageCourseSupermarkeView")</script>'}));await assert.rejects(createReader(page,undefined,{refresh:true,deadlineMs:Date.now()+10000}),{code:'ADAPTER_CHANGED'});}finally{await browser.close();}
});

for(const [mode,code] of [['401','LOGIN_REQUIRED'],['403','PERMISSION_DENIED']] as const)test('complete response reader preserves HTTP '+mode,{skip},async()=>harness(mode,async page=>{
 const options={refresh:true,deadlineMs:Date.now()+10000};const reader=await createReader(page,undefined,options);await assert.rejects(queryCatalog({text:'Course'},options,reader),{code});assert.doesNotMatch(await page.evaluate(()=>JSON.stringify((window as any).__hkustgzCatalogCapture)),/private-marker/);
}));
