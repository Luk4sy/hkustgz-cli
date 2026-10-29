import assert from 'node:assert/strict';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
import {probes} from './helpers/doctor.js';
test('healthy_doctor_exits_zero without invoking session runner',async()=>{
 const result=await executeCommand(['doctor'],{doctorProbes:probes,sessionRunner:async()=>{throw Error('no browser');}});assert.equal(result.exitCode,0);const value=JSON.parse(result.stdout);assert.equal(value.data.capabilities.verified,13);assert.equal(value.data.checks.find((v:{id:string})=>v.id==='skill').status,'warn');
});
test('missing_chrome_is_actionable and unsupported runtime is a structured failure',async()=>{
 for(const override of [{browser:async()=>({selected:'chrome' as const,chromeAvailable:false})},{runtime:()=>({nodeVersion:'v22.0.0',platform:'darwin',arch:'arm64'})},{runtime:()=>({nodeVersion:'v24.20.0',platform:'linux',arch:'x64'})}]){
 const result=await executeCommand(['doctor'],{doctorProbes:{...probes,...override}});assert.equal(result.exitCode,8);const value=JSON.parse(result.stdout);assert.equal(value.error.code,'ENVIRONMENT_NOT_READY');assert.ok(value.error.details.checks.some((v:{status:string})=>v.status==='fail'));assert.match(value.error.remediation,/doctor|requirements/i);
 }
});
test('busy_or_unknown_lock_is_not_removed and old Skill is warning',async()=>{
 for(const data of ['busy','unknown-lock'] as const){const result=await executeCommand(['doctor'],{doctorProbes:{...probes,data:async()=>data,skill:async()=>({state:'outdated',installedVersion:'0.0.1',expectedVersion:'0.1.0-alpha.1'})}});assert.equal(result.exitCode,0);assert.ok(JSON.parse(result.stdout).data.checks.filter((v:{status:string})=>v.status==='warn').length>=2);}
});
