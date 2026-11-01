import type {Interval} from './model.js';
export type CheckState='pass'|'fail'|'unknown';
export interface LibraryCheck {id:string;state:CheckState;reason:string}
export interface LibraryRuleInput {
 startsAt:string;endsAt:string;now:number;participantCount:number;
 minUser?:number;maxUser?:number;onlyView?:boolean;
 rule?:{limit:number;minResvTime:number;maxResvTime:number;timeInterval:number;latestResvTime:number;earliestResvTime:number;freezingTime:number};
 openIntervals?:Interval[];busyIntervals?:Interval[];
 maintenance?:'clear'|'blocked'|'unknown';qualification?:'clear'|'blocked'|'unknown';quota?:'clear'|'blocked'|'unknown';
}
export interface LibraryRuleReport {eligibility:'blocked'|'unknown';checks:LibraryCheck[]}
const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
const nonnegative=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const stamp=(s:string)=>{if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/.test(s))return NaN;const n=Date.parse(s);return Number.isFinite(n)&&new Date(n+8*3600000).toISOString().slice(0,19)+'+08:00'===s?n:NaN;};
/** Local checks explain evidence; they never turn unresolved school policy into permission. */
export function evaluateLibraryRules(input:LibraryRuleInput):LibraryRuleReport {
 const checks:LibraryCheck[]=[];
 const add=(id:string,state:CheckState,reason:string)=>{checks.push({id,state,reason});};
 const a=stamp(input.startsAt),b=stamp(input.endsAt);
 const valid=Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(input.now)&&a>=input.now&&a<b&&input.startsAt.slice(0,10)===input.endsAt.slice(0,10);
 add('time',valid?'pass':'fail','Use a future, same-day interval with explicit school timezone and minute precision.');
 const r=input.rule;
 const countValid=positive(input.participantCount);
 add('participants',!countValid?'fail':positive(input.minUser)&&positive(input.maxUser)&&input.minUser<=input.maxUser?(input.participantCount>=input.minUser&&input.participantCount<=input.maxUser?'pass':'fail'):'unknown','Participant count must meet the target resource limits; participant identities require separate verification.');
 if(valid){
  const duration=(b-a)/60000;
  add('duration',r&&positive(r.minResvTime)&&positive(r.maxResvTime)&&r.minResvTime<=r.maxResvTime?(duration>=r.minResvTime&&duration<=r.maxResvTime?'pass':'fail'):'unknown','Check the inclusive source duration limits.');
  const open=input.openIntervals;
  const usable=open?.every(x=>Number.isFinite(stamp(x.start))&&Number.isFinite(stamp(x.end))&&stamp(x.start)<stamp(x.end));
  const containing=usable?open?.find(x=>stamp(x.start)<=a&&b<=stamp(x.end)):undefined;
  add('opening',!open||!usable?'unknown':containing?'pass':'fail','The whole interval must fit a verified opening segment.');
  const busy=input.busyIntervals;
  const busyValid=busy?.every(x=>Number.isFinite(stamp(x.start))&&Number.isFinite(stamp(x.end))&&stamp(x.start)<stamp(x.end));
  const freeze=r&&nonnegative(r.freezingTime)?r.freezingTime*60000:undefined;
  let anchor=containing?stamp(containing.start):undefined;
  if(anchor!==undefined&&busyValid&&freeze!==undefined)for(const item of busy!){const bufferedEnd=stamp(item.end)+freeze;if(bufferedEnd<=a)anchor=Math.max(anchor,bufferedEnd);}
  add('step',r&&positive(r.timeInterval)&&anchor!==undefined&&busyValid&&freeze!==undefined?((a-anchor)%(r.timeInterval*60000)===0&&(b-anchor)%(r.timeInterval*60000)===0?'pass':'fail'):'unknown','Use the source grid relative to the free segment after active occupancy and buffers.');
  add('occupancy',!busy||!busyValid||freeze===undefined?'unknown':busy.some(x=>a<stamp(x.end)+freeze&&b>stamp(x.start)-freeze)?'fail':'pass','Compare active occupancy and source buffers with half-open interval semantics.');
  const wholeDays=r&&nonnegative(r.latestResvTime)&&nonnegative(r.earliestResvTime)&&r.latestResvTime<=r.earliestResvTime&&r.latestResvTime%1440===0&&r.earliestResvTime%1440===0;
  const today=Math.floor((input.now+8*3600000)/86400000),day=Math.floor((a+8*3600000)/86400000);
  add('advance',wholeDays?(day>=today+r.latestResvTime/1440&&day<=today+r.earliestResvTime/1440?'pass':'fail'):'unknown','Only the evidenced whole-school-day advance window is evaluated.');
 }
 add('onlyView',input.onlyView===true?'fail':input.onlyView===false?'pass':'unknown','View visibility is not reservation authorization.');
 add('ruleMask',r&&nonnegative(r.limit)&&(r.limit===0||r.limit===4)?'pass':'unknown','Unexplained source rule bits, including 256, cannot be ignored.');
 for(const id of ['maintenance','qualification','quota'] as const)add(id,input[id]==='blocked'?'fail':'unknown','Complete current school evidence is required; an empty or caller-assumed state is insufficient.');
 add('participantIdentity','unknown','A count alone does not verify real participants or their eligibility.');
 return{eligibility:checks.some(x=>x.state==='fail')?'blocked':'unknown',checks};
}
