import assert from 'node:assert/strict';
import test from 'node:test';
import { executeCommand } from '../src/cli/main.js';
import { queryMeta } from './fixtures.js';
import type { CliDependencies } from '../src/core/contracts.js';

const noSession: CliDependencies['sessionRunner'] = async () => { throw new Error('Browser must not open'); };

test('help does not open browser or require a session', async () => {
  for (const args of [[], ['--help'], ['portal', '--help'], ['sis', 'grades', '--help'], ['booking', 'availability', '--help']]) {
    const result = await executeCommand(args, { sessionRunner: noSession });
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Usage:/);
    assert.equal(result.stderr, '');
  }
});

test('version works without starting a browser', async () => {
  const result = await executeCommand(['--version'], { sessionRunner: noSession });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^0\.1\.0-alpha\.1\n$/);
});

test('unknown options and missing or invalid parameters exit 2', async () => {
  for (const args of [ ['sis', 'today', '--typo'], ['catalog', 'search'], ['catalog', 'search', ''],
    ['catalog', 'search', 'AI', '--limit', '0'], ['catalog', 'search', 'AI', '--limit', '2001'],
    ['catalog', 'search', 'AI', '--limit', '1.5'], ['catalog', 'search', 'AI', '--limit', '2x'],
    ['canvas', 'assignments'], ['booking', 'rooms', '--provider', 'https://evil.example'],
    ['sis', 'today', '--refresh'], ['auth', 'login', 'anything'], ['auth', 'status'],
    ['auth', 'status', 'sis', '--all'], ['portal', 'apps', '--format', 'xml'], ['unknown'],
    ['sis', 'today', '--format', 'table', '--limit', '2'] ]) {
    const result = await executeCommand(args, { sessionRunner: noSession });
    assert.equal(result.exitCode, 2, args.join(' '));
    assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_ARGUMENT');
  }
});

test('pending capability cannot invoke even an injected read handler', async () => {
  const result = await executeCommand(['catalog', 'search', 'AI'], { sessionRunner: noSession,
    handlers: { 'catalog.search': async () => { throw new Error('Handler must not run'); } },
  });
  assert.equal(result.exitCode, 8);
  assert.equal(JSON.parse(result.stdout).error.code, 'CAPABILITY_PENDING');
  assert.equal(result.stderr, '');
});

test('capabilities reports five modules as pending, never as ready', async () => {
  const result = await executeCommand(['capabilities'], { sessionRunner: noSession });
  const payload = JSON.parse(result.stdout);
  assert.equal(result.exitCode, 0);
  assert.equal(payload.ok, true);
  const services = new Set(payload.data.items.map((item: { service: string }) => item.service));
  for (const service of ['portal', 'sis', 'catalog', 'canvas', 'booking-library']) assert.equal(services.has(service), true);
  assert.equal(payload.data.items.some((item: { state: string }) => item.state === 'verified'), false);
});

test('one JSON document on stdout preserves a verified read and strips temporary source tokens', async () => {
  const result = await executeCommand(['catalog', 'search', 'AI', '--limit', '2'], {
    sessionRunner: noSession,
    capabilities: [{ id: 'catalog.search', service: 'catalog', state: 'verified', reason: null, evidenceId: 'synthetic-test-only' }],
    handlers: { 'catalog.search': async (args) => {
      assert.equal(args.text, 'AI'); assert.equal(args.limit, 2);
      return { ok: true, data: { items: [{ code: 'TEST1000', title: 'Synthetic course' }] }, meta: {
        ...queryMeta(), sourceUrl: 'https://sisn.hkust-gz.edu.cn/cq?term=demo&code=private-marker&tt=private-marker',
      } };
    } },
  });
  assert.equal(result.exitCode, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.data.items[0].code, 'TEST1000');
  assert.equal(payload.meta.sourceUrl, 'https://sisn.hkust-gz.edu.cn/cq?term=demo');
  assert.doesNotMatch(result.stdout, /private-marker/);
  assert.equal(result.stdout.trim().split('\n').length, 1);
  assert.equal(result.stderr, '');
});

test('malformed handler result is rejected rather than published as success', async () => {
  const result = await executeCommand(['sis', 'terms'], {
    capabilities: [{ id: 'sis.terms', service: 'sis', state: 'verified', reason: null, evidenceId: 'synthetic-test-only' }],
    handlers: { 'sis.terms': async () => ({ ok: true, data: {}, meta: { ...queryMeta(), service: 'sis', command: 'sis terms', coverage: 'partial' } } as never) },
  });
  assert.equal(result.exitCode, 6);
  assert.equal(JSON.parse(result.stdout).error.code, 'ADAPTER_CHANGED');
});

test('unexpected handler exceptions are returned without private details', async () => {
  const result = await executeCommand(['sis', 'terms'], {
    capabilities: [{ id: 'sis.terms', service: 'sis', state: 'verified', reason: null, evidenceId: 'synthetic-test-only' }],
    handlers: { 'sis.terms': async () => { throw new Error('secret-marker'); } },
  });
  assert.equal(result.exitCode, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /secret-marker/);
});

test('control features not implemented yet return pending, not false success', async () => {
  for (const args of [['doctor'], ['auth', 'login', 'portal'], ['browser', 'status']]) {
    const result = await executeCommand(args, { sessionRunner: noSession });
    assert.equal(result.exitCode, 8);
    assert.equal(JSON.parse(result.stdout).error.code, 'CAPABILITY_PENDING');
  }
});

test('table format applies to semantic errors after valid command parsing', async () => {
  const result = await executeCommand(['sis', 'today', '--format', 'table']);
  assert.equal(result.exitCode, 8);
  assert.match(result.stdout, /^CAPABILITY_PENDING:/);
});

test('partial results keep their data and use exit 7', async () => {
  const result = await executeCommand(['catalog', 'search', 'AI'], {
    capabilities: [{ id: 'catalog.search', service: 'catalog', state: 'verified', reason: null, evidenceId: 'synthetic-test-only' }],
    handlers: { 'catalog.search': async () => ({ ok: false, data: { items: [{ id: 'first-page' }] },
      error: { code: 'PARTIAL_RESULT', message: 'Incomplete.', retryable: false, remediation: 'Narrow the query.' },
      meta: { ...queryMeta(), coverage: 'partial', truncationReason: 'upstream' },
    }) },
  });
  assert.equal(result.exitCode, 7);
  assert.equal(JSON.parse(result.stdout).data.items[0].id, 'first-page');
});

test('every spec command exposes help before enforcing required parameters', async () => {
  const paths = ['doctor', 'capabilities', 'auth login', 'auth status', 'auth logout', 'browser status', 'browser use', 'browser install',
    'portal apps', 'portal notices', 'portal notice', 'portal agenda', 'sis terms', 'sis timetable', 'sis today', 'sis history', 'sis grades',
    'catalog search', 'catalog course', 'canvas courses', 'canvas announcements', 'canvas assignments', 'canvas agenda',
    'booking providers', 'booking rooms', 'booking availability', 'booking mine'];
  for (const path of paths) {
    const result = await executeCommand([...path.split(' '), '--help'], { sessionRunner: noSession });
    assert.equal(result.exitCode, 0, path);
    assert.match(result.stdout, /Usage:/);
  }
});

test('verified table results use the same payload and metadata as JSON', async () => {
  const deps: Partial<CliDependencies> = {
    capabilities: [{ id: 'catalog.search', service: 'catalog', state: 'verified', reason: null, evidenceId: 'synthetic-test-only' }],
    handlers: { 'catalog.search': async () => ({ ok: true, data: { items: [{ code: 'TEST1000', title: 'Synthetic course' }] }, meta: queryMeta() }) },
  };
  const result = await executeCommand(['--format', 'table', 'catalog', 'search', 'AI'], deps);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /TEST1000\tSynthetic course/);
  assert.match(result.stdout, /Coverage: complete/);
});
