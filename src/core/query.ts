import type {Collected,PageBatch,PageSource,QueryMeta,QueryOptions,QueryResult} from './contracts.js';
import {CliFailure,classifyError} from './errors.js';
import {createQueryPolicy,type QueryPolicy} from './policy.js';
import {sanitizeSourceUrl} from './sanitize.js';

function validateBatch<T>(value:PageBatch<T>):void {
 if(!value||!Array.isArray(value.items)||typeof value.exhausted!=='boolean'||typeof value.emptyConfirmed!=='boolean'||!(value.next===null||(typeof value.next==='string'&&value.next.trim().length>0))||value.exhausted!==(value.next===null)||(!value.items.length&&!value.emptyConfirmed))throw new CliFailure('ADAPTER_CHANGED');
}
export async function collectPages<T>(source:PageSource<T>,options:QueryOptions,policy:QueryPolicy=createQueryPolicy(options.deadlineMs)):Promise<Collected<T>>{
 if(!Number.isFinite(options.deadlineMs)||policy.deadlineMs!==options.deadlineMs||(options.limit!==undefined&&(!Number.isInteger(options.limit)||options.limit<1||options.limit>2000)))throw new CliFailure('INVALID_ARGUMENT');
 const limit=options.limit??2000;const items:T[]=[];let pagesRead=0;let recordsRead=0;let cursor:string|null=null;
 const visited=new Set<string|null>();
 const partial=(truncationReason:QueryMeta['truncationReason']):Collected<T>=>({items,pagesRead,recordsRead,coverage:'partial',truncationReason});
 try{
  for(;;){
   if(visited.has(cursor))throw new CliFailure('ADAPTER_CHANGED');visited.add(cursor);
   const page=await policy.run(source.origin??'default',signal=>source.readPage(cursor,signal),{readOnly:source.readOnly??false,...(options.signal?{signal:options.signal}:{})});
   validateBatch(page);pagesRead++;recordsRead+=page.items.length;
   const remaining=limit-items.length;items.push(...page.items.slice(0,remaining));
   if(page.items.length>remaining)return partial(options.limit!==undefined?'limit':'record_cap');
   if(page.exhausted)return{items,pagesRead,recordsRead,coverage:'complete',truncationReason:null};
   if(items.length>=limit)return partial(options.limit!==undefined?'limit':'record_cap');
   if(pagesRead>=20)return partial('page_cap');
   cursor=page.next;
  }
 }catch(error){
  const classified=classifyError(error).error;
  if(!items.length||['INTERRUPTED','TERMINATED','CLEANUP_FAILED'].includes(classified.code))throw error instanceof CliFailure?error:new CliFailure(classified.code);
  return{...partial(classified.code==='QUERY_TIMEOUT'?'timeout':'upstream'),failure:classified};
 }
}
type ResultMeta=Omit<QueryMeta,'pagesRead'|'recordsRead'|'returnedCount'|'coverage'|'truncationReason'>;
export function buildQueryResult<T>(collected:Collected<T>,meta:ResultMeta):QueryResult<{items:T[]}>{
 const common={...meta,sourceUrl:sanitizeSourceUrl(meta.sourceUrl),pagesRead:collected.pagesRead,recordsRead:collected.recordsRead,returnedCount:collected.items.length,
  warnings:[...meta.warnings,...(collected.failure?[{code:collected.failure.code,message:collected.failure.message}]:[])]};
 if(collected.coverage==='complete')return{ok:true,data:{items:collected.items},meta:{...common,coverage:'complete',truncationReason:null}};
 return{ok:false,data:{items:collected.items},error:classifyError(new CliFailure('PARTIAL_RESULT')).error as ReturnType<typeof classifyError>['error']&{code:'PARTIAL_RESULT'},meta:{...common,coverage:'partial',truncationReason:collected.truncationReason}};
}
