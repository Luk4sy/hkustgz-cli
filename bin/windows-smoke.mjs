#!/usr/bin/env node
// Explicit check only; not invoked by installation. No school URL/profile inputs.
if(process.platform!=='win32'){
 process.stdout.write(JSON.stringify({ok:false,error:{code:'WINDOWS_SMOKE_WRONG_PLATFORM'}})+'\n');process.exitCode=2;
}else if(Number(process.versions.node.split('.')[0])!==24){
 process.stdout.write(JSON.stringify({ok:false,error:{code:'NODE_UNSUPPORTED'}})+'\n');process.exitCode=8;
}else{
 let result;
 try{const {runLoopbackSmoke}=await import('../dist/cli/windows-smoke.js');result=await runLoopbackSmoke();}catch{result={ok:false,error:{code:'WINDOWS_SMOKE_FAILED'}};}
 process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.ok?0:1;
}
