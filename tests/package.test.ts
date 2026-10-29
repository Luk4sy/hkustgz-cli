import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {fixture,pack} from './helpers/package.js';

test('tarball_is_allowlisted and builds from source without preexisting dist',()=>{
  const f=fixture();try{
    mkdirSync(join(f.checkout,'dist'),{recursive:true});
    writeFileSync(join(f.checkout,'dist','stale-secret.js'),'PRIVATE_PACKAGE_CANARY');
    const p=pack(f);
    assert.ok(p.files.includes('dist/cli/main.js'),'pack must build runtime');
    for(const path of ['docs/installation.md','docs/cli-contract.md','docs/errors.md','skills/hkustgz-cli/SKILL.md','LICENSE','docs/windows.md','bin/windows-smoke.mjs'])assert.ok(p.files.includes(path),`missing ${path}`);
    for(const path of p.files)assert.match(path,/^(package\.json|README\.md|LICENSE|skills\/hkustgz-cli\/(SKILL\.md|references\/(commands|errors|examples|privacy)\.md)|bin\/(hkustgz-cli|windows-smoke)\.mjs|docs\/(installation|cli-contract|errors|windows)\.md|dist\/(cli|core|session|adapters)\/[\w/.-]+\.(js|d\.ts))$/);
    assert.ok(!p.files.includes('dist/stale-secret.js'));
    assert.equal(JSON.parse(readFileSync(join(p.packageRoot,'package.json'),'utf8')).license,'MIT');
    assert.match(readFileSync(join(p.packageRoot,'LICENSE'),'utf8'),/Permission is hereby granted/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('private_markers_excluded from archive contents',()=>{
  const f=fixture();try{
    for(const path of ['.hkustgz-cli/profile/Cookies','.superpowers/raw.log','tests/secret.ts','research/raw.har','dist/cli/leak.har','dist/cli/leak.js.map']){
      const full=join(f.checkout,path);mkdirSync(join(full,'..'),{recursive:true});writeFileSync(full,'PRIVATE_PACKAGE_CANARY');
    }
    const p=pack(f);
    for(const path of p.files)assert.ok(!readFileSync(join(p.packageRoot,path),'utf8').includes('PRIVATE_PACKAGE_CANARY'),path);
    assert.ok(!existsSync(join(p.packageRoot,'node_modules')));
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
