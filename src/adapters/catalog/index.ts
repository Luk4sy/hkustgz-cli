import type {CommandHandler,QueryOptions,QueryResult} from '../../core/contracts.js';
import {CliFailure} from '../../core/errors.js';import {collectPages,buildQueryResult} from '../../core/query.js';
import {parseCatalogPage} from './parser.js';import {CATALOG_URL,CATALOG_WARNING} from './manifest.js';
import type {CatalogCourse,CatalogReader} from './model.js';
function courseIdentity(id:string,requestedTerm?:string):{termId:string;code:string;subject:string}{
 const match=id.match(/^([^:]+):([A-Z]+\d+[A-Z]*)$/);
 if(!match||requestedTerm!==undefined&&requestedTerm!==match[1])throw new CliFailure('INVALID_ARGUMENT','Use a course id returned by catalog search, with its matching term.');
 return{termId:match[1]!,code:match[2]!,subject:match[2]!.match(/^[A-Z]+/)![0]};
}
export async function queryCatalog(input:{text:string;termId?:string},options:QueryOptions,reader:CatalogReader):Promise<QueryResult<{items:CatalogCourse[]}>>{
 const text=input.text.trim().toLowerCase();if(!text||options.limit!==undefined&&(!Number.isInteger(options.limit)||options.limit<1||options.limit>2000))throw new CliFailure('INVALID_ARGUMENT');
 if(!reader.subjects.length||new Set(reader.subjects).size!==reader.subjects.length)throw new CliFailure('ADAPTER_CHANGED');
 const {limit:requestedLimit,...scanOptions}=options;
 let observedTerm=input.termId;
 const collected=await collectPages<CatalogCourse>({origin:CATALOG_URL,readOnly:false,readPage:async(cursor,signal)=>{
  const index=cursor===null?0:Number(cursor);const subject=reader.subjects[index];if(!subject)throw new CliFailure('ADAPTER_CHANGED');
  const snapshot=await reader.read(subject,signal);if(snapshot.subject!==subject||(input.termId!==undefined&&snapshot.termId!==input.termId))throw new CliFailure('ADAPTER_CHANGED');
  if(observedTerm!==undefined&&snapshot.termId!==observedTerm)throw new CliFailure('ADAPTER_CHANGED');observedTerm=snapshot.termId;
  const items=parseCatalogPage(snapshot);
  const next=index+1<reader.subjects.length?String(index+1):null;return{items,next,exhausted:next===null,emptyConfirmed:true};
 }},scanOptions);
 const matches=collected.items.filter(c=>[c.code,c.title,...c.sections.flatMap(s=>s.meetings.flatMap(m=>[...m.instructors,...m.assistants]))].some(x=>x.toLowerCase().includes(text)));
 const limited=matches.length>(requestedLimit??2000);
 const filtered={...collected,items:matches.slice(0,requestedLimit??2000),...(limited?{coverage:'partial' as const,truncationReason:'limit' as const}:{})};
 return buildQueryResult(filtered,{schemaVersion:'1',command:'catalog search',service:'catalog',sourceUrl:CATALOG_URL,fetchedAt:new Date().toISOString(),timezone:'Asia/Shanghai',readMethod:reader.readMethod??'dom',cache:{hit:false,storedAt:null},warnings:[CATALOG_WARNING,{code:'CATALOG_TERM',message:observedTerm??'Unknown term'},{code:'SEARCH_SCOPE',message:'Case-insensitive local matching of course code/title and meeting instructors/assistants across verified subject pages. Incomplete scans are partial.'}]});
}
export async function searchCatalog(input:{text:string;termId?:string},options:QueryOptions):Promise<QueryResult<{items:CatalogCourse[]}>>{
 const {withCatalogReader}=await import('./reader.js');return withCatalogReader(input.termId,options,reader=>queryCatalog(input,options,reader));
}
export async function queryCourse(input:{id:string;termId?:string},options:QueryOptions,reader:CatalogReader):Promise<QueryResult<CatalogCourse>>{
 const {termId,code,subject}=courseIdentity(input.id,input.termId);if(!reader.subjects.includes(subject))throw new CliFailure('INVALID_ARGUMENT');
 const found=await queryCatalog({text:code,termId},{...options,limit:2000},{subjects:[subject],read:reader.read,...(reader.readMethod?{readMethod:reader.readMethod}:{})});
 const course=found.data.items.find(c=>c.id===input.id);if(!course||!found.ok)throw new CliFailure('ADAPTER_CHANGED','The course is absent or its subject could not be fully verified.');
 return{ok:true,data:course,meta:{...found.meta,command:'catalog course',returnedCount:1}};
}
export async function getCatalogCourse(input:{id:string;termId?:string},options:QueryOptions):Promise<QueryResult<CatalogCourse>>{
 const {termId}=courseIdentity(input.id,input.termId);const {withCatalogReader}=await import('./reader.js');return withCatalogReader(termId,options,reader=>queryCourse(input,options,reader));
}
export function createCatalogHandlers(factory?:(termId:string|undefined,options:QueryOptions)=>Promise<CatalogReader>):Record<string,CommandHandler>{
 return Object.fromEntries(['search','course'].map(action=>['catalog.'+action,async(args:Readonly<Record<string,unknown>>,deps)=>{
  const options:QueryOptions={refresh:args.refresh===true,deadlineMs:Number(args.deadlineMs),...(typeof args.limit==='number'?{limit:args.limit}:{})};
  const termId=typeof args.term==='string'?args.term:undefined;
  const input=action==='search'?{text:String(args.text),...(termId?{termId}:{})}:{id:String(args.id),...(termId?{termId}:{})};
  const resolvedTerm='id'in input?courseIdentity(input.id,termId).termId:termId;
  if(factory){const reader=await factory(termId,options);return 'text'in input?queryCatalog(input,options,reader):queryCourse(input,options,reader);}
  const {withCatalogReader}=await import('./reader.js');
  return withCatalogReader<QueryResult<unknown>>(resolvedTerm,options,reader=>'text'in input?queryCatalog(input,options,reader):queryCourse(input,options,reader),deps,args.headed===true);
 }]));
}
