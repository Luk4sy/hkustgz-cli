import {z} from 'zod';import {CliFailure} from '../../core/errors.js';
export const ORIGIN='https://hkust-gz.instructure.com';const id=z.union([z.number().int().positive(),z.string().regex(/^\d+$/)]);const str=z.string().nullable().optional();const fail=():never=>{throw new CliFailure('ADAPTER_CHANGED');};
export function parseLink(header:string|null,current:string):string|null{
 if(header===null)return null;
 if(!header.trim()||/[\u0000-\u0008\u000a-\u001f\u007f]/.test(header))return fail();
 const parts:string[]=[];let start=0,quoted=false,angle=false,escaped=false;
 for(let i=0;i<header.length;i++){const c=header[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'&&!angle)quoted=true;
  else if(c==='<'){if(angle)return fail();angle=true;}
  else if(c==='>'){if(!angle)return fail();angle=false;}
  else if(c===','&&!angle){parts.push(header.slice(start,i));start=i+1;}
 }
 if(quoted||angle||escaped)return fail();parts.push(header.slice(start));
 const next:string[]=[];
 for(const part of parts){const entry=/^\s*<([^<>]+)>([\s\S]*)$/.exec(part);if(!entry)return fail();let rest=entry[2]!;let rels:string[]|null=null;
  while(rest.trim()){
   const param=/^\s*;\s*([!#$%&'*+.^_`|~\w-]+)(?:\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([!#$%&'*+.^_`|~\w:-]+)))?/.exec(rest);
   if(!param)return fail();rest=rest.slice(param[0].length);const name=param[1]!.toLowerCase();
   if(name==='anchor')return fail();
   if(name==='rel'){if(rels!==null)return fail();const value=param[2]!==undefined?param[2].replace(/\\(.)/g,'$1'):param[3];if(!value?.trim())return fail();rels=value.trim().toLowerCase().split(/\s+/);if(new Set(rels).size!==rels.length)return fail();}
  }
  if(!rels||!rels.some(r=>['current','first','last','prev','next'].includes(r)))return fail();
  if(rels.includes('next'))next.push(entry[1]!);
 }
 if(!next.length)return null;if(next.length!==1)return fail();
 let u:URL,base:URL;try{u=new URL(next[0]!,current);base=new URL(current);}catch{return fail();}
 if(u.origin!==ORIGIN||u.pathname!==base.pathname||u.username||u.password||u.hash)return fail();const a=new URLSearchParams(u.search),b=new URLSearchParams(base.search);a.delete('page');b.delete('page');a.sort();b.sort();if(a.toString()!==b.toString()||u.searchParams.getAll('page').length!==1||!/^\d+$/.test(u.searchParams.get('page')??'')||Number(u.searchParams.get('page'))<=Number(base.searchParams.get('page')??1))return fail();return u.toString();
}
function timestamp(s:string|null|undefined){if(s===null||s===undefined)return null;if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(s)||!Number.isFinite(Date.parse(s)))return fail();return s;}
function url(s:string|null|undefined){if(!s)return null;const u=new URL(s,ORIGIN);if(u.origin!==ORIGIN||u.username||u.password)return fail();u.search='';return u.toString();}
export function parseAssignments(value:unknown,courseId:string){const schema=z.array(z.object({assignments:z.array(z.object({id,course_id:id,name:z.string(),due_at:str,html_url:str}))}));const r=schema.safeParse(value);if(!r.success)return fail();return r.data.flatMap(g=>g.assignments.map(a=>{if(String(a.course_id)!==courseId)return fail();return{id:String(a.id),courseId,title:a.name,effectiveDueAt:timestamp(a.due_at),dueAtSource:'unknown' as const,submissionStatus:'unknown' as const,graded:null,markedComplete:null,url:url(a.html_url)};}));}
export function parseAnnouncements(value:unknown,courseId:string){const r=z.array(z.object({id,title:z.string(),posted_at:str,is_announcement:z.literal(true),message:z.string(),html_url:str})).safeParse(value);if(!r.success)return fail();return r.data.map(a=>({id:String(a.id),courseId,title:a.title,postedAt:timestamp(a.posted_at),bodyHtml:a.message,url:url(a.html_url)}));}
export function parsePlanner(value:unknown){const r=z.array(z.object({course_id:id.nullable().optional(),plannable_id:id,plannable_type:z.string(),plannable_date:z.string(),plannable:z.object({title:z.string()}),planner_override:z.object({marked_complete:z.boolean().optional()}).nullable().optional(),submissions:z.object({submitted:z.boolean().optional(),graded:z.boolean().optional()}).nullable().optional(),html_url:str})).safeParse(value);if(!r.success)return fail();return r.data.map(p=>({id:String(p.plannable_id),courseId:p.course_id===undefined||p.course_id===null?null:String(p.course_id),itemType:p.plannable_type,title:p.plannable.title,startsAt:timestamp(p.plannable_date),markedComplete:p.planner_override?.marked_complete??null,submissionStatus:p.submissions?.submitted===true?'submitted':p.submissions?.submitted===false?'not_submitted':'unknown',graded:p.submissions?.graded??null,url:url(p.html_url)}));}
