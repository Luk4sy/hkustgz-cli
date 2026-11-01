import {createHash} from 'node:crypto';
import type {DateRange,QueryOptions} from '../core/contracts.js';
import {resolveDateRange} from '../core/policy.js';
import {CliFailure} from '../core/errors.js';
import {SourceId} from './intent.js';
import {CancelTargetSchema,CancellationEvidenceSchema,CancelSubmissionSchema,type CancelTarget,type CancelSubmission,type CancellationEvidence} from './cancel-model.js';
import {OperationStore,DuplicateOperationFailure,type StoredOperation} from './store.js';
import type {OperationResult,OperationData,Preview} from './contract.js';
import {AssessmentSchema,withOperationDeadline,assertOperationLive,sessionOperationOptions,operationData,operationReceipt,operationFailure,type OperationSession,type OperationSource} from './workflow.js';
export type {CancelTarget,CancelSubmission} from './cancel-model.js';
export interface CancelSource extends OperationSource {submitCancel?:(target:CancelTarget,options:QueryOptions)=>Promise<CancelSubmission>;readCancelled?:(id:string,range:DateRange,options:QueryOptions)=>Promise<unknown>}
export interface CancelProof {reservationId:string;target:CancelTarget;evidence:'cancel_success'|'cancelled_record';sourceStatusCode:number|null;approvalState:Preview['approvalState']}
const actor=(x:string)=>{if(!/^[a-f0-9]{64}$/.test(x))throw new CliFailure('ADAPTER_CHANGED');return x;};
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function cancellationTarget(id:string,preview:Preview):CancelTarget|undefined{const p=CancelTargetSchema.safeParse({reservationId:id,roomIds:preview.rooms.map(x=>x.id),startsAt:preview.startsAt,endsAt:preview.endsAt,memberCount:preview.participantCount});return p.success?p.data:undefined;}
function matchingTarget(a:CancelTarget,b:CancelTarget){return a.reservationId===b.reservationId&&JSON.stringify(a.roomIds)===JSON.stringify(b.roomIds)&&Date.parse(a.startsAt)===Date.parse(b.startsAt)&&Date.parse(a.endsAt)===Date.parse(b.endsAt);}
export function readCancellationEvidence(id:string,range:DateRange,value:unknown):CancelProof|undefined{
 const p=CancellationEvidenceSchema.safeParse(value);if(!p.success)return;const e=p.data;
 if(e.reservationId!==id||!e.isOwner||e.scope.from!==range.from||e.scope.to!==range.to||Date.parse(e.startsAt)>=Date.parse(range.to+'T00:00:00+08:00')||Date.parse(e.endsAt)<=Date.parse(range.from+'T00:00:00+08:00'))return;
 return{reservationId:id,target:{reservationId:id,roomIds:e.roomIds,startsAt:e.startsAt,endsAt:e.endsAt,memberCount:e.memberCount},evidence:'cancelled_record',sourceStatusCode:e.sourceStatusCode,approvalState:e.approvalState};
}
export function matchesCancellation(record:StoredOperation,value:unknown):CancelProof|undefined{
 if(record.action!=='cancel'||!record.reservationId||!record.cancellationTarget)return;
 if(record.receiptEvidence==='cancel_success'||record.receiptEvidence==='cancelled_record')return{reservationId:record.reservationId,target:record.cancellationTarget,evidence:record.receiptEvidence,sourceStatusCode:record.sourceStatusCode,approvalState:record.approvalState};
 if(!record.intent||!('from'in record.intent))return;
 const proof=readCancellationEvidence(record.reservationId,{from:record.intent.from,to:record.intent.to,timezone:'Asia/Shanghai'},value);return proof&&matchingTarget(proof.target,record.cancellationTarget)?proof:undefined;
}
export function cancelledSnapshot(record:StoredOperation,proof:CancelProof,outcome:'confirmed'|'already_cancelled'='confirmed'):StoredOperation{const {intent,preview,confirmationDigest,...minimal}=record;return{...minimal,lifecycle:'resolved',outcome,reservationId:proof.reservationId,sourceStatusCode:proof.sourceStatusCode,approvalState:proof.approvalState};}
export async function confirmCancellation(store:OperationStore,r:StoredOperation,proof:CancelProof,now:number,outcome:'confirmed'|'already_cancelled'='confirmed'){return store.finalizeCancellation(r.operationId,{outcome,evidence:proof.evidence,sourceStatusCode:proof.sourceStatusCode,approvalState:proof.approvalState},now);}
function assessment(id:string,value:unknown,now:number){const parsed=AssessmentSchema.safeParse(value);if(!parsed.success||parsed.data.reservationId!==id)throw new CliFailure('ADAPTER_CHANGED');let a=parsed.data;const target=cancellationTarget(id,a.preview);
 if(a.eligibility==='ready'&&(!target||!target.memberCount||a.validUntil===undefined||a.validUntil<=now||a.validUntil>Date.parse(target.startsAt))){a={...a,eligibility:a.validUntil!==undefined&&a.validUntil<=now?'blocked':'unknown',checks:[...a.checks,{id:'cancelWindow',state:a.validUntil!==undefined&&a.validUntil<=now?'fail':'unknown',reason:'A verified target, ownership and bounded cancellation permission window are required.'}]};}
 return{a,target};
}
function minimalPreview(proof:CancelProof):Preview{return{rooms:proof.target.roomIds.map(id=>({id,name:id,location:null})),startsAt:proof.target.startsAt,endsAt:proof.target.endsAt,durationMinutes:(Date.parse(proof.target.endsAt)-Date.parse(proof.target.startsAt))/60000,participantIds:[],participantCount:proof.target.memberCount,purpose:null,approvalState:proof.approvalState,effects:['This exact reservation is already authoritatively cancelled. No cancellation request will be sent.'],feeState:'unknown'};}
export async function prepareCancellationPreview(store:OperationStore,session:OperationSession,id:string,inputRange:DateRange,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 if(!SourceId.safeParse(id).success)throw new CliFailure('INVALID_ARGUMENT');const range=resolveDateRange(inputRange,now()),intent={reservationId:id,from:range.from,to:range.to};let observed:OperationData|undefined;
 try{
  const result=await withOperationDeadline(options,outer=>session(store.secret,outer,async(base,inner)=>{const o=sessionOperationOptions(outer,inner),source=base as CancelSource;const subject=actor(await source.identity(store.secret,o));assertOperationLive(o);const known=await store.findCancellation(subject,id,now());let proof=known?matchesCancellation(known,undefined):undefined;
   if(!proof&&source.readCancelled)proof=readCancellationEvidence(id,range,await source.readCancelled(id,range,o));assertOperationLive(o);
   const value=proof?undefined:assessment(id,await source.cancelAssessment(id,range,o),now());assertOperationLive(o);
   if(actor(await source.identity(store.secret,o))!==subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   if(proof)observed=known&&known.cancellationTarget&&matchingTarget(proof.target,known.cancellationTarget)?operationData(cancelledSnapshot(known,proof,'already_cancelled')):{operationId:null,action:'cancel',lifecycle:'resolved',outcome:'already_cancelled',eligibility:'unknown',reservationId:id,sourceStatusCode:proof.sourceStatusCode,approvalState:proof.approvalState,checks:[{id:'cancelledRecord',state:'pass',reason:'Exact authoritative cancelled record verified.'}]};
   return{subject,known,proof,value};
  }));assertOperationLive(options);
  if(result.proof){let r=result.known;if(r&&r.cancellationTarget&&matchingTarget(result.proof.target,r.cancellationTarget)){
    if(r.outcome==='unknown'||r.lifecycle==='prepared')r=await confirmCancellation(store,r,result.proof,now(),r.lifecycle==='prepared'?'already_cancelled':'confirmed');
    return operationReceipt('booking cancel-preview',cancelledSnapshot(r,result.proof,'already_cancelled'));
   }
   r=await store.prepare({action:'cancel',subject:result.subject,intent,ruleVersion:hash(result.proof),eligibility:'unknown',checks:[{id:'cancelledRecord',state:'pass',reason:'Exact authoritative cancelled record verified.'}],preview:minimalPreview(result.proof),reservationId:id,sourceStatusCode:result.proof.sourceStatusCode,cancellationTarget:result.proof.target},now());observed=operationData(cancelledSnapshot(r,result.proof,'already_cancelled'));r=await confirmCancellation(store,r,result.proof,now(),'already_cancelled');return operationReceipt('booking cancel-preview',r);
  }
  const {a,target}=result.value!;const r=await store.prepare({action:'cancel',subject:result.subject,intent,ruleVersion:a.ruleVersion,eligibility:a.eligibility,checks:a.checks,preview:a.preview,reservationId:id,sourceStatusCode:a.sourceStatusCode??null,...target?{cancellationTarget:target}:{},...a.validUntil!==undefined?{permissionUntil:a.validUntil}:{}},now());return operationReceipt('booking cancel-preview',r,true);
 }catch(e){if(e instanceof DuplicateOperationFailure){const d=operationData(e.operation);delete d.preview;return operationFailure('booking cancel-preview',e,d);}if(observed)return operationFailure('booking cancel-preview',e,observed);throw e;}
}
export async function cancelReservation(store:OperationStore,session:OperationSession,id:string,digest:string,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 let r:StoredOperation|undefined,observed:StoredOperation|undefined;
 try{
  r=await store.read(id,now());r=await store.validateConfirmation(id,digest,now(),'cancel');const localProof=matchesCancellation(r,undefined);
  if(r.outcome==='unknown'&&!localProof)return operationReceipt('booking cancel',r);
  if(!r.cancellationTarget||(!r.intent&&r.lifecycle==='prepared'))throw new CliFailure('ADAPTER_CHANGED');
  const range=r.intent&&'from'in r.intent?{from:r.intent.from,to:r.intent.to,timezone:'Asia/Shanghai' as const}:undefined;
  await withOperationDeadline(options,outer=>session(store.secret,outer,async(base,inner)=>{const o=sessionOperationOptions(outer,inner),source=base as CancelSource;
   if(actor(await source.identity(store.secret,o))!==r!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   const proof=localProof??(source.readCancelled&&range?readCancellationEvidence(r!.reservationId!,range,await source.readCancelled(r!.reservationId!,range,o)):undefined);assertOperationLive(o);
   const fresh=proof?undefined:assessment(r!.reservationId!,await source.cancelAssessment(r!.reservationId!,range!,o),now());assertOperationLive(o);
   if(actor(await source.identity(store.secret,o))!==r!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   if(proof&&matchingTarget(proof.target,r!.cancellationTarget!)){observed=cancelledSnapshot(r!,proof,'already_cancelled');if(r!.lifecycle==='prepared'||r!.outcome==='unknown')r=await confirmCancellation(store,r!,proof,now(),r!.lifecycle==='prepared'?'already_cancelled':'confirmed');r=cancelledSnapshot(r!,proof,'already_cancelled');return;}
   if(proof)throw new CliFailure('ADAPTER_CHANGED');
   if(!source.submitCancel)throw new CliFailure('CAPABILITY_PENDING');
   const {a,target}=fresh!;
   if(a.eligibility!=='ready'||!target||!matchingTarget(target,r!.cancellationTarget!)||JSON.stringify(a.preview)!==JSON.stringify(r!.preview)||a.ruleVersion!==r!.ruleVersion||a.validUntil!==r!.permissionUntil){r=await store.invalidate(id,a.eligibility==='blocked'?'blocked':'unknown',a.checks,now());throw new CliFailure(a.eligibility==='blocked'?'BOOKING_RULE_BLOCKED':'CONFIRMATION_REQUIRED');}
   if(o.deadlineMs-Date.now()<1000)throw new CliFailure('QUERY_TIMEOUT');r=await store.beginDispatch({id,digest,subject:r!.subject,intent:r!.intent!,ruleVersion:a.ruleVersion},now());assertOperationLive(o);
   const dispatchDeadlineMs=Math.min(r.expiresAt,a.validUntil!);if(now()>=dispatchDeadlineMs)throw new CliFailure('PREVIEW_EXPIRED');
   const submitted=CancelSubmissionSchema.safeParse(await source.submitCancel(target,{...o,dispatchDeadlineMs}));assertOperationLive(o);if(!submitted.success||submitted.data.kind==='unknown')return;
   if(submitted.data.kind==='rejected'){r=await store.finalizeCancellation(id,{outcome:'not_applied',sourceStatusCode:r!.sourceStatusCode,approvalState:r!.approvalState},now());throw new CliFailure(submitted.data.code);}
   if(submitted.data.reservationId!==r!.reservationId)return;
   const ack:CancelProof={reservationId:r!.reservationId!,target,evidence:'cancel_success',sourceStatusCode:r!.sourceStatusCode,approvalState:r!.approvalState};observed=cancelledSnapshot(r!,ack);r=await store.noteCancelReceipt(id,ack.reservationId,now());assertOperationLive(o);if(actor(await source.identity(store.secret,o))!==r.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);r=await confirmCancellation(store,r,ack,now());
  }));return operationReceipt('booking cancel',r!);
 }catch(e){if(r){try{r=await store.read(id,now());}catch{}}
  if(observed)return operationFailure('booking cancel',e,operationData(observed));const special=e instanceof CliFailure&&['INTERRUPTED','TERMINATED','CLEANUP_FAILED','OPERATION_STATE_UNAVAILABLE'].includes(e.code);return operationFailure('booking cancel',r?.outcome==='unknown'&&!special?new CliFailure('OPERATION_UNCERTAIN'):e,r?operationData(r):null);
 }
}
