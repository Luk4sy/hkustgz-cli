import test from 'node:test';import assert from 'node:assert/strict';import {chromium,type Page} from 'playwright';import {createLibraryPageReader} from '../src/adapters/booking-library/reader.js';import {queryLibraryRooms} from '../src/adapters/booking-library/index.js';import {LIBRARY_ORIGIN} from '../src/adapters/booking-library/manifest.js';
const skip=process.env.HKUSTGZ_TEST_BROWSER!=='1';
async function fixture(run:(page:Page,reader:ReturnType<typeof createLibraryPageReader>,requests:string[])=>Promise<void>,mode='normal'){const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage(),requests:string[]=[];await page.route('**/*',r=>{const u=new URL(r.request().url());requests.push(r.request().method()+' '+u.pathname+u.search);if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:`<div class="tabBox"></div><script>const v={kindId:'2',sysKind:1,spaceListType:2,activeName:'2026-10-30',pageData:{page:1,pageNum:10},formModel:{value:'',adddValues:''},getReserve(){fetch('/ic-web/reserve?sysKind=1&resvDates='+this.activeName.replaceAll('-','')+'&page='+this.pageData.page+'&pageSize=10&labIds=2&kindId=')}};document.querySelector('.tabBox').__vue__=v;</script>`});if(mode==='rate')return r.fulfill({status:429,headers:{'Retry-After':'60'},body:'{}'});if(mode==='login')return r.fulfill({contentType:'application/json',body:JSON.stringify({code:300,data:null})});if(u.pathname==='/ic-web/roomMenu')return r.fulfill({contentType:'application/json',body:JSON.stringify({code:0,data:[{id:2,name:'Third',spanDay:false}]})});const p=Number(u.searchParams.get('page'));return r.fulfill({contentType:'application/json',body:JSON.stringify({code:0,count:19,data:Array.from({length:p===1?10:9},(_,i)=>({devId:(p-1)*10+i+1,devName:'Room',labId:2,labName:'Third',maxUser:5,kindName:'Discussion',privateIdentity:'private-marker',resvInfo:[{trueName:'private-marker',title:'private-marker',startTime:1793322000000,endTime:1793325600000,resvStatus:1027}],openTimes:[{openStartTime:'08:00',openEndTime:'23:00',openLimit:1}]}))})});});await page.goto(LIBRARY_ORIGIN);const reader=createLibraryPageReader(page,[{id:'2',name:'Third'}]);await run(page,reader,requests);}finally{await browser.close();}}
test('library browser uses existing readonly client and reads both scoped pages without private fields',{skip},async()=>fixture(async(page,reader,requests)=>{const r=await queryLibraryRooms({floorId:'2'},{refresh:false,deadlineMs:Date.now()+8000},reader);assert.equal(r.data.items.length,19);assert.doesNotMatch(JSON.stringify(r),/private-marker/);assert.ok(requests.filter(x=>x.includes('/ic-web/reserve?')).every(x=>x.startsWith('GET ')&&x.includes('labIds=2')));const raw=await reader.page('2','2026-10-31',1,new AbortController().signal);assert.doesNotMatch(JSON.stringify(raw),/private-marker/);assert.match(JSON.stringify(raw),/2026-10-31/);}));
test('library reader preserves Retry-After so an insufficient budget cannot retry',{skip},async()=>fixture(async(page,reader,requests)=>{await assert.rejects(queryLibraryRooms({floorId:'2'},{refresh:false,deadlineMs:Date.now()+5000},reader),{code:'RATE_LIMITED'});assert.equal(requests.filter(x=>x.includes('/ic-web/reserve?')).length,1);},'rate'));
test('library expired JSON login is not a successful empty list',{skip},async()=>fixture(async(page,reader)=>{await assert.rejects(reader.page('2','2026-10-30',1,new AbortController().signal),{code:'LOGIN_REQUIRED'});},'login'));
test('own page reader preserves inclusive source end date, pagination and strips private fields',{skip},async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage(),requests:URL[]=[];await page.route('**/*',r=>{const u=new URL(r.request().url());requests.push(u);if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:`<div class="own"></div><script>document.querySelector('.own').__vue__={search:{date:[],check:[]},pageDate:{page:1,pageNum:10},initTable(){fetch('/ic-web/reserve/resvInfo?beginDate='+this.search.date[0]+'&endDate='+this.search.date[1]+'&needStatus='+this.search.check.reduce((a,b)=>a+b,0)+'&page='+this.pageDate.page+'&pageNum=10&orderKey=gmt_create&orderModel=desc')}};</script>`});return r.fulfill({contentType:'application/json',body:JSON.stringify({code:0,count:1,data:[{resvId:1,resvBeginTime:Date.parse('2026-10-30T10:00:00+08:00'),resvEndTime:Date.parse('2026-10-30T11:00:00+08:00'),resvStatus:1027,trueName:'private-marker',resvMemberInfoList:[{email:'private-marker'}],resvDevInfoList:[{devId:20,devName:'Room',memo:'private-marker'}]}]})});});await page.goto(LIBRARY_ORIGIN);const reader=createLibraryPageReader(page,[{id:'2',name:'Third'}]);const result=await reader.mine!({from:'2026-10-30',to:'2026-11-02',timezone:'Asia/Shanghai'},1,new AbortController().signal);assert.doesNotMatch(JSON.stringify(result),/private-marker/);const request=requests.find(u=>u.pathname.endsWith('/resvInfo'))!;assert.equal(request.searchParams.get('endDate'),'2026-11-01');assert.equal(request.searchParams.get('needStatus'),'8454');}finally{await browser.close();}});

for (const mode of ['rebind', 'replace']) {
 test(`floor switch waits for target binding before rooms and availability reads: ${mode}`, {skip}, async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
   const page = await browser.newPage();
   page.setDefaultTimeout(5000);
   const requestedFloors:string[] = [];
   await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:`
     <div class="tabBox"></div><script>
      function component(floorId) {return {kindId:floorId,sysKind:1,spaceListType:2,
       activeName:'2026-11-01',pageData:{page:1,pageNum:10},formModel:{value:'',adddValues:''},
       getReserve(){fetch('/ic-web/reserve?sysKind='+this.sysKind+'&resvDates='+this.activeName.replaceAll('-','')+'&page='+this.pageData.page+'&pageSize=10&labIds='+this.kindId+'&kindId=');}
      };}
      const element=document.querySelector('.tabBox');element.__vue__=component('1');
      addEventListener('hashchange',()=>{const target=location.hash.split('/').at(-1);
       setTimeout(()=>{if('${mode}'==='replace')element.__vue__=component(target);else element.__vue__.kindId=target;},300);
      });
     </script>`});
    if (url.pathname !== '/ic-web/reserve') return route.abort();
    const floor = url.searchParams.get('labIds')!;
    requestedFloors.push(floor);
    return route.fulfill({contentType:'application/json',body:JSON.stringify({code:0,count:1,data:[{
     devId:Number(floor)*10,devName:'Synthetic Room',labId:Number(floor),labName:'Floor '+floor,
     maxUser:5,kindName:'Discussion',openTimes:[{openStartTime:'08:00',openEndTime:'23:00',openLimit:1}],resvInfo:[]
    }]})});
   });
   await page.goto(LIBRARY_ORIGIN+'/#/ic/researchSpace/2/1');
   const reader=createLibraryPageReader(page,[{id:'1',name:'Floor 1'},{id:'2',name:'Floor 2'}]);
   const rooms=await queryLibraryRooms({},{refresh:false,deadlineMs:Date.now()+12000},reader);
   assert.equal(rooms.meta.coverage,'complete',JSON.stringify(requestedFloors));
   assert.deepEqual(rooms.data.items.map(r=>r.floorId),['1','2']);
   assert.deepEqual(requestedFloors,['1','2'],'one request per target; never invoke a stale component');
   const {queryLibraryAvailability}=await import('../src/adapters/booking-library/index.js');
   const availability=await queryLibraryAvailability({roomId:'20',date:'2026-11-01'},{refresh:false,deadlineMs:Date.now()+12000},reader);
   assert.equal(availability.meta.coverage,'complete');
   assert.equal(availability.data.roomId,'20');
   assert.deepEqual(requestedFloors,['1','2','1','2'],'also wait when switching back to the first floor');
  } finally {await browser.close();}
 });
}
