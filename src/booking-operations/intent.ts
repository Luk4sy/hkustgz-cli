import {z} from 'zod';
import {CliFailure} from '../core/errors.js';
export const SourceId=z.string().regex(/^[1-9]\d*$/).refine(x=>Number.isSafeInteger(Number(x)));
const time=z.iso.datetime({offset:true}).refine(s=>Number.isFinite(Date.parse(s))&&Date.parse(s)%60000===0);
export const IntentSchema=z.strictObject({roomId:SourceId,startsAt:time,endsAt:time,participantIds:z.array(SourceId).min(1).max(50),purpose:z.string().trim().min(1).max(500).optional()});
export type LibraryBookingIntent=z.infer<typeof IntentSchema>;
export function normalizeIntent(value:unknown,now:number):LibraryBookingIntent{
 const p=IntentSchema.safeParse(value);if(!p.success||!Number.isFinite(now))throw new CliFailure('INVALID_ARGUMENT');
 const r=p.data,a=Date.parse(r.startsAt),b=Date.parse(r.endsAt);
 const school=(n:number)=>new Date(n+8*3600000).toISOString().slice(0,19)+'+08:00';
 if(a<now||a>=b||school(a).slice(0,10)!==school(b).slice(0,10)||new Set(r.participantIds).size!==r.participantIds.length||r.purpose&&(/[\u0000-\u001f\u007f]|https?:\/\/|(?:token|password|cookie|secret)\s*[:=]/i.test(r.purpose)))throw new CliFailure('INVALID_ARGUMENT');
 return{roomId:r.roomId,startsAt:school(a),endsAt:school(b),participantIds:[...r.participantIds].sort((a,b)=>Number(a)-Number(b)),...r.purpose?{purpose:r.purpose}:{}};
}

/** Resolve the self alias only after the authenticated subject has been checked. */
export function normalizePreviewInput(value:unknown,now:number):LibraryBookingIntent {
 if(value && typeof value==='object' && 'participantIds' in value && Array.isArray(value.participantIds) &&
    value.participantIds.length===1 && value.participantIds[0]==='self'){
  return {...normalizeIntent({...value,participantIds:['1']},now),participantIds:['self']};
 }
 return normalizeIntent(value,now);
}
