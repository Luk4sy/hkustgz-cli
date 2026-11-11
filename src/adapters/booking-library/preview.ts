import {assessRestrictedCreate,assessRestrictedCancel,isRestrictedRoom} from './restricted-operation.js';
import {createHash} from 'node:crypto';
import type {QueryOptions} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';
import {createQueryPolicy} from '../../core/policy.js';
import type {Assessment} from '../../booking-operations/workflow.js';
import type {Preview} from '../../booking-operations/contract.js';
import type {LibraryReader} from './model.js';
import {scanRooms} from './index.js';
import {queryLibraryDetail} from './detail.js';
import {LibraryIdentityReadError} from './identity.js';
import type {CreateSource,CreationEvidence} from '../../booking-operations/create.js';
import type {CancelSource} from '../../booking-operations/cancel.js';
import {cancellationTarget} from '../../booking-operations/cancel.js';
import type {LibraryBookingIntent} from '../../booking-operations/intent.js';
import {LIBRARY_ORIGIN} from './manifest.js';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const school=(s:string)=>new Date(Date.parse(s)+8*3600000).toISOString().slice(0,19)+'+08:00';
const emptyPreview=():Preview=>({rooms:[],startsAt:null,endsAt:null,durationMinutes:null,participantIds:[],participantCount:null,purpose:null,approvalState:'unknown',effects:[],feeState:'unknown'});
/** Restricted normal-flow assessments are GET-only; submission remains separately confirmed. */
export function createLibraryOperationSource(reader:LibraryReader,now:()=>number=Date.now):CreateSource&CancelSource{
 let subjectSecret:Buffer|undefined;
 const identity=async(secret:Buffer,o:QueryOptions)=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');
  try{await createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,s=>reader.inspection!.assertIdentity(s),{readOnly:true,...o.signal?{signal:o.signal}:{}});}catch(e){throw e instanceof LibraryIdentityReadError?e.failure:e;}
  const subject=reader.inspection.fingerprint(secret);subjectSecret=Buffer.from(secret);return subject;
 };
 const readCreated=async(id:string,intent:LibraryBookingIntent,o:QueryOptions):Promise<CreationEvidence|undefined>=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');
  const from=intent.startsAt.slice(0,10),to=new Date(Date.parse(from+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const result=await queryLibraryDetail({id,range:{from,to,timezone:'Asia/Shanghai'},expectation:{participantIds:intent.participantIds,purpose:intent.purpose??null}},o,reader.inspection),r=result.data.record;
  if(!r)return;const bits=[256,512,1024].filter(b=>(r.statusCode&b)!==0);const approvalState=bits.length!==1?'unknown':bits[0]===256?'pending_review':bits[0]===512?'rejected':'approved';
  return{kind:'creation_readback',reservationId:r.id,isOwner:r.isOwner,intentMatches:r.intentMatches===true,roomIds:r.rooms.map(x=>x.id),startsAt:r.startsAt,endsAt:r.endsAt,statusCode:r.statusCode,approvalState};
 };
 return{identity,resolveSelf(){if(!reader.inspection?.resolveSelf)throw new CliFailure('LOGIN_REQUIRED');return reader.inspection.resolveSelf();},readCreated,readCancelled:async(id,range,o)=>{if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');await queryLibraryDetail({id,range},o,reader.inspection);return undefined;},submitCancel:async(target,o)=>{if(!reader.inspection?.submitCancel)throw new CliFailure('CAPABILITY_PENDING');return createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,signal=>{if(o.dispatchDeadlineMs!==undefined&&Date.now()>=o.dispatchDeadlineMs)throw new CliFailure('PREVIEW_EXPIRED');return reader.inspection!.submitCancel!(target,{...o,signal});},{readOnly:false,...o.signal?{signal:o.signal}:{}});},submitCreate:async(intent,o)=>{if(!reader.submitCreate)throw new CliFailure('CAPABILITY_PENDING');return createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,signal=>{if(o.dispatchDeadlineMs!==undefined&&Date.now()>=o.dispatchDeadlineMs)throw new CliFailure('PREVIEW_EXPIRED');return reader.submitCreate!(intent,{...o,signal});},{readOnly:false,...o.signal?{signal:o.signal}:{}});},createAssessment:async(intent,o)=>{
  const date=intent.startsAt.slice(0,10);const scanned=await scanRooms({date},o,reader);const room=scanned.collected.items.find(x=>x.id===intent.roomId);const raw=scanned.raw.get(intent.roomId);
  if(!room||!raw){if(scanned.collected.coverage==='partial')throw new CliFailure('ADAPTER_CHANGED');throw new CliFailure('INVALID_ARGUMENT');}
  const context=reader.inspection?.operationContext?await createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,s=>reader.inspection!.operationContext!(intent.participantIds,s),{readOnly:true,...o.signal?{signal:o.signal}:{}}):undefined;
  return assessRestrictedCreate(raw,room,intent,context,now());
 },cancelAssessment:async(id,range,o)=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');const result=await queryLibraryDetail({id,range},o,reader.inspection);const r=result.data.record;
  const context=reader.inspection.operationContext?await createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,s=>reader.inspection!.operationContext!([],s),{readOnly:true,...o.signal?{signal:o.signal}:{}}):undefined;
  const preview:Preview=r?{...emptyPreview(),rooms:r.rooms.map(x=>({...x,location:null})),startsAt:school(r.startsAt),endsAt:school(r.endsAt),durationMinutes:(Date.parse(r.endsAt)-Date.parse(r.startsAt))/60000,participantCount:r.memberCount}:emptyPreview();
  const target=cancellationTarget(id,preview),binding=target&&subjectSecret?reader.inspection.cancellationBinding?.(target,subjectSecret):undefined;
  let resourceSupported=false;
  if(r&&r.rooms.length===1){const scanned=await scanRooms({date:school(r.startsAt).slice(0,10)},o,reader);const room=scanned.collected.items.find(x=>x.id===r.rooms[0]!.id);resourceSupported=!!room&&isRestrictedRoom(scanned.raw.get(room.id),room);}
  const assessment=assessRestrictedCancel(r?{...r,startsAt:school(r.startsAt),endsAt:school(r.endsAt)}:null,!!binding,context,now(),resourceSupported);
  return{...assessment,reservationId:id,ruleVersion:hash({assessment:assessment.ruleVersion,binding:binding??null})};
 },reconcile:async(record,o)=>{
  if(record.action==='create'&&record.receiptEvidence==='create_success'&&record.reservationId&&record.intent&&'roomId'in record.intent)return readCreated(record.reservationId,record.intent,o);
  if(record.action==='cancel'&&record.reservationId&&record.intent&&'from'in record.intent){if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');await queryLibraryDetail({id:record.reservationId,range:{from:record.intent.from,to:record.intent.to,timezone:'Asia/Shanghai'}},o,reader.inspection);return undefined;}
  // No cancellation inference from absence/128, or lost-response similar-record inference.
  if(!record.reservationId||!record.intent||!reader.inspection)return;
  const range='from'in record.intent?{from:record.intent.from,to:record.intent.to,timezone:'Asia/Shanghai' as const}:{from:record.intent.startsAt.slice(0,10),to:new Date(Date.parse(record.intent.startsAt.slice(0,10)+'T00:00:00Z')+86400000).toISOString().slice(0,10),timezone:'Asia/Shanghai' as const};
  await queryLibraryDetail({id:record.reservationId,range},o,reader.inspection);
 }};
}
