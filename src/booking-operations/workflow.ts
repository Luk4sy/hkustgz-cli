import {z} from 'zod';
import type {QueryOptions,DateRange} from '../core/contracts.js';
import {CliFailure,classifyError} from '../core/errors.js';
import {normalizeIntent,SourceId,type LibraryBookingIntent} from './intent.js';
import {resolveDateRange} from '../core/policy.js';
import {PreviewSchema,CheckSchema,type OperationData,type OperationResult} from './contract.js';
import {OperationStore,type StoredOperation} from './store.js';
const AssessmentSchema=z.strictObject({eligibility:z.enum(['ready','blocked','unknown']),ruleVersion:z.string().regex(/^[a-f0-9]{64}$/),checks:z.array(CheckSchema).min(1),preview:PreviewSchema,reservationId:SourceId.nullable().optional(),sourceStatusCode:z.number().int().nonnegative().nullable().optional()}).refine(a=>a.eligibility!=='ready'||(a.checks.every(c=>c.state==='pass')&&a.preview.feeState==='none'&&a.preview.approvalState!=='unknown'&&a.preview.rooms.length>0&&!!a.preview.startsAt&&!!a.preview.endsAt&&a.preview.durationMinutes!==null&&a.preview.durationMinutes>0));
export type Assessment=z.infer<typeof AssessmentSchema>;
export interface OperationSource {
 identity(secret:Buffer,options:QueryOptions):Promise<string>;
 createAssessment(intent:LibraryBookingIntent,options:QueryOptions):Promise<Assessment>;
 cancelAssessment(id:string,range:DateRange,options:QueryOptions):Promise<Assessment>;
 /** M2 may observe candidates only. No result here can resolve a possibly sent operation. */
 reconcile(record:StoredOperation,options:QueryOptions):Promise<unknown>;
}
export type OperationSession=<T>(secret:Buffer,options:QueryOptions,run:(source:OperationSource)=>Promise<T>)=>Promise<T>;
export type PreviewRequest={action:'create';intent:unknown}|{action:'cancel';id:string;range:DateRange};
function data(r:StoredOperation,confirmation=false):OperationData{return{operationId:r.operationId,action:r.action,lifecycle:r.lifecycle,outcome:r.outcome,eligibility:r.eligibility,reservationId:r.reservationId,sourceStatusCode:r.sourceStatusCode,approvalState:r.approvalState,expiresAt:new Date(r.expiresAt).toISOString(),checks:r.checks,...r.preview?{preview:r.preview}:{},...confirmation&&r.confirmationDigest?{confirmationDigest:r.confirmationDigest}:{}};}
export function operationFailure(command:string,error:unknown,value:OperationData|null=null):OperationResult{const e=classifyError(error).error;return{ok:false,data:value,error:{code:e.code,message:e.message,remediation:e.remediation,retryable:false},meta:{schemaVersion:'1',kind:'operation',command}};}
const success=(command:string,value:OperationData):OperationResult=>({ok:true,data:value,meta:{schemaVersion:'1',kind:'operation',command}});
function receipt(command:string,r:StoredOperation,confirmation=false):OperationResult{
 const value=data(r,confirmation);
 if(r.outcome==='unknown'||r.lifecycle==='dispatching')return operationFailure(command,new CliFailure('OPERATION_UNCERTAIN'),value);
 if(confirmation&&r.eligibility!=='ready')return operationFailure(command,new CliFailure(r.eligibility==='blocked'?'BOOKING_RULE_BLOCKED':'ADAPTER_CHANGED','Review the unknown source checks. No school write was sent and no confirmation digest was generated.'),value);
 return success(command,value);
}
async function bounded<T>(options:QueryOptions,run:(o:QueryOptions)=>Promise<T>):Promise<T>{
 if(options.signal?.aborted)throw options.signal.reason;
 if(!Number.isFinite(options.deadlineMs)||options.deadlineMs<=Date.now())throw new CliFailure('QUERY_TIMEOUT');
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let reject!:(e:unknown)=>void;
 const stop=(e:unknown)=>{controller.abort(e);reject(e);};const cancel=()=>stop(options.signal!.reason);
 const interrupted=new Promise<never>((_,r)=>{reject=r;});
 timer=setTimeout(()=>stop(new CliFailure('QUERY_TIMEOUT')),Math.max(1,options.deadlineMs-Date.now()));options.signal?.addEventListener('abort',cancel,{once:true});
 try{const result=await Promise.race([run({...options,signal:controller.signal}),interrupted]);if(controller.signal.aborted)throw controller.signal.reason;if(Date.now()>=options.deadlineMs)throw new CliFailure('QUERY_TIMEOUT');return result;}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
}
function live(options:QueryOptions){if(options.signal?.aborted)throw options.signal.reason;if(Date.now()>=options.deadlineMs)throw new CliFailure('QUERY_TIMEOUT');}
function actor(value:string){if(!/^[a-f0-9]{64}$/.test(value))throw new CliFailure('ADAPTER_CHANGED');return value;}
export async function preparePreview(store:OperationStore,session:OperationSession,request:PreviewRequest,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 const intent=request.action==='create'?normalizeIntent(request.intent,now()):{reservationId:SourceId.parse(request.id),...(({from,to})=>({from,to}))(resolveDateRange(request.range,now()))};
 const evidence=await bounded(options,o=>session(store.secret,o,async source=>{
  const subject=actor(await source.identity(store.secret,o));live(o);
  const value=request.action==='create'?await source.createAssessment(intent as LibraryBookingIntent,o):await source.cancelAssessment(request.id,request.range,o);live(o);
  const parsed=AssessmentSchema.safeParse(value);if(!parsed.success)throw new CliFailure('ADAPTER_CHANGED');
  if(request.action==='create'){
   const expected=intent as LibraryBookingIntent,p=parsed.data.preview;
   if(p.rooms.length!==1||p.rooms[0]!.id!==expected.roomId||p.startsAt!==expected.startsAt||p.endsAt!==expected.endsAt||p.durationMinutes!==(Date.parse(expected.endsAt)-Date.parse(expected.startsAt))/60000||JSON.stringify([...p.participantIds].sort((a,b)=>Number(a)-Number(b)))!==JSON.stringify(expected.participantIds)||p.participantCount!==expected.participantIds.length||p.purpose!==(expected.purpose??null))throw new CliFailure('ADAPTER_CHANGED');
  }
  const fresh=actor(await source.identity(store.secret,o));live(o);if(subject!==fresh)throw new CliFailure('LOGIN_REQUIRED');
  if(request.action==='cancel'&&parsed.data.reservationId!==request.id)throw new CliFailure('ADAPTER_CHANGED');
  return{subject,assessment:parsed.data};
 }));
 // Persist only after the source session (including cleanup) has successfully returned.
 live(options);if(request.action==='create')normalizeIntent(intent,now());const r=await store.prepare({action:request.action,intent,...evidence.assessment,reservationId:evidence.assessment.reservationId??null,sourceStatusCode:evidence.assessment.sourceStatusCode??null,subject:evidence.subject},now());
 return receipt(request.action==='create'?'booking preview':'booking cancel-preview',r,true);
}
export async function inspectOperation(store:OperationStore,id:string,session:OperationSession|undefined,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 let r=await store.read(id,now());
 if(session){try{await bounded(options,o=>session(store.secret,o,async source=>{
  if(actor(await source.identity(store.secret,o))!==r.subject)throw new CliFailure('LOGIN_REQUIRED');live(o);
  await source.reconcile(r,o);live(o);
  if(actor(await source.identity(store.secret,o))!==r.subject)throw new CliFailure('LOGIN_REQUIRED');live(o);
 }));}catch(e){return operationFailure('booking operation',e,data(r));}}
 r=await store.read(id,now());return receipt('booking operation',r);
}
