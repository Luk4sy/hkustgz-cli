import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryResultSchema } from '../src/core/contracts.js';
import { classifyError, CliFailure } from '../src/core/errors.js';
import { queryMeta } from './fixtures.js';

test('a complete query requires complete coverage and no truncation', () => {
  assert.equal(QueryResultSchema.safeParse({ ok: true, data: { items: [] }, meta: queryMeta() }).success, true);
  assert.equal(QueryResultSchema.safeParse({ ok: true, data: {}, meta: { ...queryMeta(), coverage: 'partial' } }).success, false);
  assert.equal(QueryResultSchema.safeParse({ ok: true, data: {}, meta: { ...queryMeta(), truncationReason: 'limit' } }).success, false);
});

test('partial query carries trusted data and PARTIAL_RESULT', () => {
  const value = { ok: false, data: { items: [{ id: 'one' }] }, error: {
    code: 'PARTIAL_RESULT', message: 'Result is incomplete.', retryable: false, remediation: 'Narrow the query.',
  }, meta: { ...queryMeta(), coverage: 'partial', truncationReason: 'limit' } };
  assert.equal(QueryResultSchema.safeParse(value).success, true);
  assert.equal(QueryResultSchema.safeParse({ ...value, error: { ...value.error, code: 'LOGIN_REQUIRED' } }).success, false);
  const { data: _data, ...withoutData } = value;
  assert.equal(QueryResultSchema.safeParse(withoutData).success, false);
});

test('invalid source metadata does not pass the contract', () => {
  for (const change of [{ pagesRead: -1 }, { returnedCount: 1.2 }, { timezone: 'UTC' }, { readMethod: 'guess' }, { sourceUrl: 'not a URL' }]) {
    assert.equal(QueryResultSchema.safeParse({ ok: true, data: {}, meta: { ...queryMeta(), ...change } }).success, false);
  }
});

test('error categories map to public exit codes', () => {
  for (const [code, exitCode] of Object.entries({ INVALID_ARGUMENT: 2, LOGIN_REQUIRED: 3, PERMISSION_DENIED: 4,
    NETWORK_REQUIRED: 5, QUERY_TIMEOUT: 5, RATE_LIMITED: 5, ADAPTER_CHANGED: 6, PARTIAL_RESULT: 7,
    CAPABILITY_PENDING: 8, UNSUPPORTED_CAPABILITY: 8, PROFILE_BUSY: 9 })) {
    assert.equal(classifyError(new CliFailure(code)).exitCode, exitCode, code);
  }
});

test('unexpected errors do not leak raw exceptions', () => {
  const { error, exitCode } = classifyError(new Error('private access_token=secret-marker'));
  assert.equal(exitCode, 1);
  assert.equal(error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(error), /secret-marker/);
});
