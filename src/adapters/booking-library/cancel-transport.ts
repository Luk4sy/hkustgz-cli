import type {Page} from 'playwright';import {z} from 'zod';
import type {QueryOptions} from '../../core/contracts.js';import type {CancelTarget,CancelSubmission} from '../../booking-operations/cancel-model.js';import {LIBRARY_ORIGIN} from './manifest.js';
/** The lookup is a private reader closure; UUID and account never enter operation data. */
export function createLibraryCancelTransport(page:Page,lookup:(target:CancelTarget)=>{uuid:string;account:number}|undefined){
 let used=false;
 return async(target:CancelTarget,options:QueryOptions):Promise<CancelSubmission>=>{
  const live=()=>!options.signal?.aborted&&Date.now()<options.deadlineMs&&(options.dispatchDeadlineMs===undefined||Date.now()<options.dispatchDeadlineMs);
  const entry=lookup(target);if(used||!entry||!live()||new URL(page.url()).origin!==LIBRARY_ORIGIN)return{kind:'unknown'};used=true;
  let done=false,forwarded=false;let resolve!:(r:CancelSubmission)=>void;const result=new Promise<CancelSubmission>(r=>resolve=r);const finish=(r:CancelSubmission)=>{if(!done){done=true;resolve(r);}};const cancel=()=>finish({kind:'unknown'});options.signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,Math.max(1,Math.min(30000,options.deadlineMs-Date.now())));
  try{
   await page.route('**/*',async route=>{
    const request=route.request();if(['GET','HEAD','OPTIONS'].includes(request.method()))return route.fallback();
    try{
     const u=new URL(request.url());
     const current=lookup(target);
     if(done||forwarded||!live()||request.method()!=='POST'||u.origin!==LIBRARY_ORIGIN||u.pathname!=='/ic-web/reserve/delete'||u.searchParams.size!==1||u.searchParams.get('uuid')!==entry.uuid||(request.postData()??'')!==''||!current||current.uuid!==entry.uuid||current.account!==entry.account)throw Error();
     forwarded=true;const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:Math.max(1,Math.min(30000,options.deadlineMs-Date.now()))});let value:unknown;try{value=await response.json();}catch{}
     const ack=z.object({code:z.literal(0),message:z.literal('删除成功'),data:z.null()}).safeParse(value);const confirmed=response.status()===200&&ack.success;
     finish(confirmed?{kind:'cancel_ack',authority:'m0_delete_success',reservationId:target.reservationId}:{kind:'unknown'});
     await route.fulfill({status:response.status(),json:confirmed?{code:0,message:'删除成功',data:null}:{code:-1,data:null}});
    }catch{finish({kind:'unknown'});await route.abort().catch(()=>{});}
   });
   if(!live())return{kind:'unknown'};
   void page.evaluate(async({uuid,account})=>{
    const v=[...document.querySelectorAll('*')].map(e=>(e as any).__vue__).find(v=>v?.$axios?.post&&v?.$store?.state?.userInfo);
    if(!v||location.origin!=='https://libroombooking.hkust-gz.edu.cn'||v.$store.state.userInfo.accNo!==account)throw Error('Unsupported client');
    const base=new URL(v.$axios.defaults?.baseURL,location.href);if(base.origin!==location.origin||base.pathname.replace(/\/$/,'')!=='/ic-web')throw Error('Unsupported client');
    await v.$axios.post('/reserve/delete',undefined,{params:{uuid}});
   },entry).then(cancel,cancel);
   return await result;
  }catch{return{kind:'unknown'};}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);done=true;}
  // Keep the guard through session close to block native retries and late writes.
 };
}
