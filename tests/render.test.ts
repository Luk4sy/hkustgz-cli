import assert from 'node:assert/strict';
import test from 'node:test';
import { renderOutput } from '../src/cli/render.js';
import { queryMeta } from './fixtures.js';

for (const items of [[{ code: 'TEST1000' }], []]) {
  test(`table preserves query context with ${items.length} items`, () => {
    const output = renderOutput({ ok: true, data: { termId: '2026-fall', total: 0, active: false, range: { from: '2026-09-01' }, items }, meta: queryMeta() }, 'table');
    assert.match(output, /termId: 2026-fall/);
    assert.match(output, /total: 0/);
    assert.match(output, /active: false/);
    assert.match(output, /range: \{"from":"2026-09-01"\}/);
    assert.match(output, items.length ? /TEST1000/ : /\(no items\)/);
  });
}

test('partial table explains coverage, read counts and truncation', () => {
  const output = renderOutput({
    ok: false, data: { termId: '2026-fall', items: [{ code: 'TEST1000' }] },
    error: { code: 'PARTIAL_RESULT', message: 'Incomplete query', retryable: true, remediation: 'Narrow query' },
    meta: { ...queryMeta(), coverage: 'partial' as const, pagesRead: 20, recordsRead: 500, returnedCount: 1, truncationReason: 'page_cap' as const },
  }, 'table');
  for (const expected of ['termId: 2026-fall', 'Coverage: partial', 'pagesRead: 20', 'recordsRead: 500', 'returnedCount: 1', 'truncationReason: page_cap']) assert.ok(output.includes(expected), expected);
});
