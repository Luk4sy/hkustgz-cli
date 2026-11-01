import type {Page} from 'playwright';
import type {QueryOptions} from '../../core/contracts.js';
import type {LibraryBookingIntent} from '../../booking-operations/intent.js';
import {SourceId} from '../../booking-operations/intent.js';
import type {CreateSubmission} from '../../booking-operations/create.js';
import {LIBRARY_ORIGIN} from './manifest.js';
import {z} from 'zod';
const payload=z.strictObject({sysKind:z.literal(1),appAccNo:z.number().int().positive().safe(),memberKind:z.literal(1),resvBeginTime:z.string(),resvEndTime:z.string(),testName:z.string(),resvKind:z.literal(2),resvProperty:z.literal(0),appUrl:z.literal(''),resvMember:z.array(z.number().int().positive().safe()).length(1),resvDev:z.array(z.number().int().positive().safe()).length(1),memo:z.literal(''),captcha:z.literal(''),addServices:z.array(z.never()).length(0)});
const localTime=(s:string)=>s.slice(0,19).replace('T',' ');
/** Recorded self-only M0 protocol. No API credentials or raw responses escape. */
export function createLibraryCreateTransport(page:Page){
 let used=false;
 return async(intent:LibraryBookingIntent,options:QueryOptions):Promise<CreateSubmission>=>{
  const live=()=>!options.signal?.aborted&&Date.now()<options.deadlineMs;
  if(used||!live()||intent.participantIds.length!==1||new URL(page.url()).origin!==LIBRARY_ORIGIN)return{kind:'unknown'};used=true;
  let done=false,forwarded=false;let resolve!:(r:CreateSubmission)=>void;
  const result=new Promise<CreateSubmission>(r=>{resolve=r;});
  const finish=(r:CreateSubmission)=>{if(!done){done=true;resolve(r);}};
  const cancel=()=>finish({kind:'unknown'});options.signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,Math.max(1,Math.min(30000,options.deadlineMs-Date.now())));
  try{
   await page.route('**/*',async route=>{
    const req=route.request();if(['GET','HEAD','OPTIONS'].includes(req.method()))return route.fallback();
    try{
     const u=new URL(req.url());const parsed=payload.safeParse(req.postDataJSON());
     if(done||forwarded||!live()||req.method()!=='POST'||u.origin!==LIBRARY_ORIGIN||u.pathname!=='/ic-web/reserve'||u.search||!parsed.success)throw Error();
     const b=parsed.data;
     if(String(b.appAccNo)!==intent.participantIds[0]||b.resvMember[0]!==b.appAccNo||String(b.resvDev[0])!==intent.roomId||b.resvBeginTime!==localTime(intent.startsAt)||b.resvEndTime!==localTime(intent.endsAt)||b.testName!==(intent.purpose??'')||Date.parse(intent.startsAt)<Date.now())throw Error();
     forwarded=true;
     const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:Math.max(1,Math.min(30000,options.deadlineMs-Date.now()))});
     let body:unknown;try{body=await response.json();}catch{}
     const ack=z.object({code:z.literal(0),data:z.object({resvId:z.number().int().positive().safe()})}).safeParse(body);
     const id=ack.success?String(ack.data.data.resvId):null;
     const accepted=response.status()===200&&id!==null&&SourceId.safeParse(id).success;
     finish(accepted?{kind:'accepted',reservationId:id!}:{kind:'unknown'});
     // Do not forward Location, raw diagnostics or other source headers/body.
     await route.fulfill({status:response.status(),json:accepted?{code:0,data:{resvId:Number(id)}}:{code:-1,data:null}});
    }catch{finish({kind:'unknown'});await route.abort().catch(()=>{});}
   });
   if(!live())return{kind:'unknown'};
   // Use the page's normal authenticated client, never invent auth headers.
   void page.evaluate(async i=>{
    const v=[...document.querySelectorAll('*')].map(e=>(e as any).__vue__).find(v=>v?.$axios?.post&&v?.$store?.state?.userInfo);
    if(!v||location.origin!=='https://libroombooking.hkust-gz.edu.cn')throw Error('Unsupported client');
    const base=new URL(v.$axios.defaults?.baseURL,location.href);
    if(base.origin!==location.origin||base.pathname.replace(/\/$/,'')!=='/ic-web'||String(v.$store.state.userInfo.accNo)!==i.participantIds[0])throw Error('Unsupported client');
    const account=v.$store.state.userInfo.accNo;
    await v.$axios.post('/reserve',{sysKind:1,appAccNo:account,memberKind:1,resvBeginTime:i.startsAt.slice(0,19).replace('T',' '),resvEndTime:i.endsAt.slice(0,19).replace('T',' '),testName:i.purpose??'',resvKind:2,resvProperty:0,appUrl:'',resvMember:[account],resvDev:[Number(i.roomId)],memo:'',captcha:'',addServices:[]});
   },intent).then(cancel,cancel);
   return await result;
  }catch{return{kind:'unknown'};}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);done=true;}
  // The guard intentionally remains until session close: late native retries must stay blocked.
 };
}
