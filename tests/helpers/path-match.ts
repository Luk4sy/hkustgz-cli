/** Compare fixture-owned paths in fault hooks without assuming Unix separators. */
export function sameFixturePath(actual:unknown,expected:string):boolean{return String(actual).replaceAll('\\','/')===expected.replaceAll('\\','/');}
