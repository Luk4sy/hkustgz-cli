import {constants} from 'node:fs';
import {open,lstat,readdir,mkdir,rmdir,unlink,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {hostname} from 'node:os';
import {randomBytes,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {canonicalDirectoryPath} from '../core/safe-directory.js';
import {assertOwned,claimDirectory} from '../session/paths.js';
import {CliFailure} from '../core/errors.js';
import {IntentSchema} from './intent.js';
import {CheckSchema,PreviewSchema} from './contract.js';
const hex=z.string().regex(/^[a-f0-9]{64}$/),moment=z.number().int().nonnegative();
export const CancelIntentSchema=z.strictObject({reservationId:z.string().regex(/^[1-9]\d*$/),from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
const RecordSchema=z.strictObject({operationId:z.uuid(),action:z.enum(['create','cancel']),subject:hex,intentHash:hex,ruleVersion:hex,createdAt:moment,updatedAt:moment,expiresAt:moment,lifecycle:z.enum(['prepared','dispatching','resolved','expired']),outcome:z.enum(['not_attempted','confirmed','not_applied','already_cancelled','unknown']),eligibility:z.enum(['ready','blocked','unknown']),checks:z.array(CheckSchema),reservationId:z.string().regex(/^[1-9]\d*$/).nullable(),sourceStatusCode:z.number().int().nonnegative().nullable(),approvalState:PreviewSchema.shape.approvalState,receiptEvidence:z.literal('create_success').optional(),duplicateUntil:moment.optional(),intent:z.union([IntentSchema,CancelIntentSchema]).optional(),preview:PreviewSchema.optional()}).refine(r=>(r.action==='create'?(!r.intent||'roomId'in r.intent):(!r.intent||'reservationId'in r.intent))&&r.expiresAt===r.createdAt+300000&&r.updatedAt>=r.createdAt&&(r.lifecycle==='prepared'?r.outcome==='not_attempted'&&!!r.intent&&!!r.preview:r.lifecycle==='expired'?r.outcome==='not_attempted'&&!r.intent&&!r.preview:r.lifecycle==='dispatching'?r.outcome==='unknown'&&!!r.intent:r.outcome!=='not_attempted'));
const PayloadSchema=z.strictObject({schemaVersion:z.literal(1),records:z.array(RecordSchema).max(10000)}).refine(x=>new Set(x.records.map(r=>r.operationId)).size===x.records.length);
const EnvelopeSchema=z.strictObject({payload:PayloadSchema,mac:hex});
export type StoredOperation=z.infer<typeof RecordSchema>&{confirmationDigest?:string};
export class DuplicateOperationFailure extends CliFailure {
 constructor(public readonly operation:StoredOperation){super('DUPLICATE_INTENT',`Run hkustgz-cli booking operation ${operation.operationId} --refresh for read-only reconciliation; do not repeat a possibly sent request.`);}
}
export interface PrepareInput {action:'create'|'cancel';subject:string;intent:z.infer<typeof IntentSchema>|z.infer<typeof CancelIntentSchema>;ruleVersion:string;eligibility:'ready'|'blocked'|'unknown';checks:z.infer<typeof CheckSchema>[];preview:z.infer<typeof PreviewSchema>;reservationId?:string|null;sourceStatusCode?:number|null}
const unavailable=()=>new CliFailure('OPERATION_STATE_UNAVAILABLE');
const sign=(secret:Buffer,value:unknown)=>createHmac('sha256',secret).update(JSON.stringify(value)).digest('hex');
const equal=(a:string,b:string)=>/^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
async function safeFile(path:string):Promise<Buffer>{
 const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||(process.getuid&&info.uid!==process.getuid())||(process.platform!=='win32'&&(info.mode&0o077)!==0)||info.size>16*1024*1024)throw unavailable();
 const f=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{const actual=await f.stat();if(actual.ino!==info.ino||actual.dev!==info.dev)throw unavailable();return await f.readFile();}finally{await f.close();}
}
async function writePrivate(path:string,data:string|Buffer){const f=await open(path,'wx',0o600);try{await f.writeFile(data);await f.sync();}finally{await f.close();}}
async function atomic(path:string,value:unknown,beforeRename?:()=>Promise<void>){const temp=path+'.'+randomUUID()+'.tmp';try{await writePrivate(temp,JSON.stringify(value));await beforeRename?.();await rename(temp,path);const dir=await open(join(path,'..'),'r');try{await dir.sync();}catch(e){if(process.platform!=='win32')throw e;}finally{await dir.close();}}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
const OwnerSchema=z.strictObject({tool:z.literal('hkustgz-cli'),schemaVersion:z.literal(1),pid:z.number().int().positive(),host:z.string().min(1),token:z.uuid()});
async function takeLock(dir:string):Promise<{lock:string;owner:string;token:string}>{
 const lock=join(dir,'.lock');
 try{await mkdir(lock,{mode:0o700});}
 catch(e){
  if((e as NodeJS.ErrnoException).code!=='EEXIST')throw unavailable();
  const before=await lstat(lock);if(before.isSymbolicLink()||!before.isDirectory()||(await readdir(lock)).join()!=='owner')throw unavailable();
  const old=(await safeFile(join(lock,'owner'))).toString();const parsed=OwnerSchema.safeParse(JSON.parse(old));if(!parsed.success||parsed.data.host!==hostname())throw unavailable();
  try{process.kill(parsed.data.pid,0);throw unavailable();}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw unavailable();}
  // Competing reapers must acquire a marker inside the exact old lock. A stale
  // observer which lands in a replacement lock fails the second inode/owner check.
  const guard=join(lock,'recover'),nonce=randomUUID();await writePrivate(guard,nonce);
  let moved=false;
  try{
   const current=await lstat(lock);
   if(current.ino!==before.ino||current.dev!==before.dev||(await safeFile(join(lock,'owner'))).toString()!==old||(await readdir(lock)).sort().join()!=='owner,recover')throw unavailable();
   const quarantine=join(dir,'.reap-'+randomUUID());await rename(lock,quarantine);moved=true;
   if((await safeFile(join(quarantine,'owner'))).toString()!==old||(await safeFile(join(quarantine,'recover'))).toString()!==nonce)throw unavailable();
   await unlink(join(quarantine,'owner'));await unlink(join(quarantine,'recover'));await rmdir(quarantine);
  }finally{if(!moved){try{if((await safeFile(guard)).toString()===nonce)await unlink(guard);}catch{/* Preserve unverifiable recovery state. */}}}
  try{await mkdir(lock,{mode:0o700});}catch{throw unavailable();}
 }
 const owner=join(lock,'owner');const token=JSON.stringify({tool:'hkustgz-cli',schemaVersion:1,pid:process.pid,host:hostname(),token:randomUUID()});
 try{await writePrivate(owner,token);}catch{throw unavailable();}
 return{lock,owner,token};
}
/** Instances exist only under withOperationStore's cross-process lock. No school writes live here. */
export class OperationStore {
 constructor(private readonly dir:string,private readonly key:Buffer,private records:z.infer<typeof RecordSchema>[],private expectedState:Buffer,private readonly directoryIdentity:{ino:number;dev:number},private readonly lease:()=>Promise<void>){ }
 private active=true;private readonly pending=new Set<Promise<void>>();
 async close(){this.active=false;await Promise.allSettled([...this.pending]);}
 get secret(){return Buffer.from(this.key);}
 private checkTime(now:number){if(!Number.isSafeInteger(now)||now<0)throw new CliFailure('INVALID_ARGUMENT');}
 private materialize(r:z.infer<typeof RecordSchema>):StoredOperation{return{...structuredClone(r),...(r.lifecycle==='prepared'&&r.eligibility==='ready'?{confirmationDigest:sign(this.key,{kind:'confirmation',record:r})}:{})};}
 private async verify(){try{
  if(!this.active)throw unavailable();await this.lease();
  canonicalDirectoryPath(this.dir,'INVALID_DATA_HOME');await assertOwned(this.dir);const info=await lstat(this.dir);
  if(info.ino!==this.directoryIdentity.ino||info.dev!==this.directoryIdentity.dev||!(await safeFile(join(this.dir,'key'))).equals(this.key)||!(await safeFile(join(this.dir,'state.json'))).equals(this.expectedState))throw unavailable();
 }catch{throw unavailable();}}
 private async save(records:z.infer<typeof RecordSchema>[]){
  const write=(async()=>{try{await this.verify();const payload=PayloadSchema.parse({schemaVersion:1,records}),envelope={payload,mac:sign(this.key,payload)};await atomic(join(this.dir,'state.json'),envelope,()=>this.verify());this.records=payload.records;this.expectedState=Buffer.from(JSON.stringify(envelope));}catch{throw unavailable();}})();
  this.pending.add(write);try{await write;}finally{this.pending.delete(write);}
 }
 private async sweep(now:number){this.checkTime(now);await this.verify();const records=this.records.flatMap(r=>{if(r.outcome==='unknown'||r.lifecycle==='dispatching'||(r.action==='create'&&r.outcome==='confirmed'&&(r.duplicateUntil===undefined||now<r.duplicateUntil)))return[r];if((r.lifecycle==='resolved'||r.lifecycle==='expired')&&now-r.updatedAt>=7*86400000)return[];if(r.lifecycle==='prepared'&&now>=r.expiresAt){const {intent,preview,...minimal}=r;return[{...minimal,lifecycle:'expired' as const,updatedAt:now}];}return[r];});if(JSON.stringify(records)!==JSON.stringify(this.records))await this.save(records);}
 async prepare(input:PrepareInput,now:number):Promise<StoredOperation>{
  await this.sweep(now);const canonicalIntent=canonical(input.intent);const intentHash=sign(this.key,intentKey(input.action,canonicalIntent));
  const duplicate=this.records.find(r=>r.subject===input.subject&&r.action===input.action&&r.intentHash===intentHash&&(r.lifecycle==='prepared'||r.lifecycle==='dispatching'||r.outcome==='unknown'||r.outcome==='confirmed'));if(duplicate)throw new DuplicateOperationFailure(structuredClone(duplicate));
  const parsed=RecordSchema.safeParse({operationId:randomUUID(),action:input.action,subject:input.subject,intentHash,ruleVersion:input.ruleVersion,createdAt:now,updatedAt:now,expiresAt:now+300000,lifecycle:'prepared',outcome:'not_attempted',eligibility:input.eligibility,checks:input.checks,reservationId:input.reservationId??null,sourceStatusCode:input.sourceStatusCode??null,approvalState:input.preview.approvalState,intent:canonicalIntent,preview:input.preview});
  if(!parsed.success)throw new CliFailure('ADAPTER_CHANGED');await this.save([...this.records,parsed.data]);return this.materialize(parsed.data);
 }
 async read(id:string,now:number):Promise<StoredOperation>{if(!z.uuid().safeParse(id).success)throw new CliFailure('INVALID_ARGUMENT');await this.sweep(now);const r=this.records.find(r=>r.operationId===id);if(!r)throw unavailable();return this.materialize(r);}
 async validateConfirmation(id:string,digest:string,now:number){const r=await this.read(id,now);if(r.action!=='create')throw new CliFailure('INVALID_ARGUMENT');if(r.lifecycle==='expired')throw new CliFailure('PREVIEW_EXPIRED');if(r.lifecycle==='prepared'&&(!r.confirmationDigest||!equal(digest,r.confirmationDigest)||r.eligibility!=='ready'))throw new CliFailure('CONFIRMATION_REQUIRED');return r;}
 async invalidate(id:string,eligibility:'blocked'|'unknown',checks:z.infer<typeof CheckSchema>[],now:number){const r=await this.read(id,now);if(r.lifecycle!=='prepared')throw new CliFailure('OPERATION_UNCERTAIN');const {intent,preview,confirmationDigest,...minimal}=r;const changed={...minimal,lifecycle:'expired' as const,eligibility,checks,updatedAt:now};await this.save(this.records.map(x=>x.operationId===id?changed:x));return this.materialize(changed);}
 async noteCreateReceipt(id:string,reservationId:string,now:number){const r=await this.read(id,now);if(r.action!=='create'||r.lifecycle!=='dispatching'||!/^([1-9]\d*)$/.test(reservationId)||(r.reservationId!==null&&r.reservationId!==reservationId))throw unavailable();const changed={...r,reservationId,receiptEvidence:'create_success' as const,updatedAt:now};await this.save(this.records.map(x=>x.operationId===id?changed:x));return this.materialize(changed);}
 async finalizeCreation(id:string,result:{outcome:'confirmed'|'not_applied';sourceStatusCode:number|null;approvalState:z.infer<typeof PreviewSchema>['approvalState']},now:number){const r=await this.read(id,now);if(r.action!=='create'||r.lifecycle!=='dispatching'||(result.outcome==='confirmed'&&(r.receiptEvidence!=='create_success'||!r.reservationId)))throw unavailable();const {intent,preview,confirmationDigest,...minimal}=r;const changed={...minimal,...result,...result.outcome==='confirmed'&&intent&&'endsAt'in intent?{duplicateUntil:Date.parse(intent.endsAt)}:{},lifecycle:'resolved' as const,updatedAt:now};await this.save(this.records.map(x=>x.operationId===id?changed:x));return this.materialize(changed);}
 async beginDispatch(input:{id:string;digest:string;subject:string;intent:PrepareInput['intent'];ruleVersion:string},now:number):Promise<StoredOperation>{
  const r=await this.read(input.id,now);if(r.lifecycle==='dispatching'||r.outcome==='unknown')throw new CliFailure('OPERATION_UNCERTAIN');if(r.lifecycle==='expired')throw new CliFailure('PREVIEW_EXPIRED');
  if(r.lifecycle!=='prepared'||r.eligibility!=='ready'||!r.confirmationDigest||!equal(input.digest,r.confirmationDigest)||input.subject!==r.subject||input.ruleVersion!==r.ruleVersion||(!equal(sign(this.key,intentKey(r.action,canonical(input.intent))),r.intentHash)||JSON.stringify(canonical(input.intent))!==JSON.stringify(r.intent)))throw new CliFailure('CONFIRMATION_REQUIRED');
  const {confirmationDigest,...stored}=r;const changed={...stored,lifecycle:'dispatching' as const,outcome:'unknown' as const,updatedAt:now};await this.save(this.records.map(x=>x.operationId===r.operationId?changed:x));return this.materialize(changed);
 }
}
function intentKey(action:'create'|'cancel',intent:PrepareInput['intent']){return{action,intent:action==='cancel'&&'reservationId'in intent?{reservationId:intent.reservationId}:intent};}
function canonical(intent:PrepareInput['intent']):PrepareInput['intent']{if('roomId'in intent)return{roomId:intent.roomId,startsAt:intent.startsAt,endsAt:intent.endsAt,participantIds:[...intent.participantIds].sort((a,b)=>Number(a)-Number(b)),...intent.purpose?{purpose:intent.purpose}:{}};return{reservationId:intent.reservationId,from:intent.from,to:intent.to};}
export async function withOperationStore<T>(home:string,run:(store:OperationStore)=>Promise<T>):Promise<T>{
 let lock:string|undefined;let owner:string|undefined;let token:string|undefined;let callbackStarted=false;let store:OperationStore|undefined;
 try{
  home=canonicalDirectoryPath(home,'INVALID_DATA_HOME');await claimDirectory(home);const dir=canonicalDirectoryPath(join(home,'operations'),'INVALID_DATA_HOME');let fresh=false;try{await mkdir(dir,{mode:0o700});fresh=true;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}await claimDirectory(dir);await assertOwned(dir);
  const info=await lstat(dir);if(process.getuid&&info.uid!==process.getuid())throw unavailable();
  if((await readdir(dir)).some(f=>!['.hkustgz-cli-owner.json','key','state.json','.lock'].includes(f)))throw unavailable();
  ({lock,owner,token}=await takeLock(dir));
  const entries=await readdir(dir);const hasKey=entries.includes('key'),hasState=entries.includes('state.json');if(hasKey!==hasState||(!hasKey&&!fresh))throw unavailable();
  if(!hasKey){const key=randomBytes(32);await writePrivate(join(dir,'key'),key);const payload={schemaVersion:1,records:[]};await atomic(join(dir,'state.json'),{payload,mac:sign(key,payload)});}
  const key=await safeFile(join(dir,'key'));if(key.byteLength!==32)throw unavailable();const rawState=await safeFile(join(dir,'state.json'));const parsed=EnvelopeSchema.safeParse(JSON.parse(rawState.toString('utf8')));if(!parsed.success||!equal(parsed.data.mac,sign(key,parsed.data.payload)))throw unavailable();
  store=new OperationStore(dir,key,parsed.data.payload.records,rawState,{ino:info.ino,dev:info.dev},async()=>{if(!lock||!owner||!token||(await safeFile(owner)).toString()!==token||(await lstat(lock)).isSymbolicLink()||(await readdir(lock)).length!==1)throw unavailable();});callbackStarted=true;return await run(store);
 }catch(e){if(callbackStarted)throw e;if(e instanceof CliFailure&&e.code!=='INVALID_DATA_HOME')throw e;throw unavailable();}
 finally{await store?.close();if(lock){try{if(!owner||!token||(await safeFile(owner)).toString()!==token||(await readdir(lock)).length!==1||(await lstat(lock)).isSymbolicLink())throw unavailable();await unlink(owner);await rmdir(lock);}catch{throw unavailable();}}}
}
