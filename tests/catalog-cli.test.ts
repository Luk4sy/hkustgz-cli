import assert from 'node:assert/strict';import test from 'node:test';import {executeCommand} from '../src/cli/main.js';
import {createCatalogHandlers} from '../src/adapters/catalog/index.js';import {CATALOG_CAPABILITIES} from '../src/adapters/catalog/manifest.js';import {fixture} from './fixtures/catalog/page.js';
test('catalog search and detail use the shared CLI result contract in both formats',async()=>{
 const handlers=createCatalogHandlers(async()=>({subjects:['IPEN'],read:async()=>fixture}));
 for(const format of ['json','table']){
  const search=await executeCommand(['catalog','search','Policy','--format',format],{handlers,capabilities:CATALOG_CAPABILITIES});assert.equal(search.exitCode,0,search.stdout);assert.match(search.stdout,/IPEN5100/);assert.match(search.stdout,/15.*20/);
 }
 const result=await executeCommand(['catalog','course','2026-27 Fall:IPEN5100'],{handlers,capabilities:CATALOG_CAPABILITIES});assert.equal(result.exitCode,0,result.stdout);assert.equal(JSON.parse(result.stdout).data.code,'IPEN5100');
});
test('malformed catalog identity is rejected before launching a browser',async()=>{
 let opened=0;const result=await executeCommand(['catalog','course','not-a-course-id'],{sessionRunner:async()=>{opened++;throw Error('must not launch');}});assert.equal(result.exitCode,2,result.stdout);assert.equal(opened,0);
});
