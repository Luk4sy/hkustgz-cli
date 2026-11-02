import test from 'node:test';
import assert from 'node:assert/strict';
import {createTestSymlink} from './helpers/symlink.js';

const permissionError=()=>Object.assign(new Error('fixture symlink privilege unavailable'),{code:'EPERM'});
for(const code of ['EPERM','EACCES'])test(`optional Windows file symlink reports explicit skip for ${code}`,async()=>{
 const skipped:string[]=[];
 const created=await createTestSymlink({skip:reason=>skipped.push(reason)},'target','alias','file',{
  platform:'win32',required:false,createLink:async()=>{throw Object.assign(new Error('privilege unavailable'),{code});}
 });
 assert.equal(created,false);assert.equal(skipped.length,1);assert.match(skipped[0]!,/Windows.*file.*symlink.*privilege/i);
});
test('strict CI cannot turn unavailable file symlink coverage into a skip',async()=>{
 const skipped:string[]=[];
 await assert.rejects(createTestSymlink({skip:reason=>skipped.push(reason)},'target','alias','file',{
  platform:'win32',required:true,createLink:async()=>{throw permissionError();}
 }),/required.*symlink/i);
 assert.deepEqual(skipped,[]);
});
test('other link errors, directory errors and POSIX permission errors remain failures',async()=>{
 for(const [platform,kind,code] of [['win32','file','ENOENT'],['win32','dir','EPERM'],['darwin','file','EPERM']] as const){
  const failure=Object.assign(new Error('unexpected fixture failure'),{code});
  await assert.rejects(createTestSymlink({skip:()=>assert.fail('must not skip')},'target','alias',kind,{
   platform,required:false,createLink:async()=>{throw failure;}
  }),error=>error===failure);
 }
});
test('CI environment flag requires file symlink coverage when no override is provided',async()=>{
 const original=process.env.HKUSTGZ_REQUIRE_SYMLINK_TESTS;
 process.env.HKUSTGZ_REQUIRE_SYMLINK_TESTS='1';
 try{
  await assert.rejects(createTestSymlink({skip:()=>assert.fail('CI must not skip')},'target','alias','file',{
   platform:'win32',createLink:async()=>{throw permissionError();}
  }),/required.*symlink/i);
 }finally{
  if(original===undefined)delete process.env.HKUSTGZ_REQUIRE_SYMLINK_TESTS;else process.env.HKUSTGZ_REQUIRE_SYMLINK_TESTS=original;
 }
});
