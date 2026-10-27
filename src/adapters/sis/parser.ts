import {z} from 'zod';import {CliFailure} from '../../core/errors.js';import type {Collected,PageBatch} from '../../core/contracts.js';import type {SourceTerm,TimetableCourse,Meeting} from './model.js';
const fail=():never=>{throw new CliFailure('ADAPTER_CHANGED');};
const text=z.string();const optionalText=text.nullable().optional();
const termSchema=z.object({termId:text.min(1),termName:optionalText,description:optionalText,termStartDate:optionalText,termEndDate:optionalText});
const pageSchema=z.object({code:z.literal('0'),data:z.array(termSchema),totalSize:z.number().int().nonnegative(),totalPage:z.number().int().nonnegative(),pageIndex:z.number().int().positive(),nextPage:z.boolean()});
export function parseCurrentTerm(value:unknown):string|null{
 const result=z.object({code:z.literal('0'),data:z.object({termId:text.nullable().optional()}).nullable()}).safeParse(value);if(!result.success)return fail();return result.data.data?.termId?.trim()||null;
}
export function parseTermPage(value:unknown,index:number,currentId:string|null,size=50):PageBatch<SourceTerm>{
 const result=pageSchema.safeParse(value);if(!result.success)return fail();const body=result.data;
 const pages=Math.max(1,Math.ceil(body.totalSize/size));const expected=Math.min(size,Math.max(0,body.totalSize-(index-1)*size));
 if((body.pageIndex!==index&&body.pageIndex!==1)||(body.totalPage!==pages&&!(body.totalSize===0&&body.totalPage===0))||body.nextPage!==(index<pages)||body.data.length!==expected)return fail();
 const items=body.data.map(t=>({id:t.termId,name:t.termName?.trim()||t.description?.trim()||'',isCurrent:currentId===null?null:t.termId===currentId,startDate:t.termStartDate||null,endDate:t.termEndDate||null}));
 if(items.some(t=>!t.name)||new Set(items.map(t=>t.id)).size!==items.length)return fail();
 return{items,next:body.nextPage?String(index+1):null,exhausted:!body.nextPage,emptyConfirmed:true};
}
export function validDate(value:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!value.startsWith('0000')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
const date=(value:string|null|undefined):string|null=>{if(!value)return null;if(!validDate(value))return fail();return value;};
const time=(value:string|null|undefined):string|null=>{if(!value)return null;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return fail();return value;};
const rawMeeting=z.object({classSectionId:optionalText,classId:optionalText,startDate:optionalText,endDate:optionalText,weekDay:optionalText,meetingStartTime:optionalText,meetingEndTime:optionalText,facilityName:optionalText,instructorList:z.array(z.object({instructorName:text})).optional()});
const course=z.object({classId:text.min(1),classSection:text.min(1),crseId:text.min(1),crseCode:text.min(1),crseName:optionalText,enrollmentStatus:optionalText,meetingInfoList:z.array(rawMeeting),classSectionId:optionalText,weekDay:optionalText,meetingStartTime:optionalText,meetingEndTime:optionalText,facilityName:optionalText});
const batchSchema=z.object({request:z.object({startDate:text,endDate:text,includeWaitlistedClass:z.literal('N'),own:z.boolean(),selectedTermLabel:text,finishedTermLabel:text}),body:z.object({code:z.literal('0'),data:z.array(course),totalSize:z.number().int().nonnegative().nullable(),totalPage:z.number().int().nonnegative().nullable(),nextPage:z.boolean(),pageIndex:z.number().int().nonnegative()})});
export function parseTimetable(value:unknown,term:SourceTerm):Collected<TimetableCourse>{
 const result=batchSchema.safeParse(value);if(!result.success)return fail();const {request,body}=result.data;
 if(!request.own)throw new CliFailure('PERMISSION_DENIED');
 if(!term.startDate||!term.endDate||!validDate(term.startDate)||!validDate(term.endDate)||term.startDate>term.endDate||request.startDate!==term.startDate||request.endDate!==term.endDate)return fail();
 if(request.selectedTermLabel!==term.name||request.finishedTermLabel!==term.name)return fail();
 const more=body.nextPage||(body.totalPage??0)>1||(body.totalSize??0)>body.data.length;
 if(!body.data.length&&more)return fail();
 const seen=new Set<string>();
 const items=body.data.slice(0,2000).map(c=>{
  if(seen.has(c.classId)||c.enrollmentStatus==='waiting')return fail();seen.add(c.classId);
  const meetings:Meeting[]=[];const identities=new Set<string>();
  const source=c.meetingInfoList.length?c.meetingInfoList:[{classSectionId:'unscheduled',classId:c.classId,weekDay:c.weekDay??null,meetingStartTime:c.meetingStartTime??null,meetingEndTime:c.meetingEndTime??null,facilityName:c.facilityName??null}];
  for(const [index,m]of source.entries()){
   if(m.classId&&m.classId!==c.classId)return fail();
   const from=date(m.startDate),to=date(m.endDate),start=time(m.meetingStartTime),end=time(m.meetingEndTime);
   if(from&&to&&from>to||start&&end&&start>=end)return fail();
   const days=m.weekDay?m.weekDay.split(',').map(x=>{if(!/^[0-7]$/.test(x.trim()))return fail();return Number(x.trim())||7;}):[null];
   if(new Set(days).size!==days.length)return fail();
   for(const weekday of days){const id=c.classId+':'+(m.classSectionId||String(index))+':'+(weekday??'unknown');if(identities.has(id))return fail();identities.add(id);
    meetings.push({id,dateFrom:from,dateTo:to,weekday,startTime:start,endTime:end,location:m.facilityName||null,instructors:m.instructorList?.map(i=>i.instructorName)??[],exceptionsCoverage:'unknown',exceptions:[]});}
  }
  return{termId:term.id,courseId:c.crseId,courseCode:c.crseCode,courseName:c.crseName||null,sectionId:c.classId,sectionLabel:c.classSection,credits:null,enrollmentStatus:c.enrollmentStatus??null,meetings};
 });
 const capped=body.data.length>2000;return{items,pagesRead:1,recordsRead:body.data.length,coverage:more||capped?'partial':'complete',truncationReason:capped?'record_cap':more?'upstream':null};
}
