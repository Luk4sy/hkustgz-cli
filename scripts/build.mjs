import {rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
rmSync(new URL('../dist/',import.meta.url),{recursive:true,force:true});
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/typescript/bin/tsc',import.meta.url)),'-p','tsconfig.build.json'],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
if(process.exitCode===0){const docs=spawnSync(process.execPath,[fileURLToPath(new URL('./build-skill-docs.mjs',import.meta.url))],{cwd:root,stdio:'inherit'});if(docs.error)throw docs.error;process.exitCode=docs.status??1;}
