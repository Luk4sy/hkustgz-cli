import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, stat, writeFile, symlink, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDataPaths, ensureDataPaths } from '../src/session/paths.js';
import { acquireProfileLock } from '../src/session/lock.js';

test('dedicated data paths and private permissions do not depend on current directory', async t => {
  const root=await mkdtemp(join(tmpdir(),'hkust-paths-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const paths=resolveDataPaths({HKUSTGZ_CLI_HOME:join(root,'owned')});
  assert.equal(paths.profile,join(root,'owned','profiles'));
  await ensureDataPaths(paths);
  if(process.platform!=='win32')assert.equal((await stat(paths.root)).mode&0o777,0o700);
});
test('unowned data and symlink homes are refused without changing their files', async t=>{
  const root=await mkdtemp(join(tmpdir(),'hkust-owner-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(join(root,'personal.txt'),'keep');
  await assert.rejects(ensureDataPaths(resolveDataPaths({HKUSTGZ_CLI_HOME:root})),{code:'INVALID_DATA_HOME'});
  assert.equal(await readFile(join(root,'personal.txt'),'utf8'),'keep');
  const link=root+'-link';await symlink(root,link);t.after(()=>rm(link,{force:true}));
  await assert.rejects(ensureDataPaths(resolveDataPaths({HKUSTGZ_CLI_HOME:link})),{code:'INVALID_DATA_HOME'});
});
test('same profile rejected as busy, independent browser profiles remain separate',async t=>{
  const root=await mkdtemp(join(tmpdir(),'hkust-lock-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const profile=join(root,'chrome');const first=await acquireProfileLock(profile);
  await assert.rejects(acquireProfileLock(profile),{code:'PROFILE_BUSY'});
  const other=await acquireProfileLock(join(root,'edge'));await other.release();
  await first.release();const next=await acquireProfileLock(profile);await next.release();
});
test('stale or unrecognized locks are never automatically removed',async t=>{
  const root=await mkdtemp(join(tmpdir(),'hkust-stale-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'chrome.lock'));await writeFile(join(root,'chrome.lock','foreign'),'keep');
  await assert.rejects(acquireProfileLock(join(root,'chrome')),{code:'PROFILE_BUSY'});
  assert.equal(await readFile(join(root,'chrome.lock','foreign'),'utf8'),'keep');
});
test('unexpected lock contents retain ownership metadata on failed release',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hkust-lock-owner-'));t.after(()=>rm(root,{recursive:true,force:true}));const profile=join(root,'chrome');
 const lock=await acquireProfileLock(profile);await writeFile(join(profile+'.lock','foreign'),'keep');
 await assert.rejects(lock.release(),{code:'CLEANUP_FAILED'});assert.match(await readFile(join(profile+'.lock','owner.json'),'utf8'),/hkustgz-cli/);
});
