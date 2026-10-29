import assert from 'node:assert/strict';
import test from 'node:test';
import {executeCommand} from '../src/cli/main.js';
import {probes} from './helpers/doctor.js';
test('doctor_redacts_home_and_identity in JSON and table by excluding raw probe payloads',async()=>{
 for(const format of ['json','table']){
 const result=await executeCommand(['doctor','--format',format],{env:{HOME:'/Users/private-student',CODEX_HOME:'/Users/private-student/codex'},doctorProbes:{...probes,browser:async()=>({selected:'chrome',chromeAvailable:false,privatePath:'/Users/private-student/profile',cookie:'SECRET'})}});
 assert.equal(result.exitCode,8);assert.ok(!result.stdout.includes('private-student'));assert.ok(!result.stdout.includes('SECRET'));assert.match(result.stdout,/CHROME_MISSING/);assert.equal(result.stderr,'');
 }
});
