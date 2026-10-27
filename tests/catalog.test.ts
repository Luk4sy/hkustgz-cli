import assert from 'node:assert/strict';import test from 'node:test';
import {parseCatalogPage} from '../src/adapters/catalog/parser.js';
import {queryCatalog} from '../src/adapters/catalog/index.js';
import {PublicCatalogCache} from '../src/adapters/catalog/cache.js';
import {fixture} from './fixtures/catalog/page.js';
const options=()=>({refresh:false,deadlineMs:Date.now()+90000});
test('meetings_preserve_merged_rows and available_is_not_recalculated',()=>{
 const [course]=parseCatalogPage(fixture);assert.equal(course?.sections[0]?.available,0);assert.equal(course?.sections[0]?.meetings.length,2);assert.deepEqual(course?.sections[0]?.meetings.map(x=>x.location),['Room A','Room B']);assert.equal(course?.termId,'2026-27 Fall');assert.equal(course?.credits,3);
});
test('schema drift or virtual subset cannot become a complete subject',()=>{
 assert.throws(()=>parseCatalogPage({...fixture,total:2}));assert.throws(()=>parseCatalogPage({...fixture,headers:['changed']}));assert.throws(()=>parseCatalogPage({...fixture,cards:[{...fixture.cards[0]!,rows:[]}]}));
});
test('search_is_applied locally to proven subject pages',async()=>{
 const reader={subjects:['IPEN'],read:async()=>fixture};const result=await queryCatalog({text:'Policy'},options(),reader);assert.equal(result.data.items.length,1);assert.equal(result.meta.coverage,'complete');assert.equal((await queryCatalog({text:'no-match'},options(),reader)).data.items.length,0);
});
test('virtual_list_is_not_full_catalog and later failure preserves trustworthy subset',async()=>{
 const reader={subjects:['IPEN','AIAA'],read:async(subject:string)=>{if(subject==='AIAA')throw Error('changed');return fixture;}};
 const result=await queryCatalog({text:'IPEN'},options(),reader);assert.equal(result.ok,false);assert.equal(result.meta.coverage,'partial');assert.equal(result.data.items.length,1);
});
test('public cache requires evidence, honors refresh and five minute TTL',()=>{
 const cache=new PublicCatalogCache<string>();cache.put('x','secret',0,false);assert.equal(cache.get('x',1,false),undefined);cache.put('x','public',0,true);assert.equal(cache.get('x',299999,false),'public');assert.equal(cache.get('x',300000,false),undefined);assert.equal(cache.get('x',1,true),undefined);
});
test('search filters after bounding source rows and reports actual rows read',async()=>{
 const other={...fixture.cards[0]!,header:'IPEN5200 - Another Synthetic [3 Credits]'};
 const reader={subjects:['IPEN'],read:async()=>({...fixture,total:2,cards:[fixture.cards[0]!,other]})};
 const result=await queryCatalog({text:'Policy'},options(),reader);assert.equal(result.meta.recordsRead,2);assert.equal(result.meta.returnedCount,1);
 const limited=await queryCatalog({text:'Synthetic'},{...options(),limit:1},reader);assert.equal(limited.ok,false);assert.equal(limited.meta.truncationReason,'limit');
});
test('term mismatch and malformed numeric source values fail closed',async()=>{
 await assert.rejects(queryCatalog({text:'Policy',termId:'other'},options(),{subjects:['IPEN'],read:async()=>fixture}));
 const changed=structuredClone(fixture);changed.cards[0]!.rows[0]![5]!.text='unknown-new-format';assert.throws(()=>parseCatalogPage(changed));
});
test('repeated section ids cannot silently discard conflicting source quotas or restrictions',()=>{
 const changed=structuredClone(fixture);const first=changed.cards[0]!.rows[0]!.map(c=>({...c,rowspan:1}));
 const second=structuredClone(first);second[7]!.text='unknown-new-format';changed.cards[0]!.rows=[first,second];assert.throws(()=>parseCatalogPage(changed));
 second[7]!.text='0';second[9]!.text='New restriction';assert.throws(()=>parseCatalogPage(changed));
});
