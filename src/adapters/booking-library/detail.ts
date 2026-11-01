import {z} from 'zod';
import type {DateRange,QueryOptions} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';
import {collectPages,buildQueryResult} from '../../core/query.js';
import {resolveDateRange} from '../../core/policy.js';
import {LIBRARY_ORIGIN,LIBRARY_URL} from './manifest.js';
import {LibraryIdentityReadError} from './identity.js';
export interface LibraryInspectionReader {
 /** False throughout an internal refresh, and until fresh identity has been verified. */
 readonly identityVerified:boolean;
 fingerprint(secret:Uint8Array):string;
 assertIdentity(signal:AbortSignal):Promise<void>;
 page(range:DateRange,page:number,signal:AbortSignal):Promise<unknown>;
}
const positive=z.number().int().positive().safe();
const record=z.object({resvId:positive,resvBeginTime:z.number().finite(),resvEndTime:z.number().finite(),resvStatus:z.number().int().nonnegative(),ownerMatches:z.boolean(),memberCount:z.number().int().nonnegative(),resvDevInfoList:z.array(z.object({devId:positive,devName:z.string().trim().min(1)})).min(1)});
export async function queryLibraryDetail(input:{id:string;range:DateRange},options:QueryOptions,reader:LibraryInspectionReader){
 if(!/^[1-9]\d*$/.test(input.id)||!Number.isSafeInteger(Number(input.id)))throw new CliFailure('INVALID_ARGUMENT');
 const range=resolveDateRange(input.range,Date.now());const seen=new Set<number>();let total:number|undefined;let filter:number|undefined;let identityFailure:unknown;let identityFailed=false;let boundaryIdentityVerified=false;
 const failIdentity=(error:unknown)=>{identityFailed=true;identityFailure=error instanceof LibraryIdentityReadError?error.failure:error;return identityFailure;};
 const assertIdentity=async(signal:AbortSignal)=>{try{boundaryIdentityVerified=false;await reader.assertIdentity(signal);boundaryIdentityVerified=true;}catch(e){throw failIdentity(e);}};
 const start=Date.parse(range.from+'T00:00:00+08:00'),end=Date.parse(range.to+'T00:00:00+08:00');
 const collected=await collectPages({origin:LIBRARY_ORIGIN,readOnly:true,readPage:async(cursor,signal)=>{
  const p=cursor===null?1:Number(cursor);await assertIdentity(signal);
  let value:unknown;try{value=await reader.page(range,p,signal);}catch(e){if(e instanceof LibraryIdentityReadError||(e instanceof CliFailure&&e.code==='LOGIN_REQUIRED'))throw failIdentity(e);throw e;}
  await assertIdentity(signal);
  if((value as {body?:{code?:unknown}}|null)?.body?.code===300)throw failIdentity(new CliFailure('LOGIN_REQUIRED'));
  const schema=z.object({scope:z.object({from:z.literal(range.from),to:z.literal(range.to),timezone:z.literal('Asia/Shanghai'),page:z.literal(p),needStatus:positive}),body:z.object({code:z.literal(0),count:z.number().int().nonnegative(),data:z.array(record)})});
  const parsed=schema.safeParse(value);if(!parsed.success)throw new CliFailure('ADAPTER_CHANGED');const {scope,body}=parsed.data;
  if((total!==undefined&&body.count!==total)||(filter!==undefined&&scope.needStatus!==filter)||body.data.length!==Math.max(0,Math.min(10,body.count-(p-1)*10))||p>Math.max(1,Math.ceil(body.count/10)))throw new CliFailure('ADAPTER_CHANGED');total=body.count;filter=scope.needStatus;
  const ids=body.data.map(x=>x.resvId);if(new Set(ids).size!==ids.length||ids.some(id=>seen.has(id)))throw new CliFailure('ADAPTER_CHANGED');
  const items=body.data.map(x=>{
   if(x.resvBeginTime>=x.resvEndTime||x.resvBeginTime>=end||x.resvEndTime<=start)throw new CliFailure('ADAPTER_CHANGED');
   const blocked=!x.ownerMatches||(x.resvStatus&4)!==0||(x.resvStatus&128)!==0;
   return{id:String(x.resvId),rooms:x.resvDevInfoList.map(d=>({id:String(d.devId),name:d.devName})),startsAt:new Date(x.resvBeginTime).toISOString(),endsAt:new Date(x.resvEndTime).toISOString(),statusCode:x.resvStatus,memberCount:x.memberCount,isOwner:x.ownerMatches,cancellationEligibility:blocked?'blocked' as const:'unknown' as const,cancellationReason:blocked?'Source ownership or status does not permit this cancellation route.':'Cancellation window, maintenance and permission are not fully verified.'};
  });ids.forEach(id=>seen.add(id));const done=p*10>=body.count;return{items,next:done?null:String(p+1),exhausted:done,emptyConfirmed:body.count===0};
 }}, {...options,limit:2000});
 if(identityFailed)throw identityFailure instanceof CliFailure?identityFailure:new CliFailure(collected.failure?.code??'ADAPTER_CHANGED');
 // A timed-out refresh may still be awaiting its response after collectPages returns.
 // Only ordinary list failures may retain previously verified records.
 if(!boundaryIdentityVerified||!reader.identityVerified)throw new CliFailure(collected.failure?.code??'ADAPTER_CHANGED');
 const match=collected.items.find(x=>x.id===input.id)??null;
 const result=buildQueryResult({...collected,items:match?[match]:[]},{schemaVersion:'1',command:'booking detail',service:'booking-library',sourceUrl:LIBRARY_URL,fetchedAt:new Date().toISOString(),timezone:'Asia/Shanghai',readMethod:'response',cache:{hit:false,storedAt:null},warnings:[{code:'SCOPED_DETAIL',message:'Only the requested date window and normal visible status options were searched. Absence does not prove cancellation or nonexistence.'},{code:'BOOKING_RULES_UNKNOWN',message:'Current cancellation permission is not established; no write action is enabled.'}]});
 return{...result,data:{id:input.id,from:range.from,to:range.to,sourceStatusScope:'visible_options',statusFilter:filter??null,record:match,absence:match?null:collected.coverage==='complete'?'not_found_in_scope':'unknown'}};
}
