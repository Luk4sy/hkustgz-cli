import {win32} from 'node:path';
import {CliFailure} from './errors.js';
/** Local drive paths only; no implicit current-drive, network, device or stream aliases. */
export function assertWindowsLocalPath(input:string):void{
 const parts=input.slice(3).split(/[\\/]/).filter(Boolean);
 if(!/^[a-z]:[\\/]/i.test(input)||!win32.isAbsolute(input)||input.slice(2).includes(':')||/[\u0000-\u001f]/.test(input)||parts.some(part=>part==='.'||part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw new CliFailure('UNSAFE_SKILL_TARGET');
}
