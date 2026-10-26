import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const bin = fileURLToPath(new URL('../bin/hkustgz-cli.mjs', import.meta.url));
test('compiled executable works outside the repository without writing a browser profile', () => {
  const temp = mkdtempSync(join(tmpdir(), 'hkustgz-cli-test-'));
  const dataRoot = join(temp, 'private-data');
  try {
    for (const [args, exitCode] of [[['--version'], 0], [['--help'], 0], [['capabilities'], 0], [['sis', 'today'], 8]] as const) {
      const result = spawnSync(process.execPath, [bin, ...args], { cwd: temp, env: { ...process.env, HKUSTGZ_CLI_HOME: dataRoot }, encoding: 'utf8' });
      assert.equal(result.status, exitCode, result.stderr);
      assert.equal(result.stderr, '');
      if (args[0] === 'capabilities') assert.equal(JSON.parse(result.stdout).data.items.length, 19);
      if (args[0] === 'sis') assert.equal(JSON.parse(result.stdout).error.code, 'CAPABILITY_PENDING');
    }
    assert.equal(existsSync(dataRoot), false);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
