import assert from 'node:assert/strict';import test from 'node:test';import {executeCommand} from '../src/cli/main.js';import {createSisHandlers} from '../src/adapters/sis/index.js';import {SIS_CAPABILITIES} from '../src/adapters/sis/manifest.js';import {reader} from './fixtures/sis/data.js';
test('SIS terms, timetable and today use the actual CLI contracts in both formats',async()=>{
 for(const format of ['json','table'])for(const args of [['sis','terms'],['sis','timetable'],['sis','today','--date','2026-10-27']]){
  const result=await executeCommand([...args,'--format',format],{capabilities:SIS_CAPABILITIES,handlers:createSisHandlers(async()=>reader)});assert.equal(result.exitCode,0,result.stdout);assert.match(result.stdout,/2610/);
 }
});
test('unpublished_grade_is_not_empty_history: unverified academic records remain pending',async()=>{
 for(const command of ['history','grades']){let calls=0;const result=await executeCommand(['sis',command],{sessionRunner:async()=>{calls++;throw Error('must not open');}});assert.equal(result.exitCode,8);assert.equal(JSON.parse(result.stdout).error.code,'CAPABILITY_PENDING');assert.equal(calls,0);}
});
test('default SIS handlers are wired behind verified capabilities',async()=>{
 const {CliFailure}=await import('../src/core/errors.js');let opened=0;const result=await executeCommand(['sis','terms'],{env:{HKUSTGZ_CLI_HOME:'/tmp/hkustgz-sis-uncreated-'+Date.now()},sessionRunner:async()=>{opened++;throw new CliFailure('LOGIN_REQUIRED');}});assert.equal(result.exitCode,3,result.stdout);assert.equal(opened,1);
});
