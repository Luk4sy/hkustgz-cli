import {z} from 'zod';
import type {QueryOptions} from '../core/contracts.js';
import {CliFailure} from '../core/errors.js';
import {SourceId,normalizeIntent,type LibraryBookingIntent} from './intent.js';
import {OperationStore,type StoredOperation} from './store.js';
import {PreviewSchema,type OperationResult} from './contract.js';
import {assertOperationLive,withOperationDeadline,operationData,operationReceipt,operationFailure,validateCreateAssessment,sessionOperationOptions,type OperationSource,type OperationSession} from './workflow.js';
export const CreateSubmissionSchema=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('accepted'),reservationId:SourceId}),
 z.strictObject({kind:z.literal('rejected'),code:z.enum(['BOOKING_CONFLICT','BOOKING_RULE_BLOCKED']),evidence:z.literal('verified_no_effect')}),
 z.strictObject({kind:z.literal('unknown')})
]);
export type CreateSubmission=z.infer<typeof CreateSubmissionSchema>;
export const CreationEvidenceSchema=z.strictObject({kind:z.literal('creation_readback'),reservationId:SourceId,isOwner:z.boolean(),intentMatches:z.boolean(),roomIds:z.array(SourceId),startsAt:z.string(),endsAt:z.string(),statusCode:z.number().int().nonnegative(),approvalState:PreviewSchema.shape.approvalState});
export type CreationEvidence=z.infer<typeof CreationEvidenceSchema>;
export interface CreateSource extends OperationSource {
 submitCreate?:(intent:LibraryBookingIntent,options:QueryOptions)=>Promise<CreateSubmission>;
 readCreated?:(id:string,intent:LibraryBookingIntent,options:QueryOptions)=>Promise<CreationEvidence|undefined>;
}
export function matchesCreation(record:StoredOperation,evidence:unknown):CreationEvidence|undefined{
 const p=CreationEvidenceSchema.safeParse(evidence);if(!p.success||!record.intent||!('roomId'in record.intent)||record.receiptEvidence!=='create_success')return;
 const e=p.data,i=record.intent;
 if(e.reservationId!==record.reservationId||!e.isOwner||!e.intentMatches||e.roomIds.length!==1||e.roomIds[0]!==i.roomId||Date.parse(e.startsAt)!==Date.parse(i.startsAt)||Date.parse(e.endsAt)!==Date.parse(i.endsAt)||(e.statusCode&1)!==1)return;
 return e;
}
export async function confirmCreation(store:OperationStore,record:StoredOperation,evidence:unknown,now:number){const matched=matchesCreation(record,evidence);if(!matched)return record;return store.finalizeCreation(record.operationId,{outcome:'confirmed',sourceStatusCode:matched.statusCode,approvalState:matched.approvalState},now);}
export async function createReservation(store:OperationStore,session:OperationSession,id:string,digest:string,options:QueryOptions,now:()=>number=Date.now):Promise<OperationResult>{
 let record:StoredOperation|undefined;let observedReceipt:string|undefined;let observedProof:CreationEvidence|undefined;
 try{
  record=await store.read(id,now());record=await store.validateConfirmation(id,digest,now());
  if(record.lifecycle!=='prepared')return operationReceipt('booking create',record);
  const intent=normalizeIntent(record.intent,now());
  await withOperationDeadline(options,outer=>session(store.secret,outer,async(base,inner)=>{const o=sessionOperationOptions(outer,inner);
   const source=base as CreateSource;
   if(!source.submitCreate||!source.readCreated)throw new CliFailure('CAPABILITY_PENDING');
   if(await source.identity(store.secret,o)!==record!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   const assessment=validateCreateAssessment(intent,await source.createAssessment(intent,o));assertOperationLive(o);
   if(await source.identity(store.secret,o)!==record!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   if(assessment.reservationId){record=await store.invalidate(id,'blocked',assessment.checks,now());throw new CliFailure('BOOKING_CONFLICT');}
   if(assessment.eligibility!=='ready'||assessment.ruleVersion!==record!.ruleVersion||JSON.stringify(assessment.preview)!==JSON.stringify(record!.preview)){
    record=await store.invalidate(id,assessment.eligibility==='blocked'?'blocked':'unknown',assessment.checks,now());throw new CliFailure(assessment.eligibility==='blocked'?'BOOKING_RULE_BLOCKED':'CONFIRMATION_REQUIRED');
   }
   normalizeIntent(intent,now());
   if(o.deadlineMs-Date.now()<1000)throw new CliFailure('QUERY_TIMEOUT');
   record=await store.beginDispatch({id,digest,subject:record!.subject,intent,ruleVersion:assessment.ruleVersion},now());assertOperationLive(o);if(now()>=record.expiresAt)throw new CliFailure('PREVIEW_EXPIRED');
   // This is the only side-effect attempt. Source pacing must disable retries.
   const submitted=CreateSubmissionSchema.safeParse(await source.submitCreate(intent,{...o,dispatchDeadlineMs:record!.expiresAt}));assertOperationLive(o);
   if(!submitted.success||submitted.data.kind==='unknown')return;
   if(submitted.data.kind==='rejected'){record=await store.finalizeCreation(id,{outcome:'not_applied',sourceStatusCode:null,approvalState:'unknown'},now());throw new CliFailure(submitted.data.code);}
   observedReceipt=submitted.data.reservationId;record=await store.noteCreateReceipt(id,observedReceipt,now());assertOperationLive(o);
   if(await source.identity(store.secret,o)!==record!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   const evidence=await source.readCreated(record!.reservationId!,intent,o);assertOperationLive(o);
   if(await source.identity(store.secret,o)!==record!.subject)throw new CliFailure('LOGIN_REQUIRED');assertOperationLive(o);
   observedProof=matchesCreation(record!,evidence);record=await confirmCreation(store,record!,evidence,now());
  }));
  return operationReceipt('booking create',record!);
 }catch(error){
  // Re-read a possibly durable receipt, including a write racing the deadline.
  if(record){try{record=await store.read(id,now());}catch{/* Preserve last trustworthy in-memory receipt; never infer success. */}}
  if(record&&observedReceipt)record={...record,reservationId:observedReceipt};
  if(record&&observedProof){const {intent,preview,confirmationDigest,...minimal}=record;record={...minimal,lifecycle:'resolved',outcome:'confirmed',reservationId:observedProof.reservationId,sourceStatusCode:observedProof.statusCode,approvalState:observedProof.approvalState};}
  const signalCode=error instanceof CliFailure&&['INTERRUPTED','TERMINATED','CLEANUP_FAILED','OPERATION_STATE_UNAVAILABLE'].includes(error.code);
  if(record?.outcome==='unknown'&&!signalCode)return operationFailure('booking create',new CliFailure('OPERATION_UNCERTAIN'),operationData(record));
  return operationFailure('booking create',error,record?operationData(record):null);
 }
}
