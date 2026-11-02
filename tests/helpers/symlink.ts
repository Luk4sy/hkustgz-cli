import {symlink} from 'node:fs/promises';

type LinkKind='dir'|'file';
interface LinkOptions {
 platform?:NodeJS.Platform;
 required?:boolean;
 createLink?:typeof symlink;
}
/** Only an unavailable Windows file-link privilege is optional outside strict CI. */
export async function createTestSymlink(
 context:{skip(reason:string):void},target:string,path:string,kind:LinkKind,options:LinkOptions={}
):Promise<boolean>{
 const platform=options.platform??process.platform;
 const required=options.required??process.env.HKUSTGZ_REQUIRE_SYMLINK_TESTS==='1';
 try{
  await(options.createLink??symlink)(target,path,platform==='win32'&&kind==='dir'?'junction':kind);
  return true;
 }catch(error){
  const code=(error as NodeJS.ErrnoException).code;
  if(platform!=='win32'||kind!=='file'||!['EPERM','EACCES'].includes(code??''))throw error;
  if(required)throw new Error('Required file symlink coverage is unavailable: Windows symlink privilege is missing.',{cause:error});
  context.skip('Windows file symlink privilege unavailable; this link-specific security assertion was not executed. CI requires it.');
  return false;
 }
}
