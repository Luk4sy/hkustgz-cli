import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilitySchema } from '../src/core/contracts.js';
import { requireCapability } from '../src/core/capabilities.js';
import { classifyError } from '../src/core/errors.js';

test('verified capabilities require an evidence identifier', () => {
  assert.equal(CapabilitySchema.safeParse({ id: 'sis.timetable', service: 'sis', state: 'verified', reason: null, evidenceId: null }).success, false);
});

test('capability state blocks reads with the documented error', () => {
  for (const [state, code] of [['pending', 'CAPABILITY_PENDING'], ['unsupported', 'UNSUPPORTED_CAPABILITY'], ['disabled', 'ADAPTER_CHANGED']] as const) {
    try {
      requireCapability([{ id: 'sis.timetable', service: 'sis', state, reason: 'No verified adapter.', evidenceId: null }], 'sis.timetable');
      assert.fail('Expected capability gate to reject');
    } catch (error) { assert.equal(classifyError(error).error.code, code); }
  }
});

test('missing capability cannot authorize a read', () => {
  assert.throws(() => requireCapability([], 'sis.timetable'));
});
