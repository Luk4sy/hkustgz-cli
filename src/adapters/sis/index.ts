import type {CommandHandler,Collected,QueryOptions,QueryResult,QueryMeta} from '../../core/contracts.js';import {CliFailure} from '../../core/errors.js';import {collectPages,buildQueryResult} from '../../core/query.js';import {createQueryPolicy,resolveDateRange,type QueryPolicy} from '../../core/policy.js';
import {parseCurrentTerm,parseTermPage,parseTimetable,validDate} from './parser.js';import {SIS_URL,SIS_ORIGIN,EXCEPTION_WARNING} from './manifest.js';import type {SisReader,SourceTerm,Term,Timetable,TimetableCourse,TodayCourses} from './model.js';
const meta=(command:string,warnings:QueryMeta['warnings']=[])=>({schemaVersion:'1' as const,command,service:'sis' as const,sourceUrl:SIS_URL,fetchedAt:new Date().toISOString(),timezone:'Asia/Shanghai' as const,readMethod:'response' as const,cache:{hit:false,storedAt:null},warnings});
async function terms(options:QueryOptions,reader:SisReader,policy:QueryPolicy){
 const current=parseCurrentTerm(await policy.run(SIS_ORIGIN,signal=>reader.current(signal),{readOnly:true,...options.signal?{signal:options.signal}:{}}));
 const ids=new Set<string>();let total:number|undefined;
 const collected=await collectPages<SourceTerm>({origin:SIS_ORIGIN,readOnly:true,readPage:async(cursor,signal)=>{
  const page=cursor===null?1:Number(cursor);const value=await reader.terms(page,signal);const parsed=parseTermPage(value,page,current);
  const count=(value as {totalSize:number}).totalSize;if(total!==undefined&&total!==count)throw new CliFailure('ADAPTER_CHANGED');total=count;
  for(const t of parsed.items){if(ids.has(t.id))throw new CliFailure('ADAPTER_CHANGED');ids.add(t.id);}return parsed;
 }},options,policy);
 return{current,collected};
}
export async function querySisTerms(options:QueryOptions,reader:SisReader):Promise<QueryResult<{items:Term[]}>>{
 const result=await terms(options,reader,createQueryPolicy(options.deadlineMs));return buildQueryResult({...result.collected,items:result.collected.items.map(({id,name,isCurrent})=>({id,name,isCurrent}))},meta('sis terms',result.current===null?[{code:'CURRENT_TERM_UNKNOWN',message:'The source did not identify the current term; timetable queries require --term.'}]:[]));
}
async function timetable(input:{termId?:string},options:QueryOptions,reader:SisReader){
 const policy=createQueryPolicy(options.deadlineMs);const lookup=await terms(options,reader,policy);const id=input.termId??lookup.current;
 if(!id)throw new CliFailure('INVALID_ARGUMENT','The source did not identify a current term. Choose an id from sis terms with --term.');
 const term=lookup.collected.items.find(t=>t.id===id);if(!term)throw new CliFailure(lookup.collected.coverage==='partial'?'ADAPTER_CHANGED':'INVALID_ARGUMENT','The requested term could not be verified in the source term list.');
 if(!term.startDate||!term.endDate||!validDate(term.startDate)||!validDate(term.endDate)||term.startDate>term.endDate)throw new CliFailure('ADAPTER_CHANGED','The selected source term does not provide a valid calendar period.');
 const source=await policy.run(SIS_ORIGIN,signal=>reader.timetable(term,signal),{readOnly:false,...options.signal?{signal:options.signal}:{}});const collected=parseTimetable(source,term);
 const warnings=[EXCEPTION_WARNING,{code:'CREDITS_UNKNOWN',message:'The SIS calendar response does not provide credits; credits remain null.'},...(lookup.collected.coverage==='partial'?[{code:'TERM_LOOKUP_PARTIAL',message:'The selected term was verified, but the complete term directory could not be read.'}]:[])];
 return{term,collected,warnings};
}
export async function querySisTimetable(input:{termId?:string},options:QueryOptions,reader:SisReader):Promise<QueryResult<Timetable>>{
 const {term,collected,warnings}=await timetable(input,options,reader);const result=buildQueryResult(collected,meta('sis timetable',warnings));return{...result,data:{termId:term.id,termName:term.name,items:result.data.items}};
}
export async function querySisToday(input:{date?:string;termId?:string},options:QueryOptions,reader:SisReader,nowMs=Date.now()):Promise<QueryResult<TodayCourses>>{
 const day=resolveDateRange(input.date?{from:input.date}:{},nowMs).from;const weekday=new Date(day+'T00:00:00Z').getUTCDay()||7;
 const {term,collected,warnings}=await timetable(input,options,reader);const items:TimetableCourse[]=[],unresolved:TimetableCourse[]=[];
 const outsideTerm=Boolean(term.startDate&&day<term.startDate||term.endDate&&day>term.endDate);
 for(const course of outsideTerm?[]:collected.items){const known=course.meetings.filter(m=>(!m.dateFrom||day>=m.dateFrom)&&(!m.dateTo||day<=m.dateTo));
  const exact=known.filter(m=>m.weekday===weekday&&m.dateFrom!==null&&m.dateTo!==null);const unknown=known.filter(m=>(m.weekday===null||m.weekday===weekday)&&(m.weekday===null||m.dateFrom===null||m.dateTo===null));
  if(exact.length)items.push({...course,meetings:exact});if(unknown.length)unresolved.push({...course,meetings:unknown});
 }
 if(unresolved.length)warnings.push({code:'UNRESOLVED_SCHEDULE',message:'Some source meetings lack a date range or weekday and cannot be assigned to this date.'});
 if(outsideTerm)warnings.push({code:'OUTSIDE_TERM',message:'The requested date is outside the selected source term; --date does not automatically change terms.'});
 const result=buildQueryResult({...collected,items},meta('sis today',warnings));result.meta.returnedCount=new Set([...items,...unresolved].map(c=>c.sectionId)).size;return{...result,data:{termId:term.id,termName:term.name,date:day,items:result.data.items,unresolved}};
}
export async function listTerms(options:QueryOptions){const {withSisReader}=await import('./reader.js');return withSisReader(options,(reader,opts)=>querySisTerms(opts,reader));}
export async function readTimetable(input:{termId?:string},options:QueryOptions){const {withSisReader}=await import('./reader.js');return withSisReader(options,(reader,opts)=>querySisTimetable(input,opts,reader));}
export async function readToday(input:{date?:string;termId?:string},options:QueryOptions){const {withSisReader}=await import('./reader.js');return withSisReader(options,(reader,opts)=>querySisToday(input,opts,reader));}
export function createSisHandlers(factory?:()=>Promise<SisReader>):Record<string,CommandHandler>{
 return Object.fromEntries(['terms','timetable','today'].map(action=>['sis.'+action,async(args,deps)=>{
  const options:QueryOptions={refresh:false,deadlineMs:Number(args.deadlineMs)};const input={...typeof args.term==='string'?{termId:args.term}:{},...typeof args.date==='string'?{date:args.date}:{}};
  const run=(reader:SisReader,opts:QueryOptions):Promise<QueryResult<unknown>>=>action==='terms'?querySisTerms(opts,reader):action==='today'?querySisToday(input,opts,reader,deps.now()):querySisTimetable(input,opts,reader);
  if(factory)return run(await factory(),options);const {withSisReader}=await import('./reader.js');return withSisReader(options,run,deps,args.headed===true);
 }]));
}
