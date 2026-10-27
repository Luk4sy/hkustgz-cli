import assert from 'node:assert/strict';import test from 'node:test';
import {parseTimetable,parseTermPage,parseCurrentTerm} from '../src/adapters/sis/parser.js';
import {querySisTerms,querySisTimetable,querySisToday} from '../src/adapters/sis/index.js';
import {batch,row,term,termPage,reader} from './fixtures/sis/data.js';
const options=()=>({refresh:false,deadlineMs:Date.now()+90000});
test('multiple_meetings_remain_distinct and source fields stay unknown when absent',()=>{
 const result=parseTimetable(batch,term);const course=result.items[0]!;assert.equal(course.credits,null);assert.equal(course.meetings.length,3);assert.deepEqual(course.meetings.map(m=>m.location),['Room A','Room A','Room B']);assert.equal(new Set(course.meetings.map(m=>m.id)).size,3);
});
test('today_uses_school_timezone and unknown_exceptions_warn',async()=>{
 const result=await querySisToday({},options(),reader,Date.parse('2026-10-26T16:30:00Z'));
 assert.equal(result.data.date,'2026-10-27');assert.equal(result.data.items[0]?.meetings[0]?.weekday,2);assert.equal(result.data.items[0]?.meetings.length,1);assert.ok(result.meta.warnings.some(w=>w.code==='EXCEPTIONS_UNKNOWN'));
});
test('term directory validates page counts and authoritative current id',()=>{
 const page=parseTermPage(termPage,1,'2610');assert.equal(page.items[0]?.isCurrent,true);assert.equal(parseTermPage(termPage,1,null).items[0]?.isCurrent,null);assert.throws(()=>parseTermPage({...termPage,totalSize:2},1,'2610'));assert.throws(()=>parseTermPage({...termPage,pageIndex:2},1,'2610'));
});
test('current term is not guessed from host month or a selected UI value',async()=>{
 const unknown={...reader,current:async()=>({code:'0',data:null})};await assert.rejects(querySisTimetable({},options(),unknown),{code:'INVALID_ARGUMENT'});const explicit=await querySisTimetable({termId:'2610'},options(),unknown);assert.equal(explicit.data.termId,'2610');
});
test('wrong term, wrong meeting ownership and another account cannot be relabeled',()=>{
 assert.throws(()=>parseTimetable({...batch,request:{...batch.request,own:false}},term),{code:'PERMISSION_DENIED'});
 const other=structuredClone(batch);other.body.data[0]!.classId='2620-1000-L01';assert.throws(()=>parseTimetable(other,term));
 const meeting=structuredClone(batch);meeting.body.data[0]!.meetingInfoList[0]!.classId='foreign';assert.throws(()=>parseTimetable(meeting,term));
 assert.throws(()=>parseTimetable({...batch,request:{...batch.request,endDate:'2026-10-01'}},term));
});
test('successful confirmed empty differs from failed or unconfirmed empty',()=>{
 assert.equal(parseTimetable({...batch,body:{...batch.body,data:[]}},term).items.length,0);
 assert.throws(()=>parseTimetable({...batch,body:{...batch.body,code:'error',data:[]}},term));
 assert.throws(()=>parseTimetable({...batch,body:{...batch.body,totalSize:2,data:[]}},term));
});
test('known missing source data stays unresolved rather than becoming no classes today',async()=>{
 const unscheduled={...row,meetingInfoList:[]};const source={...reader,timetable:async()=>({...batch,body:{...batch.body,data:[unscheduled]}})};
 const result=await querySisToday({date:'2026-10-27'},options(),source);assert.equal(result.data.items.length,0);assert.equal(result.data.unresolved.length,1);assert.ok(result.meta.warnings.some(w=>w.code==='UNRESOLVED_SCHEDULE'));
});
test('all source term pages are read and a late page failure preserves a truthful subset',async()=>{
 const first={...termPage,totalSize:51,totalPage:2,nextPage:true,data:Array.from({length:50},(_,i)=>({...termPage.data[0]!,termId:String(i)}))};
 const result=await querySisTerms(options(),{...reader,terms:async(page:number)=>{if(page===1)return first;throw Error('late failure');}});assert.equal(result.ok,false);assert.equal(result.data.items.length,50);assert.equal(result.meta.coverage,'partial');
});
test('legacy pageIndex=1 does not hide verified later pages or repeated page content',async()=>{
 const first={...termPage,totalSize:51,totalPage:2,nextPage:true,data:Array.from({length:50},(_,i)=>({...termPage.data[0]!,termId:String(i)}))};
 const last={...termPage,totalSize:51,totalPage:2,nextPage:false,data:[{...termPage.data[0]!,termId:'last'}]};
 const result=await querySisTerms(options(),{...reader,terms:async(page:number)=>page===1?first:last});assert.equal(result.ok,true);assert.equal(result.data.items.length,51);assert.equal(result.meta.pagesRead,2);
});
test('unresolved meetings are counted and an out-of-term date does not borrow another term',async()=>{
 const raw=structuredClone(batch);raw.body.data[0]!.meetingInfoList=[];
 const source={...reader,timetable:async()=>raw};const result=await querySisToday({date:'2026-10-27'},options(),source);assert.equal(result.meta.returnedCount,1);
 const long=structuredClone(batch);for(const m of long.body.data[0]!.meetingInfoList)m.endDate='2027-05-28';
 const outside=await querySisToday({date:'2027-01-04'},options(),{...reader,timetable:async()=>long});assert.equal(outside.data.items.length,0);assert.ok(outside.meta.warnings.some(w=>w.code==='OUTSIDE_TERM'));
});
test('unset current id requires explicit term; confirmed empty term pages remain empty',()=>{
 assert.equal(parseCurrentTerm({code:'0',data:{termId:''}}),null);assert.equal(parseTermPage({...termPage,data:[],totalSize:0,totalPage:0},1,null).items.length,0);
});
test('source calendar labels must be present and agree with the verified term',()=>{
 const missing=structuredClone(batch) as any;delete missing.request.selectedTermLabel;delete missing.request.finishedTermLabel;assert.throws(()=>parseTimetable(missing,term));
});
test('source pagination and record caps preserve a partial timetable',async()=>{
 const partial=await querySisTimetable({},options(),{...reader,timetable:async()=>({...batch,body:{...batch.body,nextPage:true,totalPage:2,totalSize:2}})});assert.equal(partial.ok,false);assert.equal(partial.data.items.length,1);assert.equal(partial.meta.truncationReason,'upstream');
 const huge={...batch,body:{...batch.body,data:Array.from({length:2001},(_,i)=>({...row,classId:'class-'+i,meetingInfoList:[]}))}};const result=parseTimetable(huge,term);assert.equal(result.items.length,2000);assert.equal(result.recordsRead,2001);assert.equal(result.truncationReason,'record_cap');
});
