import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {executeCommand} from '../src/cli/main.js';
import {createOperationHandlers} from '../src/booking-operations/handlers.js';
import {DEFAULT_CAPABILITIES} from '../src/core/capabilities.js';
import {queryMeta} from './fixtures.js';
import {withOperationStore} from '../src/booking-operations/store.js';

for(const format of ['json','table'])test(`library lifecycle ${format} separates query, create confirmation and exact cancellation across CLI calls`,async()=>{
 const home=await mkdtemp(join(tmpdir(),'hkustgz-lifecycle-'));
 const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10),to=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const intent={roomId:'2',startsAt:date+'T09:00:00+08:00',endsAt:date+'T10:00:00+08:00',participantIds:['12'],purpose:'Study'};
 const preview={rooms:[{id:'2',name:'Synthetic403',location:'Floor4'}],startsAt:intent.startsAt,endsAt:intent.endsAt,durationMinutes:60,participantIds:['12'],participantCount:1,purpose:'Study',approvalState:'not_required',effects:['Check in after start.'],feeState:'none'};
 const checks=[{id:'verified',state:'pass',reason:'Synthetic complete evidence only'}];let created=0,cancelled=0,active=false,queried=0;
 const source={identity:async()=> 'a'.repeat(64),createAssessment:async()=>({eligibility:'ready',ruleVersion:'b'.repeat(64),checks,preview,...active?{reservationId:'7'}:{}}),submitCreate:async()=>{created++;active=true;return{kind:'accepted',reservationId:'7'};},readCreated:async()=>({kind:'creation_readback',reservationId:'7',isOwner:true,intentMatches:true,roomIds:['2'],startsAt:intent.startsAt,endsAt:intent.endsAt,statusCode:259,approvalState:'pending_review'}),readCancelled:async()=>undefined,cancelAssessment:async(id:string)=>({eligibility:'ready',ruleVersion:'c'.repeat(64),checks,preview:{...preview,participantIds:[],purpose:null,approvalState:'pending_review',effects:['Releases exact reservation7.']},reservationId:id,sourceStatusCode:259,validUntil:Date.parse(date+'T08:50:00+08:00')}),submitCancel:async(target:any)=>{assert.equal(target.reservationId,'7');assert.equal(target.memberCount,1);cancelled++;active=false;return{kind:'cancel_ack',authority:'m0_delete_success',reservationId:'7'};},reconcile:async()=>undefined};
 const capabilities=DEFAULT_CAPABILITIES.map(c=>['booking.library.preview','booking.library.create','booking.library.cancel-preview','booking.library.cancel'].includes(c.id)?{...c,state:'verified' as const,reason:null,evidenceId:'SYNTHETIC_LIFECYCLE_ONLY'}:c);
 const handlers={...createOperationHandlers({session:async(_k:any,_o:any,run:any)=>run(source as any)}),'booking.library.rooms':async()=>{queried++;return{ok:true as const,data:{items:[{id:'2',name:'Synthetic403'}]},meta:{...queryMeta(),command:'booking rooms',service:'booking-library' as const}};}};
 const deps={handlers,capabilities,env:{HKUSTGZ_CLI_HOME:home},readInput:async()=>JSON.stringify(intent)};
 const call=async(argv:string[],expected=0)=>{const r=await executeCommand(argv,deps);assert.equal(r.exitCode,expected,r.stdout);return r;};
 try{
  const rooms=JSON.parse((await call(['booking','rooms','--provider','library'])).stdout);assert.equal(rooms.data.items[0].id,intent.roomId);assert.equal(queried,1);
  const p=JSON.parse((await call(['booking','preview','--provider','library','--input','-'])).stdout).data;assert.equal(created,0);assert.equal(cancelled,0);
  const make=['booking','create','--provider','library','--operation',p.operationId,'--confirm',p.confirmationDigest];const c=await call([...make,'--format',format]);assert.match(c.stdout,/confirmed/);assert.match(c.stdout,/pending_review/);assert.equal(created,1);
  await call(make);assert.equal(created,1);
  await call(['booking','cancel','--provider','library','--operation',p.operationId,'--confirm',p.confirmationDigest],2);assert.equal(cancelled,0);
  const cp=JSON.parse((await call(['booking','cancel-preview','--provider','library','--id','7','--from',date,'--to',to])).stdout).data;assert.equal(cp.reservationId,'7');assert.notEqual(cp.operationId,p.operationId);assert.equal(cancelled,0);
  const stop=['booking','cancel','--provider','library','--operation',cp.operationId,'--confirm',cp.confirmationDigest];const done=await call([...stop,'--format',format]);assert.match(done.stdout,/confirmed/);assert.equal(cancelled,1);
  const replay=await call([...stop,'--format',format]);assert.match(replay.stdout,/already_cancelled/);await call(['booking','operation',cp.operationId,'--refresh']);assert.equal(created,1);assert.equal(cancelled,1);
  const fresh=JSON.parse((await call(['booking','preview','--provider','library','--input','-'])).stdout).data;assert.notEqual(fresh.operationId,p.operationId);assert.equal(created,1);
  await withOperationStore(home,async s=>{const old=await s.read(p.operationId,Date.now());assert.equal(old.reservationInactive,true);assert.equal(old.intent,undefined);const cancelled=await s.read(cp.operationId,Date.now());assert.equal(cancelled.receiptEvidence,'cancel_success');assert.equal(cancelled.intent,undefined);});
 }finally{await rm(home,{recursive:true,force:true});}
});
