#!/usr/bin/env node
import {readFileSync} from 'node:fs';
// Keep the unsupported-runtime path dependency-free and compatible with older Node.
if (Number(process.versions.node.split('.')[0]) !== 24) {
  let cliVersion='0.0.0';
  try{const value=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));if(typeof value.version==='string'&&/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(value.version))cliVersion=value.version;}catch{}
  const failure={ok:false,error:{code:'ENVIRONMENT_NOT_READY',message:'Node.js 24.x is required.',retryable:false,remediation:'Install Node.js 24.x manually, then run doctor again.',details:{cliVersion,nodeVersion:process.version,platform:process.platform,arch:process.arch,checks:[{id:'node',status:'fail',code:'NODE_UNSUPPORTED',remediation:'Install Node.js 24.x manually.'}],capabilities:{verified:0,pending:0,unsupported:0,disabled:0}}},meta:{schemaVersion:'1',command:process.argv[2]==='doctor'?'doctor':'hkustgz-cli'}};
  const args=process.argv.slice(2);const table=args.some((arg,index)=>arg==='--format=table'||arg==='--format'&&args[index+1]==='table');
  process.stdout.write(table?'ENVIRONMENT_NOT_READY: Node.js 24.x is required.\nNODE_UNSUPPORTED: Install Node.js 24.x manually.\n':JSON.stringify(failure)+'\n');process.exitCode=8;
} else {
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
}
