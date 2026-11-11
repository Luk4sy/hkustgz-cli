import test from 'node:test';import assert from 'node:assert/strict';
import {assessRestrictedCreate,assessRestrictedCancel} from '../src/adapters/booking-library/restricted-operation.js';
import {AssessmentSchema} from '../src/booking-operations/workflow.js';
const now=Date.parse('2026-11-02T00:00:00Z');
const intent={roomId:'2',startsAt:'2026-11-03T09:00:00+08:00',endsAt:'2026-11-03T10:00:00+08:00',participantIds:['12'],purpose:'Self study'};
const room={id:'2',name:'403',floorId:'1',floorName:'Lib_4th Floor',capacity:2,type:'研修间'};
const raw={devId:2,devName:'403',labId:1,labName:'Lib_4th Floor',minUser:1,maxUser:2,devProp:0,devStatus:0,openState:0,onlyView:false,maintenanceTime:null,addServices:null,deviceAttributes:null,pointProperty:null,usePersonType:null,resvRule:{ruleId:1,ruleName:'图书馆研修间预约规则',limit:260,minResvTime:15,maxResvTime:120,timeInterval:5,freezingTime:0,latestResvTime:0,earliestResvTime:20160,cancelTime:10,earlyInTime:10,seriesTimeLimit:1440,deadlineTime:1,rangeNum:2},openTimes:[{openStartTime:'08:00',openEndTime:'23:00',openLimit:1}],resvInfo:[]};
const context={selfOnly:true,enabled:true,punishmentCount:0,config:{resvTheme:'17',resvthememust:'7',resvthemefix:'17',resvCode:'0',resvThemeIgnoreNumLimit:'',cancelTimeReduceMinutes:'0'}};
test('evidenced self-only room produces an attempt-ready preview with explicit school decisions',()=>{
 const a=assessRestrictedCreate(raw,room,intent,context,now);assert.equal(a.eligibility,'ready');assert.equal(AssessmentSchema.safeParse(a).success,true);assert.equal(a.preview.feeState,'none');
 assert.ok(a.checks.some(c=>c.id==='schoolQuota'&&c.state==='unknown'&&c.adjudication==='server_enforced'));
 assert.doesNotMatch(JSON.stringify(a),/accNo|logonName|token/);
});
for(const [name,patch] of [['onlyView',{onlyView:true}],['maintenance',{maintenanceTime:'closed'}],['new rule',{resvRule:{...raw.resvRule,limit:264}}],['upload',{devProp:32}],['unknown resource flag',{devProp:1}],['split opening',{openTimes:[{...raw.openTimes[0],openEndTime:'09:30'},{...raw.openTimes[0],openStartTime:'09:30'}]}],['missing rule',{resvRule:undefined}],['new timing mode',{openTimes:[{...raw.openTimes[0],openLimit:2}]}]] as const)test(`restricted preview refuses ${name}`,()=>{
 assert.notEqual(assessRestrictedCreate({...raw,...patch},room,intent,context,now).eligibility,'ready');
});
test('missing account evidence, disabled actor, penalties, nonself and changed configuration cannot be delegated',()=>{
 for(const c of [undefined,{...context,enabled:false},{...context,selfOnly:false},{...context,punishmentCount:1},{...context,config:{...context.config,resvCode:'1'}}])assert.notEqual(assessRestrictedCreate(raw,room,intent,c,now).eligibility,'ready');
 for(const i of [{...intent,participantIds:['12','13']},{...intent,purpose:undefined},{...intent,startsAt:'2026-11-03T09:03:00+08:00'}])assert.notEqual(assessRestrictedCreate(raw,room,i,context,now).eligibility,'ready');
});
test('unknown local checks and invented server classifications cannot make an assessment ready',()=>{
 const a=assessRestrictedCreate(raw,room,intent,context,now);
 for(const check of [{id:'opening',state:'unknown',reason:'Unavailable'},{id:'opening',state:'unknown',reason:'Unavailable',adjudication:'server_enforced'},{id:'schoolQuota',state:'fail',reason:'Denied',adjudication:'server_enforced'}])assert.equal(AssessmentSchema.safeParse({...a,checks:[...a.checks,check]}).success,false);
});
test('cancellation requires exact owned approved unstarted single-room record and strict cutoff',()=>{
 const record={id:'7',rooms:[{id:'2',name:'403'}],startsAt:intent.startsAt,endsAt:intent.endsAt,statusCode:1027,memberCount:1,isOwner:true};
 assert.equal(assessRestrictedCancel(record,true,context,now,true).eligibility,'ready');
 for(const r of [{...record,isOwner:false},{...record,statusCode:1155},{...record,memberCount:2}])assert.notEqual(assessRestrictedCancel(r,true,context,now,true).eligibility,'ready');
 for(const time of [Date.parse(intent.startsAt)-600000,Date.parse(intent.startsAt)])assert.notEqual(assessRestrictedCancel(record,true,context,time,true).eligibility,'ready');
 assert.notEqual(assessRestrictedCancel(record,false,context,now,true).eligibility,'ready');
});
test('profile alterations and extra rule fields cannot silently inherit the normal-flow decision',()=>{
 for(const resvRule of [{...raw.resvRule,agreeWaitTime:5},{...raw.resvRule,newPaymentRule:1},{...raw.resvRule,devType:3}])assert.notEqual(assessRestrictedCreate({...raw,resvRule},room,intent,context,now).eligibility,'ready');
});
