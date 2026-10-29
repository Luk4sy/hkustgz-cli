import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export interface BundleInfo {name:string;version:string;schemaVersion:'1';root:string;files:string[]}
export async function readBundleInfo():Promise<BundleInfo>{
 const pkg=JSON.parse(fs.readFileSync(new URL('../../../package.json',import.meta.url),'utf8')) as {name:string;version:string};
 // src/cli/skill and dist/cli/skill have the same depth in the package.
 return{name:pkg.name,version:pkg.version,schemaVersion:'1',root:fileURLToPath(new URL('../../../skills/hkustgz-cli/',import.meta.url)),files:['SKILL.md','references/commands.md','references/errors.md','references/examples.md','references/privacy.md']};
}
