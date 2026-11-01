import {createHash} from 'node:crypto';
import type {QueryOptions} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';
import {createQueryPolicy} from '../../core/policy.js';
import type {Assessment} from '../../booking-operations/workflow.js';
import type {Preview} from '../../booking-operations/contract.js';
import type {LibraryReader} from './model.js';
import {scanRooms} from './index.js';
import {parseAvailability} from './parser.js';
import {evaluateLibraryRules} from './rules.js';
import {queryLibraryDetail} from './detail.js';
import {LibraryIdentityReadError} from './identity.js';
import type {CreateSource,CreationEvidence} from '../../booking-operations/create.js';
import type {LibraryBookingIntent} from '../../booking-operations/intent.js';
import {LIBRARY_ORIGIN} from './manifest.js';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const school=(s:string)=>new Date(Date.parse(s)+8*3600000).toISOString().slice(0,19)+'+08:00';
const emptyPreview=():Preview=>({rooms:[],startsAt:null,endsAt:null,durationMinutes:null,participantIds:[],participantCount:null,purpose:null,approvalState:'unknown',effects:[],feeState:'unknown'});
/** Current source evidence is deliberately insufficient for a ready preview. GETs only. */
export function createLibraryOperationSource(reader:LibraryReader,now:()=>number=Date.now):CreateSource{
 const identity=async(secret:Buffer,o:QueryOptions)=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');
  try{await createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,s=>reader.inspection!.assertIdentity(s),{readOnly:true,...o.signal?{signal:o.signal}:{}});}catch(e){throw e instanceof LibraryIdentityReadError?e.failure:e;}
  return reader.inspection.fingerprint(secret);
 };
 const readCreated=async(id:string,intent:LibraryBookingIntent,o:QueryOptions):Promise<CreationEvidence|undefined>=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');
  const from=intent.startsAt.slice(0,10),to=new Date(Date.parse(from+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const result=await queryLibraryDetail({id,range:{from,to,timezone:'Asia/Shanghai'},expectation:{participantIds:intent.participantIds,purpose:intent.purpose??null}},o,reader.inspection),r=result.data.record;
  if(!r)return;const bits=[256,512,1024].filter(b=>(r.statusCode&b)!==0);const approvalState=bits.length!==1?'unknown':bits[0]===256?'pending_review':bits[0]===512?'rejected':'approved';
  return{kind:'creation_readback',reservationId:r.id,isOwner:r.isOwner,intentMatches:r.intentMatches===true,roomIds:r.rooms.map(x=>x.id),startsAt:r.startsAt,endsAt:r.endsAt,statusCode:r.statusCode,approvalState};
 };
 return{identity,readCreated,submitCreate:async(intent,o)=>{if(!reader.submitCreate)throw new CliFailure('CAPABILITY_PENDING');return createQueryPolicy(o.deadlineMs).run(LIBRARY_ORIGIN,signal=>reader.submitCreate!(intent,{...o,signal}),{readOnly:false,...o.signal?{signal:o.signal}:{}});},createAssessment:async(intent,o)=>{
  const date=intent.startsAt.slice(0,10);const scanned=await scanRooms({date},o,reader);const room=scanned.collected.items.find(x=>x.id===intent.roomId);const raw=scanned.raw.get(intent.roomId);
  if(!room||!raw){if(scanned.collected.coverage==='partial')throw new CliFailure('ADAPTER_CHANGED');throw new CliFailure('INVALID_ARGUMENT');}
  const availability=parseAvailability(raw,room.id,date);
  const report=evaluateLibraryRules({startsAt:intent.startsAt,endsAt:intent.endsAt,now:now(),participantCount:intent.participantIds.length,...room.capacity!==null?{maxUser:room.capacity}:{},openIntervals:availability.openIntervals.map(x=>({start:school(x.start),end:school(x.end)})),busyIntervals:availability.busyIntervals.map(x=>({start:school(x.start),end:school(x.end)}))});
  const checks=[...report.checks,{id:'duplicate',state:'unknown' as const,reason:'A complete active-reservation duplicate check is not yet verified.'},{id:'effects',state:'unknown' as const,reason:'Approval, fees and all required participant conditions are not fully verified.'}];
  const preview:Preview={rooms:[{id:room.id,name:room.name,location:room.floorName}],startsAt:intent.startsAt,endsAt:intent.endsAt,durationMinutes:(Date.parse(intent.endsAt)-Date.parse(intent.startsAt))/60000,participantIds:intent.participantIds,participantCount:intent.participantIds.length,purpose:intent.purpose??null,approvalState:'unknown',effects:['The observed booking page requires check-in within 10 minutes after start; absence may affect booking credit.'],feeState:'unknown'};
  return{eligibility:report.eligibility,checks,preview,ruleVersion:hash({checks,availability,capacity:room.capacity})};
 },cancelAssessment:async(id,range,o)=>{
  if(!reader.inspection)throw new CliFailure('CAPABILITY_PENDING');const result=await queryLibraryDetail({id,range},o,reader.inspection);const r=result.data.record;
  const checks=[{id:'target',state:r?'pass' as const:'unknown' as const,reason:r?'Exact source ID observed.':'Absence in a date/status window does not prove cancellation.'},{id:'cancelPermission',state:r?.cancellationEligibility==='blocked'?'fail' as const:'unknown' as const,reason:r?.cancellationReason??'No authoritative target was found.'},{id:'cancelWindow',state:'unknown' as const,reason:'Maintenance and cancellation boundary evidence is incomplete.'}];
  const preview:Preview=r?{...emptyPreview(),rooms:r.rooms.map(x=>({...x,location:null})),startsAt:school(r.startsAt),endsAt:school(r.endsAt),durationMinutes:(Date.parse(r.endsAt)-Date.parse(r.startsAt))/60000,participantCount:r.memberCount,effects:['Cancellation releases this exact reservation; current credit consequences remain unverified.']}:emptyPreview();
  return{eligibility:checks.some(x=>x.state==='fail')?'blocked':'unknown',checks,preview,ruleVersion:hash({checks,preview,status:r?.statusCode??null}),reservationId:id,sourceStatusCode:r?.statusCode??null};
 },reconcile:async(record,o)=>{
  if(record.action==='create'&&record.receiptEvidence==='create_success'&&record.reservationId&&record.intent&&'roomId'in record.intent)return readCreated(record.reservationId,record.intent,o);
  // No cancellation or lost-response similar-record inference.
  if(!record.reservationId||!record.intent||!reader.inspection)return;
  const range='from'in record.intent?{from:record.intent.from,to:record.intent.to,timezone:'Asia/Shanghai' as const}:{from:record.intent.startsAt.slice(0,10),to:new Date(Date.parse(record.intent.startsAt.slice(0,10)+'T00:00:00Z')+86400000).toISOString().slice(0,10),timezone:'Asia/Shanghai' as const};
  await queryLibraryDetail({id:record.reservationId,range},o,reader.inspection);
 }};
}
