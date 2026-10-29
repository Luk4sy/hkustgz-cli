import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {fixture,pack,run,seedCache,tree} from './helpers/package.js';

test('installed_bin_is_cwd_independent and install_has_no_campus_or_client_side_effects',async()=>{
  const f=fixture();try{
    const p=pack(f);await seedCache(f.cache);
    const home=join(f.root,'student home'),prefix=join(f.root,'prefix'),cwd=join(f.root,'unrelated cwd');
    mkdirSync(home);mkdirSync(cwd);
    const guard=join(f.root,'guard.cjs'),events=join(f.root,'events.log');
    writeFileSync(guard,`const fs=require('node:fs');const log=${JSON.stringify(events)};const deny=(kind)=>function(){fs.appendFileSync(log,kind+'\\n');throw Error('Unexpected install side effect: '+kind)};for(const m of ['http','https']){const o=require('node:'+m);o.request=deny(m);o.get=deny(m)}require('node:net').Socket.prototype.connect=deny('socket');for(const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])require('node:child_process')[k]=deny('process:'+k);`);
    const env={...f.env,HOME:home,CODEX_HOME:join(home,'codex'),HKUSTGZ_CLI_HOME:join(home,'campus'),npm_config_userconfig:join(home,'npmrc'),npm_config_globalconfig:join(home,'global-npmrc'),NODE_OPTIONS:`--require=${JSON.stringify(guard)}`};
    const before=tree(home);
    run('npm',['install','--global','--prefix',prefix,'--offline','--no-audit','--no-fund',p.artifact],cwd,env);
    assert.deepEqual(tree(home),before,'install changed student home');
    assert.equal(existsSync(events),false,'install attempted network or subprocess');
    const installed=join(prefix,'lib/node_modules/hkustgz-cli');
    assert.equal(existsSync(join(installed,'src')),false);
    assert.equal(existsSync(join(prefix,'lib/node_modules/tsx')),false);
    assert.equal(existsSync(join(installed,'node_modules/tsx')),false);
    const bin=join(prefix,'bin/hkustgz-cli');
    assert.equal(run(bin,['--version'],cwd,env).trim(),'0.1.0-alpha.1');
    assert.match(run(bin,['--help'],cwd,env),/catalog/);
    const result=JSON.parse(run(bin,['capabilities'],cwd,env));
    assert.equal(result.data.items.length,19);
    assert.equal(result.data.items.filter((v:{state:string})=>v.state==='verified').length,13);
    assert.equal(result.data.items.filter((v:{state:string})=>v.state==='pending').length,6);
    assert.equal(existsSync(events),false);
    assert.deepEqual(tree(home),before);
    assert.equal(realpathSync(JSON.parse(run(bin,['skill','path'],cwd,env)).data.path),realpathSync(join(installed,'skills/hkustgz-cli')));
    assert.equal(JSON.parse(run(bin,['skill','status'],cwd,env)).data.state,'absent');
    run(bin,['skill','install','--target','codex'],cwd,env);
    assert.equal(JSON.parse(run(bin,['skill','status'],cwd,env)).data.state,'current');
    run(bin,['skill','uninstall','--target','codex'],cwd,env);
    assert.equal(existsSync(join(home,'codex/skills/hkustgz-cli')),false);
    assert.equal(existsSync(join(home,'codex/config.toml')),false);
    assert.equal(existsSync(events),false);
    const doctor=JSON.parse(run(bin,['doctor'],cwd,env));
    assert.equal(doctor.data.capabilities.verified,13);assert.equal(existsSync(join(home,'campus')),false);assert.equal(existsSync(events),false);assert.equal(existsSync(join(home,'codex/config.toml')),false);
    const pkg=JSON.parse(readFileSync(join(installed,'package.json'),'utf8'));
    for(const hook of ['preinstall','install','postinstall','prepare'])assert.equal(pkg.scripts?.[hook],undefined);
  }finally{rmSync(f.root,{recursive:true,force:true});}
});
