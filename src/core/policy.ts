import type {DateRange} from './contracts.js';
import {CliFailure} from './errors.js';

export interface QueryClock { now:()=>number; sleep:(ms:number,signal:AbortSignal)=>Promise<void> }
interface OriginQueue { tail:Promise<void>; lastFinished:number }
const sharedOrigins=new Map<string,OriginQueue>();
const abortReason=(signal:AbortSignal):CliFailure=>signal.reason instanceof CliFailure?signal.reason:new CliFailure('INTERRUPTED');
const sleep:QueryClock['sleep']=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(abortReason(signal));return;}
 const finish=()=>{signal.removeEventListener('abort',cancel);resolve();};
 const timer=setTimeout(finish,ms);
 const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(abortReason(signal));};
 signal.addEventListener('abort',cancel,{once:true});
});
export class HttpReadError extends CliFailure {
 constructor(public readonly status:number,public readonly retryAfter?:string){
  super(status===401?'LOGIN_REQUIRED':status===403?'PERMISSION_DENIED':status===429?'RATE_LIMITED':status===408?'QUERY_TIMEOUT':[500,502,503,504].includes(status)?'NETWORK_REQUIRED':'ADAPTER_CHANGED');
 }
}
function retryDelay(value:string|undefined,now:number):number {
 if(value===undefined)return 500;
 if(/^\d+$/.test(value.trim()))return Number(value)*1000;
 const date=/[A-Za-z]/.test(value)?Date.parse(value):NaN;
 return Number.isFinite(date)?Math.max(0,date-now):500;
}
function originKey(value:string):string {
 if(value==='default')return value;
 try{const url=new URL(value);if(!['https:','http:'].includes(url.protocol))throw new Error();return url.origin;}
 catch{throw new CliFailure('INVALID_ARGUMENT','Use a verified service origin for query scheduling.');}
}
export class QueryPolicy {
 readonly deadlineMs:number;
 private readonly cutoff:number;
 constructor(deadlineMs:number,private readonly clock:QueryClock,private readonly origins:Map<string,OriginQueue>){
  if(!Number.isFinite(deadlineMs))throw new CliFailure('INVALID_ARGUMENT');
  this.deadlineMs=deadlineMs;
  // Return partial data before a SessionRunner using the same hard deadline aborts it.
  const reserve=Math.min(250,Math.max(0,Math.floor((deadlineMs-clock.now())/10)));
  this.cutoff=deadlineMs-reserve;
 }
 async run<T>(origin:string,read:(signal:AbortSignal)=>Promise<T>,options:{readOnly?:boolean;signal?:AbortSignal}={}):Promise<T>{
  const key=originKey(origin);
  let notBefore=0;
  for(let attempt=0;;attempt++){
   try{return await this.schedule(key,read,notBefore,options.signal);}
   catch(error){
    if(options.signal?.aborted)throw abortReason(options.signal);
    const retryable=error instanceof CliFailure&&['NETWORK_REQUIRED','RATE_LIMITED'].includes(error.code);
    if(!options.readOnly||attempt>=1||!retryable)throw error;
    const delay=error instanceof HttpReadError&&error.status===429?retryDelay(error.retryAfter,this.clock.now()):0;
    notBefore=this.clock.now()+Math.max(500,delay);
    if(notBefore>=this.cutoff)throw error;
   }
  }
 }
 private schedule<T>(key:string,read:(signal:AbortSignal)=>Promise<T>,notBefore:number,external?:AbortSignal):Promise<T>{
  if(external?.aborted)return Promise.reject(abortReason(external));
  if(this.clock.now()>=this.cutoff)return Promise.reject(new CliFailure('QUERY_TIMEOUT'));
  const queue=this.origins.get(key)??{tail:Promise.resolve(),lastFinished:-Infinity};this.origins.set(key,queue);
  const controller=new AbortController();
  let settled=false;let globalTimer:ReturnType<typeof setTimeout>|undefined;let requestTimer:ReturnType<typeof setTimeout>|undefined;
  let resolveResult!:(value:T)=>void;let rejectResult!:(error:unknown)=>void;
  const result=new Promise<T>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  const finish=(success:boolean,value:unknown)=>{
   if(settled)return;settled=true;
   if(globalTimer)clearTimeout(globalTimer);if(requestTimer)clearTimeout(requestTimer);
   external?.removeEventListener('abort',cancel);
   if(success)resolveResult(value as T);else rejectResult(value);
  };
  const stop=(error:CliFailure)=>{controller.abort(error);finish(false,error);};
  const cancel=()=>stop(abortReason(external!));
  external?.addEventListener('abort',cancel,{once:true});
  globalTimer=setTimeout(()=>stop(new CliFailure('QUERY_TIMEOUT')),Math.max(1,this.cutoff-this.clock.now()));
  queue.tail=queue.tail.catch(()=>{}).then(async()=>{
   if(controller.signal.aborted)return;
   try{
    const wait=Math.max(queue.lastFinished+500,notBefore)-this.clock.now();
    if(wait>0)await this.clock.sleep(wait,controller.signal);
    if(controller.signal.aborted)return;
    if(this.clock.now()>=this.cutoff){stop(new CliFailure('QUERY_TIMEOUT'));return;}
    const until=Math.min(this.clock.now()+30000,this.cutoff);
    requestTimer=setTimeout(()=>stop(new CliFailure('QUERY_TIMEOUT')),Math.max(1,until-this.clock.now()));
    const raw=Promise.resolve().then(()=>read(controller.signal));
    raw.then(value=>{
     if(this.clock.now()>=until)stop(new CliFailure('QUERY_TIMEOUT'));else finish(true,value);
    },error=>finish(false,error));
    // Retain origin ownership until the actual operation settles, even if it ignores abort.
    try{await raw;}catch{}
    queue.lastFinished=this.clock.now();
   }catch(error){finish(false,error);}
  }).catch(error=>{finish(false,error);});
  return result;
 }
}
export function createQueryPolicy(deadlineMs?:number,clock?:QueryClock):QueryPolicy {
 const actual=clock??{now:Date.now,sleep};
 return new QueryPolicy(deadlineMs??actual.now()+90000,actual,clock?new Map():sharedOrigins);
}
function civilDate(value:string):number {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))throw new CliFailure('INVALID_ARGUMENT','Use valid YYYY-MM-DD school dates.');
 const ms=Date.parse(`${value}T00:00:00Z`);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw new CliFailure('INVALID_ARGUMENT','Use valid YYYY-MM-DD school dates.');
 return ms;
}
export function resolveDateRange(input:{from?:string;to?:string},nowMs:number):DateRange {
 if(!Number.isFinite(nowMs))throw new CliFailure('INVALID_ARGUMENT');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(nowMs);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const from=input.from??`${part('year').padStart(4,'0')}-${part('month')}-${part('day')}`;
 const start=civilDate(from);const to=input.to??new Date(start+7*86400000).toISOString().slice(0,10);const end=civilDate(to);
 if(end<=start||end-start>31*86400000)throw new CliFailure('INVALID_ARGUMENT','Use a positive [from, to) range of at most 31 days.');
 return{from,to,timezone:'Asia/Shanghai'};
}
