import {z} from 'zod';
import type {QueryOptions,DateRange} from '../core/contracts.js';
import {CliFailure,classifyError} from '../core/errors.js';
import {normalizeIntent,SourceId,type LibraryBookingIntent} from './intent.js';
import {resolveDateRange} from '../core/policy.js';
import {PreviewSchema,CheckSchema,type OperationData,type OperationResult} from './contract.js';
import {OperationStore,DuplicateOperationFailure,type StoredOperation} from './store.js';
export const AssessmentSchema=z.strictObject({eligibility:z.enum(['ready','blocked','unknown']),ruleVersion:z.string().regex(/^[a-f0-9]{64}$/),checks:z.array(CheckSchema).min(1),preview:PreviewSchema,reservationId:SourceId.nullable().optional(),sourceStatusCode:z.number().int().nonnegative().nullable().optional(),validUntil:z.number().int().positive().safe().optional()}).refine(a=>a.eligibility!=='ready'||(a.checks.every(c=>c.state==='pass')&&a.preview.feeState==='none'&&a.preview.approvalState!=='unknown'&&a.preview.rooms.length>0&&!!a.preview.startsAt&&!!a.preview.endsAt&&a.preview.durationMinutes!==null&&a.preview.durationMinutes>0));
export type Assessment=z.infer<typeof AssessmentSchema>;
export interface OperationSource {
 identity(secret:Buffer,options:QueryOptions):Promise<string>;
 createAssessment(intent:LibraryBookingIntent,options:QueryOptions):Promise<Assessment>;
 cancelAssessment(id:string,range:DateRange,options:QueryOptions):Promise<Assessment>;
 /** Only validated exact creation/cancellation evidence can resolve an unknown operation; candidates alone cannot. */
 reconcile(record:StoredOperation,options:QueryOptions):Promise<unknown>;
}
export type OperationSession=<T>(secret:Buffer,options:QueryOptions,run:(source:OperationSource,options?:QueryOptions)=>Promise<T>)=>Promise<T>;
export type PreviewRequest={action:'create';intent:unknown}|{action:'cancel';id:string;range:DateRange};
export function operationData(r:StoredOperation,confirmation=false):OperationData{return{operationId:r.operationId,action:r.action,lifecycle:r.lifecycle,outcome:r.outcome,eligibility:r.eligibility,reservationId:r.reservationId,sourceStatusCode:r.sourceStatusCode,approvalState:r.approvalState,expiresAt:new Date(r.expiresAt).toISOString(),checks:r.checks,...r.preview?{preview:r.preview}:{},...confirmation&&r.confirmationDigest?{confirmationDigest:r.confirmationDigest}:{}};}
export function operationFailure(command:string,error:unknown,value:OperationData|null=null):OperationResult{const e=classifyError(error).error;return{ok:false,data:value,error:{code:e.code,message:e.message,remediation:e.remediation,retryable:false},meta:{schemaVersion:'1',kind:'operation',command}};}
const success=(command:string,value:OperationData):OperationResult=>({ok:true,data:value,meta:{schemaVersion:'1',kind:'operation',command}});
export function operationReceipt(command:string,r:StoredOperation,confirmation=false):OperationResult{
 const value=operationData(r,confirmation);
 if(r.outcome==='unknown'||r.lifecycle==='dispatching')return operationFailure(command,new CliFailure('OPERATION_UNCERTAIN'),value);
 if(confirmation&&r.eligibility!=='ready')return operationFailure(command,new CliFailure(r.eligibility==='blocked'?'BOOKING_RULE_BLOCKED':'ADAPTER_CHANGED','Review the unknown source checks. No school write was sent and no confirmation digest was generated.'),value);
 return success(command,value);
}
export async function withOperationDeadline<T>(options:QueryOptions,run:(o:QueryOptions)=>Promise<T>):Promise<T>{
 if(options.signal?.aborted)throw options.signal.reason;
 if(!Number.isFinite(options.deadlineMs)||options.deadlineMs<=Date.now())throw new CliFailure('QUERY_TIMEOUT');
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let reject!:(e:unknown)=>void;
 const stop=(e:unknown)=>{controller.abort(e);reject(e);};const cancel=()=>stop(options.signal!.reason);
 const interrupted=new Promise<never>((_,r)=>{reject=r;});
 timer=setTimeout(()=>stop(new CliFailure('QUERY_TIMEOUT')),Math.max(1,options.deadlineMs-Date.now()));options.signal?.addEventListener('abort',cancel,{once:true});
 try{const result=await Promise.race([run({...options,signal:controller.signal}),interrupted]);if(controller.signal.aborted)throw controller.signal.reason;if(Date.now()>=options.deadlineMs)throw new CliFailure('QUERY_TIMEOUT');return result;}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);if(!controller.signal.aborted)controller.abort(new CliFailure('QUERY_TIMEOUT'));}
}
export function assertOperationLive(options:QueryOptions){if(options.signal?.aborted)throw options.signal.reason;if(Date.now()>=options.deadlineMs)throw new CliFailure('QUERY_TIMEOUT');}
function actor(value:string){if(!/^[a-f0-9]{64}$/.test(value))throw new CliFailure('ADAPTER_CHANGED');return value;}
export function validateCreateAssessment(intent:LibraryBookingIntent,value:unknown):Assessment{
 const parsed=AssessmentSchema.safeParse(value);if(!parsed.success)throw new CliFailure('ADAPTER_CHANGED');const p=parsed.data.preview;
 if(p.rooms.length!==1||p.rooms[0]!.id!==intent.roomId||p.startsAt!==intent.startsAt||p.endsAt!==intent.endsAt||p.durationMinutes!==(Date.parse(intent.endsAt)-Date.parse(intent.startsAt))/60000||JSON.stringify([...p.participantIds].sort((a,b)=>Number(a)-Number(b)))!==JSON.stringify(intent.participantIds)||p.participantCount!==intent.participantIds.length||p.purpose!==(intent.purpose??null))throw new CliFailure('ADAPTER_CHANGED');return parsed.data.reservationId?{...parsed.data,eligibility:'blocked',checks:[...parsed.data.checks,{id:'existingReservation',state:'fail',reason:`An existing reservation (${parsed.data.reservationId}) already matches this intent.`}]}:parsed.data;
}
export function sessionOperationOptions(outer:QueryOptions,inner?:QueryOptions):QueryOptions{
 const signals=[outer.signal,inner?.signal].filter((s):s is AbortSignal=>!!s);
 const dispatch=[outer.dispatchDeadlineMs,inner?.dispatchDeadlineMs].filter((n):n is number=>n!==undefined);
 return{...outer,deadlineMs:Math.min(outer.deadlineMs,inner?.deadlineMs??Infinity),...signals.length?{signal:AbortSignal.any(signals)}:{},...dispatch.length?{dispatchDeadlineMs:Math.min(...dispatch)}:{}};
}
export async function preparePreview(store:OperationStore,session:OperationSession,request:PreviewRequest,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 if(request.action==='cancel'){const {prepareCancellationPreview}=await import('./cancel.js');return prepareCancellationPreview(store,session,request.id,request.range,options,now);}
 const intent=normalizeIntent(request.intent,now());
 const evidence=await withOperationDeadline(options,outer=>session(store.secret,outer,async(source,inner)=>{const o=sessionOperationOptions(outer,inner);
  const subject=actor(await source.identity(store.secret,o));assertOperationLive(o);
  const value=await source.createAssessment(intent as LibraryBookingIntent,o);assertOperationLive(o);
  const parsed=AssessmentSchema.safeParse(value);if(!parsed.success)throw new CliFailure('ADAPTER_CHANGED');
  const assessment=validateCreateAssessment(intent as LibraryBookingIntent,value);
  const fresh=actor(await source.identity(store.secret,o));assertOperationLive(o);if(subject!==fresh)throw new CliFailure('LOGIN_REQUIRED');
  return{subject,assessment};
 }));
 // Persist only after the source session (including cleanup) has successfully returned.
 assertOperationLive(options);if(request.action==='create')normalizeIntent(intent,now());const command=request.action==='create'?'booking preview':'booking cancel-preview';
 try{const r=await store.prepare({action:request.action,intent,...evidence.assessment,reservationId:evidence.assessment.reservationId??null,sourceStatusCode:evidence.assessment.sourceStatusCode??null,subject:evidence.subject},now());return operationReceipt(command,r,true);}
 catch(error){if(error instanceof DuplicateOperationFailure){const value=operationData(error.operation);delete value.preview;return operationFailure(command,error,value);}throw error;}
}
export async function inspectOperation(store:OperationStore,id:string,session:OperationSession|undefined,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 let r=await store.read(id,now());let verifiedConfirmation:StoredOperation|undefined;
 try{
 if(session){const evidence=await withOperationDeadline(options,outer=>session(store.secret,outer,async(source,inner)=>{const o=sessionOperationOptions(outer,inner);
  if(actor(await source.identity(store.secret,o))!==r.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
  const evidence=r.action==='cancel'&&(r.receiptEvidence==='cancel_success'||r.receiptEvidence==='cancelled_record')?undefined:await source.reconcile(r,o);assertOperationLive(o);
  if(actor(await source.identity(store.secret,o))!==r.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
  if(r.action==='create'&&r.outcome==='unknown'&&r.receiptEvidence==='create_success'){
   const {matchesCreation,confirmedCreationSnapshot}=await import('./create.js');assertOperationLive(o);
   const proof=matchesCreation(r,evidence);if(proof)verifiedConfirmation=confirmedCreationSnapshot(r,proof);
  }else if(r.action==='cancel'&&r.outcome==='unknown'){
   const {matchesCancellation,cancelledSnapshot}=await import('./cancel.js');assertOperationLive(o);const proof=matchesCancellation(r,evidence);if(proof)verifiedConfirmation=cancelledSnapshot(r,proof);
  }
  return evidence;
 }));assertOperationLive(options);if(r.action==='create'&&r.outcome==='unknown'&&r.receiptEvidence==='create_success'){const {confirmCreation}=await import('./create.js');r=await confirmCreation(store,r,evidence,now());}else if(r.action==='cancel'&&r.outcome==='unknown'){const {matchesCancellation,confirmCancellation}=await import('./cancel.js');const proof=matchesCancellation(r,evidence);if(proof)r=await confirmCancellation(store,r,proof,now());}}
 r=await store.read(id,now());return operationReceipt('booking operation',r);
 }catch(e){return operationFailure('booking operation',e,operationData(verifiedConfirmation??r));}
}
