import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {CliFailure} from '../../core/errors.js';
const subject=z.object({code:z.literal(0),data:z.object({accNo:z.number().int().positive().safe(),logonName:z.string().trim().min(1)})});
function parse(payload:unknown){
 if((payload as {code?:unknown}|null)?.code===300)throw new CliFailure('LOGIN_REQUIRED');
 const r=subject.safeParse(payload);if(!r.success)throw new CliFailure('ADAPTER_CHANGED');return r.data.data;
}
export interface LibraryIdentity {
 assertFresh(payload:unknown):void;
 owns(account:unknown):boolean;
 fingerprint(secret:Uint8Array):string;
}
/** Marks failed identity evidence independently of an ordinary page-read error. */
export class LibraryIdentityReadError extends Error {
 constructor(public readonly failure:unknown){super('Library identity evidence could not be verified');}
}
/** Source identity is kept only in this closure, never in a result or log. */
export function bindLibraryIdentity(payload:unknown):LibraryIdentity {
 const original=parse(payload);
 return Object.freeze({
  assertFresh(value:unknown){const current=parse(value);if(current.accNo!==original.accNo||current.logonName!==original.logonName)throw new CliFailure('LOGIN_REQUIRED','The school account changed. Start a new query after authenticating the intended account.');},
  owns(account:unknown){return account===original.accNo;},
  fingerprint(secret:Uint8Array){if(!(secret instanceof Uint8Array)||secret.byteLength<32)throw new CliFailure('INVALID_ARGUMENT');return createHmac('sha256',secret).update(JSON.stringify([original.accNo,original.logonName])).digest('hex');}
 });
}
