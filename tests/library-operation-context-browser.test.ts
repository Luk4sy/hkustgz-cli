import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {createLibraryInspectionReader} from '../src/adapters/booking-library/inspection-reader.js';
const skip=process.env.HKUSTGZ_TEST_BROWSER!=='1';
const config={resvTheme:'17',resvthememust:'7',resvthemefix:'17',resvCode:'0',resvThemeIgnoreNumLimit:'',cancelTimeReduceMinutes:'0'};
for(const mode of ['normal','disabled','nonself','switch','penalty-failure'])test(`operation context fresh GETs and minimal projection: ${mode}`,{skip},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const p=await browser.newPage();p.setDefaultTimeout(5000);let auth=0;const requests:string[]=[];
  await p.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());requests.push(req.method()+' '+u.pathname);
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script>const store={state:{userInfo:{accNo:12},config:${JSON.stringify(config)}},_actions:{disCaseUserInfo:[],disReservePunishInfo:[]},dispatch(name){return fetch(name==='disCaseUserInfo'?'/ic-web/auth/userInfo':'/ic-web/reserve/punishInfo').then(r=>r.json())}};document.querySelector('#root').__vue__={$store:store};</script>`});
   if(u.pathname.endsWith('/userInfo'))return route.fulfill({json:{code:0,data:{accNo:mode==='switch'&&++auth>1?13:12,logonName:'private-marker',status:mode==='disabled'?2:1,localstatus:1,token:'private-token'}}});
   return route.fulfill({json:{code:mode==='penalty-failure'?1:0,data:[]}});
  });
  await p.goto('https://libroombooking.hkust-gz.edu.cn/');const reader=createLibraryInspectionReader(p);
  if(['switch','penalty-failure'].includes(mode))await assert.rejects(reader.operationContext!(['12'],new AbortController().signal));
  else{const result=await reader.operationContext!([mode==='nonself'?'99':'12'],new AbortController().signal) as any;assert.equal(result.enabled,mode!=='disabled');assert.equal(result.selfOnly,mode!=='nonself');assert.equal(result.punishmentCount,0);assert.doesNotMatch(JSON.stringify(result),/private-marker|private-token|accNo|logonName/);assert.deepEqual(result.config,config);}
  assert.ok(requests.every(x=>x.startsWith('GET ')));
 }finally{await browser.close();}
});
