import {z} from 'zod';import {CliFailure} from '../../core/errors.js';import type {CatalogCourse,CatalogSection,CatalogSnapshot} from './model.js';
export const HEADERS=['Section','Date & Time','Location','Instructor','TA/IA/GTA','Quota','Enrol','Avail','Wait','Remarks'];
const rawSchema=z.object({termId:z.string().min(1),subject:z.string().regex(/^[A-Z]+$/),total:z.number().int().nonnegative(),headers:z.array(z.string()),cards:z.array(z.object({header:z.string(),rows:z.array(z.array(z.object({text:z.string(),rowspan:z.number().int().min(1)})))}))});
const fail=():never=>{throw new CliFailure('ADAPTER_CHANGED');};
const number=(text:string):number|null=>/^\d+$/.test(text)?Number(text):['','-','TBA','N/A'].includes(text)?null:fail();
const lines=(text:string)=>text.split('\n').map(x=>x.trim()).filter(Boolean);
export function parseCatalogPage(input:CatalogSnapshot):CatalogCourse[]{
 const result=rawSchema.safeParse(input);if(!result.success)return fail();const raw=result.data;
 if(raw.headers.join('|')!==HEADERS.join('|')||raw.total!==raw.cards.length)return fail();
 const ids=new Set<string>();
 return raw.cards.map(card=>{
  const match=card.header.match(/^([A-Z]+\d+[A-Z]*)\s*-\s*(.*?)\s*\[(\d+(?:\.\d+)?|unknown) Credits?\]/s);if(!match||!match[1]!.startsWith(raw.subject)||!card.rows.length)return fail();
  const code=match[1]!;if(ids.has(code))return fail();ids.add(code);const id=raw.termId+':'+code;
  const sections:CatalogSection[]=[];const carries:Array<{text:string;left:number}|undefined>=[];
  for(const cells of card.rows){
   let index=0;const row:string[]=[];
   for(let col=0;col<10;col++){
    const carry=carries[col];if(carry&&carry.left>0){row.push(carry.text);carry.left--;}
    else{const cell=cells[index++];if(!cell)return fail();row.push(cell.text.trim());carries[col]={text:cell.text.trim(),left:cell.rowspan-1};}
   }
   if(index!==cells.length)return fail();
   const section=row[0]!.match(/^(.+?)\s*\((\d+)\)$/);if(!section)return fail();
   const sid=id+':'+section[2];let current=sections.find(x=>x.id===sid);
   const fields={label:section[1]!,quota:number(row[5]!),enrolled:number(row[6]!),available:number(row[7]!),waitlisted:number(row[8]!),restrictions:lines(row[9]!)};
   if(!current){current={id:sid,meetings:[],...fields};sections.push(current);}
   else if(Object.entries(fields).some(([key,value])=>JSON.stringify(current![key as keyof CatalogSection])!==JSON.stringify(value)))return fail();
   current.meetings.push({dateAndTime:row[1]!,location:row[2]||null,instructors:lines(row[3]!),assistants:lines(row[4]!)});
  }
  if(carries.some(x=>x&&x.left>0))return fail();
  return{id,code,title:match[2]!.trim(),credits:match[3]==='unknown'?null:Number(match[3]),termId:raw.termId,sections};
 });
}
