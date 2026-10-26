#!/usr/bin/env node
try {
  const { run } = await import('../dist/cli/main.js');
  await run();
} catch {
  process.stdout.write(`${JSON.stringify({ ok: false, error: {
    code: 'INTERNAL_ERROR', message: 'The CLI runtime could not start.', retryable: false,
    remediation: 'Run npm run build in a source checkout, or reinstall the package.',
  }, meta: { schemaVersion: '1', command: 'hkustgz-cli' } })}\n`);
  process.exitCode = 1;
}
