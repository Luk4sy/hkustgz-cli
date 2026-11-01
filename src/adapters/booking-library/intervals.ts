import {CliFailure} from '../../core/errors.js';import type {Interval} from './model.js';
const stamp=(n:number)=>new Date(n+8*3600000).toISOString().slice(0,19)+'+08:00';
export function normalizeIntervals(items:Interval[],target:Interval):Interval[]{
 const parse=(x:Interval):[number,number]=>{const a=Date.parse(x.start),b=Date.parse(x.end);if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b||!/(Z|[+-]\d\d:\d\d)$/.test(x.start)||!/(Z|[+-]\d\d:\d\d)$/.test(x.end))throw new CliFailure('ADAPTER_CHANGED');return[a,b];};const [start,end]=parse(target);const merged:Array<[number,number]>=[];
 for(const [a,b]of items.map(parse).map(([a,b]):[number,number]=>[Math.max(start,a),Math.min(end,b)]).filter(([a,b])=>a<b).sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else merged.push([a,b]);}return merged.map(([a,b])=>({start:stamp(a),end:stamp(b)}));
}
export function computeAvailability(input:{target:Interval;open:Interval[];busy:Interval[];coverage:'complete'|'partial'|'unknown'}):{available:Interval[];unknown:Interval[]}{
 const open=normalizeIntervals(input.open,input.target),busy=normalizeIntervals(input.busy,input.target);normalizeIntervals([],input.target);
 if(input.coverage!=='complete'||!open.length)return{available:[],unknown:[input.target]};
 const available:Interval[]=[];for(const o of open){let start=Date.parse(o.start);const end=Date.parse(o.end);for(const b of busy){const a=Date.parse(b.start),z=Date.parse(b.end);if(z<=start||a>=end)continue;if(a>start)available.push({start:stamp(start),end:stamp(a)});start=Math.max(start,z);if(start>=end)break;}if(start<end)available.push({start:stamp(start),end:stamp(end)});}return{available,unknown:[]};
}
