import type {Page,Response} from 'playwright';import type {CliDependencies,QueryOptions} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';import {withSession,selectedBrowser} from '../../session/browser.js';import {resolveDataPaths} from '../../session/paths.js';
import {CATALOG_URL} from './manifest.js';import type {CatalogReader,CatalogSnapshot} from './model.js';
const isList=(response:Response)=>new URL(response.url()).origin==='https://sisn-service.hkust-gz.edu.cn'&&new URL(response.url()).pathname==='/api/course/pageCourseSupermarkeView';
/** Compare only source course fields, never card-local loading hints or other UI text. */
function courseDataState({previous,total}:{previous:string[]|null;total:number}):string[]|false{
 const cards=[...document.querySelectorAll('.course-card')];const signatures:string[]=[];
 for(const card of cards){
  const header=(card.querySelector('.course-header') as HTMLElement)?.innerText??'';
  const identity=header.match(/^([A-Z]+\d+[A-Z]*)\s*-\s*(.*?)\s*\[(\d+(?:\.\d+)?) Credits?\]/s);
  const rows=[...card.querySelectorAll('table.el-table__body tbody tr')].map(row=>[...row.querySelectorAll('td')].map(cell=>({text:cell.innerText.trim(),rowspan:cell.rowSpan})));
  if(!identity||!rows.length)return false;
  signatures.push(JSON.stringify({header:identity.slice(1),rows}));
 }
 if(previous===null)return signatures;
 const loading=[...document.querySelectorAll('.el-loading-mask')].some(x=>getComputedStyle(x).display!=='none');
 // Identical fields do not establish freshness. Fail closed rather than relabel old rows.
 return !loading&&cards.length===total&&signatures.every(value=>!previous.includes(value))?signatures:false;
}
async function watchRender(page:Page):Promise<string[]>{
 const state=await page.evaluate(courseDataState,{previous:null,total:0});
 if(state===false)throw new CliFailure('ADAPTER_CHANGED');return state;
}
async function waitForData(page:Page,previous:string[],total:number,timeout:number):Promise<void>{
 const handle=await page.waitForFunction(courseDataState,{previous,total},{timeout});await handle.dispose();
}
async function count(response:Response):Promise<number>{
 if(response.status()===401)throw new CliFailure('LOGIN_REQUIRED');if(response.status()===403)throw new CliFailure('PERMISSION_DENIED');
 if(!response.ok())throw new CliFailure('NETWORK_REQUIRED');
 const v:unknown=await response.json();if(!v||typeof v!=='object')throw new CliFailure('ADAPTER_CHANGED');
 const x=v as Record<string,unknown>;
 if(x.code!=='0'||!Number.isInteger(x.totalSize)||Number(x.totalSize)<0||x.totalPage!==1||x.nextPage!==false||x.pageIndex!==1)throw new CliFailure('ADAPTER_CHANGED','Catalog subject paging changed; completeness cannot be established.');
 return Number(x.totalSize);
}
export async function createReader(page:Page,term:string|undefined,options:QueryOptions):Promise<CatalogReader>{
 const timeout=()=>Math.max(1,Math.min(30000,options.deadlineMs-Date.now()));page.setDefaultTimeout(timeout());
 const first=page.waitForResponse(isList,{timeout:timeout()});void first.catch(()=>{});await page.goto(CATALOG_URL,{timeout:timeout()});let total=await count(await first);
 await page.locator('.course-code-list .code-item').first().waitFor();
 if(total>0)await page.locator('.course-card').first().waitFor();
 const input=page.getByPlaceholder('Select',{exact:true});await input.waitFor();
 if(term!==undefined&&await input.inputValue()!==term){
  await input.click();await page.locator('.el-select-dropdown:visible').waitFor();const option=page.locator('.el-select-dropdown:visible').getByText(term,{exact:true});
  if(await option.count()!==1)throw new CliFailure('INVALID_ARGUMENT','Use an exact visible Catalog term label, for example 2026-27 Fall.');
  const previous=await watchRender(page);const changed=page.waitForResponse(isList,{timeout:timeout()});void changed.catch(()=>{});await option.click();total=await count(await changed);
  await waitForData(page,previous,total,timeout());
 }
 const termId=await input.inputValue();if(!termId||term!==undefined&&termId!==term)throw new CliFailure('ADAPTER_CHANGED');
 const subjects=(await page.locator('.course-code-list .code-item').allTextContents()).map(s=>s.trim());
 if(!subjects.length||subjects.some(x=>! /^[A-Z]+$/.test(x)))throw new CliFailure('ADAPTER_CHANGED');
 return{subjects,read:async(subject,signal)=>{
  if(signal.aborted)throw signal.reason;page.setDefaultTimeout(timeout());
  const active=await page.locator('.course-code-list .code-item.active').textContent();
  if(active?.trim()!==subject){
   const previous=await watchRender(page);
   const response=page.waitForResponse(isList,{timeout:timeout()});void response.catch(()=>{});
   await page.locator('.course-code-list .code-item').getByText(subject,{exact:true}).click();total=await count(await response);
   await waitForData(page,previous,total,timeout());
  }
  await page.waitForFunction(({subject,total})=>{
   const cards=[...document.querySelectorAll('.course-card')];return cards.length===total&&cards.every(c=>c.querySelector('.course-header')?.textContent?.trim().startsWith(subject))&&![...document.querySelectorAll('.el-loading-mask')].some(x=>getComputedStyle(x).display!=='none');
  },{subject,total},{timeout:timeout()});
  const snapshot=await page.evaluate(({termId,subject,total})=>{
   const cards=[...document.querySelectorAll('.course-card')];
   const headers=cards.map(c=>[...c.querySelectorAll('table.el-table__header th .cell')].map(x=>(x.textContent??'').trim()));
   if(headers.some(x=>x.join('|')!==headers[0]?.join('|')))throw Error('Catalog headers differ');
   return{termId,subject,total,headers:headers[0]??['Section','Date & Time','Location','Instructor','TA/IA/GTA','Quota','Enrol','Avail','Wait','Remarks'],cards:cards.map(c=>({header:(c.querySelector('.course-header') as HTMLElement)?.innerText??'',rows:[...c.querySelectorAll('table.el-table__body tbody tr')].map(r=>[...r.querySelectorAll('td')].map(cell=>({text:cell.innerText,rowspan:cell.rowSpan})))}))};
  },{termId,subject,total});
  if(await input.inputValue()!==termId)throw new CliFailure('ADAPTER_CHANGED');return snapshot satisfies CatalogSnapshot;
 }};
}
export async function withCatalogReader<T>(term:string|undefined,options:QueryOptions,run:(reader:CatalogReader)=>Promise<T>,deps?:CliDependencies,headed=false):Promise<T>{
 const paths=resolveDataPaths(deps?.env??process.env);const browser=await selectedBrowser(paths);
 return (deps?.sessionRunner??withSession)('catalog',{browser,headless:!headed,deadlineMs:options.deadlineMs,purpose:'query'},async session=>{
  const reader=await createReader(session.page,term,options);return run(reader);
 });
}
