import { z } from 'zod';
import type { BrowserContext, Page } from 'playwright';

export type ServiceId = 'portal' | 'sis' | 'catalog' | 'canvas' | 'booking' | 'booking-library';
export type ReadMethod = 'api' | 'response' | 'dom';
export type Coverage = 'complete' | 'partial';
export type CapabilityState = 'pending' | 'verified' | 'unsupported' | 'disabled';
export interface Capability { id: string; service: ServiceId; state: CapabilityState; reason: string | null; evidenceId: string | null }
export interface QueryOptions { limit?: number; refresh: boolean; deadlineMs: number }
export interface DateRange { from: string; to: string; timezone: 'Asia/Shanghai' }
export interface CliError { code: string; message: string; retryable: boolean; remediation: string }
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
export interface Session { service: ServiceId; page: Page; context: BrowserContext }
export interface SessionOptions { browser: 'chrome' | 'edge' | 'chromium'; headless: boolean; deadlineMs: number; purpose: 'query' | 'login' }
export type SessionRunner = <T>(service: ServiceId, options: SessionOptions, run: (session: Session) => Promise<T>) => Promise<T>;
export type CommandHandler = (args: Readonly<Record<string, unknown>>, deps: CliDependencies) => Promise<QueryResult<unknown> | ControlResult<unknown>>;
export interface CliDependencies { now: () => number; capabilities: Capability[]; sessionRunner: SessionRunner; handlers: Record<string, CommandHandler> }

export const ServiceSchema = z.enum(['portal', 'sis', 'catalog', 'canvas', 'booking', 'booking-library']);
export const CapabilitySchema = z.strictObject({
  id: z.string().min(1), service: ServiceSchema, state: z.enum(['pending', 'verified', 'unsupported', 'disabled']),
  reason: z.string().nullable(), evidenceId: z.string().min(1).nullable(),
}).refine((item) => item.state !== 'verified' || item.evidenceId !== null, 'Verified capabilities require evidence');
const ErrorSchema = z.strictObject({code: z.string().min(1), message: z.string().min(1), retryable: z.boolean(), remediation: z.string().min(1)});
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
