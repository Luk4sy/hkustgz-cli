export interface CatalogMeeting {dateAndTime:string;location:string|null;instructors:string[];assistants:string[]}
export interface CatalogSection {id:string;label:string;meetings:CatalogMeeting[];quota:number|null;enrolled:number|null;available:number|null;waitlisted:number|null;restrictions:string[]}
export interface CatalogCourse {id:string;code:string;title:string;credits:number|null;termId:string;sections:CatalogSection[]}
export interface CatalogSnapshot {termId:string;subject:string;total:number;headers:string[];cards:Array<{header:string;rows:Array<Array<{text:string;rowspan:number}>>}>}
export interface CatalogReader {subjects:string[];read:(subject:string,signal:AbortSignal)=>Promise<CatalogSnapshot>}
