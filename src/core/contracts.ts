import { z } from 'zod';
import type { BrowserContext, Page } from 'playwright';

export type ServiceId = 'portal' | 'sis' | 'catalog' | 'canvas' | 'booking' | 'booking-library';
export type ReadMethod = 'api' | 'response' | 'dom';
export type Coverage = 'complete' | 'partial';
export type CapabilityState = 'pending' | 'verified' | 'unsupported' | 'disabled';
export interface Capability { id: string; service: ServiceId; state: CapabilityState; reason: string | null; evidenceId: string | null }
export interface QueryOptions { limit?: number; refresh: boolean; deadlineMs: number; signal?: AbortSignal }
export interface PageBatch<T> { items:T[]; next:string|null; exhausted:boolean; emptyConfirmed:boolean }
export interface PageSource<T> {
  readPage:(cursor:string|null,signal:AbortSignal)=>Promise<PageBatch<T>>;
  /** Confirmed read-only operation; only this opt-in permits automatic retries. */
  readOnly?:boolean;
  /** Normalized service origin used for shared scheduling; never a request target. */
  origin?:string;
}
export interface Collected<T> {
  items:T[]; pagesRead:number; recordsRead:number; coverage:Coverage;
  truncationReason:QueryMeta['truncationReason']; failure?:CliError;
}
export interface DateRange { from: string; to: string; timezone: 'Asia/Shanghai' }
export interface SkillChangeReport { action: 'install'|'uninstall'; dryRun:boolean; changed:string[]; preserved:string[]; complete:boolean }
export interface DoctorCheck {id:string;status:'pass'|'warn'|'fail';code:string;remediation:string}
export interface DoctorReport {cliVersion:string;nodeVersion:string;platform:string;arch:string;checks:DoctorCheck[];capabilities:{verified:number;pending:number;unsupported:number;disabled:number}}
export interface DoctorProbes {
 runtime:()=>{nodeVersion:string;platform:string;arch:string};
 data:(env:NodeJS.ProcessEnv)=>Promise<'absent'|'safe'|'busy'|'unknown-lock'>;
 browser:(env:NodeJS.ProcessEnv)=>Promise<{selected:'chrome'|'edge'|'chromium';chromeAvailable:boolean}>;
 skill:(env:NodeJS.ProcessEnv)=>Promise<{state:'absent'|'current'|'outdated'|'modified'|'unowned'|'unavailable';installedVersion:string|null;expectedVersion:string}>;
}
export interface CliError { code: string; message: string; retryable: boolean; remediation: string; details?:SkillChangeReport|DoctorReport }
export interface QueryMeta {
  schemaVersion: '1'; command: string; service: ServiceId; sourceUrl: string; fetchedAt: string;
  timezone: 'Asia/Shanghai'; readMethod: ReadMethod; coverage: Coverage;
  pagesRead: number; recordsRead: number; returnedCount: number;
  truncationReason: 'limit' | 'page_cap' | 'record_cap' | 'timeout' | 'upstream' | null;
  cache: { hit: boolean; storedAt: string | null }; warnings: Array<{ code: string; message: string }>;
}
export type QueryResult<T> =
  | { ok: true; data: T; meta: QueryMeta & { coverage: 'complete' } }
  | { ok: false; data: T; error: CliError & { code: 'PARTIAL_RESULT' }; meta: QueryMeta & { coverage: 'partial' } };
export interface ControlResult<T> { ok: true; data: T; meta: { schemaVersion: '1'; command: string } }
export interface Failure { ok: false; error: CliError; meta: { schemaVersion: '1'; command: string; service?: ServiceId } }
export interface AuthReport { service: ServiceId; state: 'authenticated' | 'unauthenticated' | 'unknown'; checkedAt: string; checkedUrl: string; reason: string }
export interface DataPaths { root: string; profile: string; cache: string; logs: string }
export interface Session { service: ServiceId; page: Page; context: BrowserContext; signal?: AbortSignal }
export interface SessionOptions { browser: 'chrome' | 'edge' | 'chromium'; headless: boolean; deadlineMs: number; purpose: 'query' | 'login' }
export type SessionRunner = <T>(service: ServiceId, options: SessionOptions, run: (session: Session) => Promise<T>) => Promise<T>;
export type CommandHandler = (args: Readonly<Record<string, unknown>>, deps: CliDependencies) => Promise<QueryResult<unknown> | ControlResult<unknown>>;
export interface CliDependencies { now: () => number; capabilities: Capability[]; sessionRunner: SessionRunner; handlers: Record<string, CommandHandler>; env?: NodeJS.ProcessEnv; doctorProbes?:DoctorProbes }

export const ServiceSchema = z.enum(['portal', 'sis', 'catalog', 'canvas', 'booking', 'booking-library']);
export const CapabilitySchema = z.strictObject({
  id: z.string().min(1), service: ServiceSchema, state: z.enum(['pending', 'verified', 'unsupported', 'disabled']),
  reason: z.string().nullable(), evidenceId: z.string().min(1).nullable(),
}).refine((item) => item.state !== 'verified' || item.evidenceId !== null, 'Verified capabilities require evidence');
const RelativeSkillPath=z.string().min(1).refine(s=>{
 const parts=s.replace(/\/$/,'').split('/');
 return !s.startsWith('/')&&!s.includes('\\')&&!/[\u0000-\u001f\u007f]/.test(s)&&parts.every(part=>part!==''&&part!=='.'&&part!=='..');
});
export const SkillChangeReportSchema=z.strictObject({action:z.enum(['install','uninstall']),dryRun:z.boolean(),changed:z.array(RelativeSkillPath),preserved:z.array(RelativeSkillPath),complete:z.boolean()});
const VersionSchema=z.string().regex(/^v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
export const DoctorReportSchema=z.strictObject({cliVersion:VersionSchema,nodeVersion:VersionSchema,platform:z.enum(['darwin','linux','win32','aix','freebsd','openbsd','sunos','android','netbsd','haiku','cygwin']),arch:z.enum(['arm','arm64','ia32','x64','ppc','ppc64','s390','s390x','riscv64','loong64','mips','mipsel']),checks:z.array(z.strictObject({id:z.string().regex(/^[a-z_-]+$/),status:z.enum(['pass','warn','fail']),code:z.string().regex(/^[A-Z_]+$/),remediation:z.string().min(1)})),capabilities:z.strictObject({verified:z.number().int().nonnegative(),pending:z.number().int().nonnegative(),unsupported:z.number().int().nonnegative(),disabled:z.number().int().nonnegative()})});
const ErrorSchema = z.strictObject({code: z.string().min(1), message: z.string().min(1), retryable: z.boolean(), remediation: z.string().min(1),details:z.union([SkillChangeReportSchema,DoctorReportSchema]).optional()});
const MetaSchema = z.strictObject({
  schemaVersion: z.literal('1'), command: z.string().min(1), service: ServiceSchema,
  sourceUrl: z.url(), fetchedAt: z.iso.datetime({offset: true}), timezone: z.literal('Asia/Shanghai'),
  readMethod: z.enum(['api', 'response', 'dom']), coverage: z.enum(['complete', 'partial']),
  pagesRead: z.number().int().nonnegative(), recordsRead: z.number().int().nonnegative(), returnedCount: z.number().int().nonnegative(),
  truncationReason: z.enum(['limit', 'page_cap', 'record_cap', 'timeout', 'upstream']).nullable(),
  cache: z.strictObject({hit: z.boolean(), storedAt: z.iso.datetime({offset: true}).nullable()}),
  warnings: z.array(z.strictObject({code: z.string(), message: z.string()})),
}).refine((meta) => meta.returnedCount <= meta.recordsRead, 'Returned records exceed observed records');
export const QueryResultSchema = z.discriminatedUnion('ok', [
  z.strictObject({ok: z.literal(true), data: z.json(), meta: MetaSchema.refine((meta) => meta.coverage === 'complete' && meta.truncationReason === null)}),
  z.strictObject({ok: z.literal(false), data: z.json(), error: ErrorSchema.extend({code: z.literal('PARTIAL_RESULT')}),
    meta: MetaSchema.refine((meta) => meta.coverage === 'partial' && meta.truncationReason !== null)}),
]);
export const ControlResultSchema = z.strictObject({ok: z.literal(true), data: z.json(), meta: z.strictObject({schemaVersion: z.literal('1'), command: z.string().min(1)})});
