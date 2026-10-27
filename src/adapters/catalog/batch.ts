import {z} from 'zod';import {CliFailure} from '../../core/errors.js';import {HEADERS} from './parser.js';import type {CatalogSnapshot} from './model.js';
const number=z.number().nonnegative().nullable();const text=z.string();
const instructor=z.object({instructorRoleInd:text,instructorName:text});
const meeting=z.object({startDate:text.nullable(),endDate:text.nullable(),meetingStartTime:text.nullable(),meetingEndTime:text.nullable(),weekDay:text.nullable(),facilityName:text.nullable(),instructorList:z.array(instructor)});
const section=z.object({termId:text,classNbr:text,classSection:text,notes:text.nullable(),addConsentInd:text.nullable().optional(),dropConsentInd:text.nullable().optional(),enrollmentCapacity:number,enrollmentNbr:number,availableNbr:number,waitListNbr:number,meetingInfoList:z.array(meeting)});
const course=z.object({courseInfo:z.object({crseCode:text,crseShortDesc:text,totalCredits:number}),classSections:z.array(section).min(1)});
const schema=z.object({code:z.literal('0'),totalSize:z.number().int().nonnegative(),totalPage:z.literal(1),nextPage:z.literal(false),pageIndex:z.literal(1),data:z.array(course)});
/** An immutable, decoded response batch produced by the school's own normal UI request. */
export function snapshotFromBatch(value:unknown,termId:string,requestTerm:string,subject:string):CatalogSnapshot{
 if(value&&typeof value==='object'&&'readError'in value&&['LOGIN_REQUIRED','PERMISSION_DENIED','RATE_LIMITED','QUERY_TIMEOUT','NETWORK_REQUIRED','ADAPTER_CHANGED'].includes(String(value.readError)))throw new CliFailure(String(value.readError));
 const result=schema.safeParse(value);if(!result.success||result.data.totalSize!==result.data.data.length)throw new CliFailure('ADAPTER_CHANGED');
 const data=result.data;
 return{termId,subject,total:data.totalSize,headers:HEADERS,cards:data.data.map(course=>({
  header:`${course.courseInfo.crseCode} - ${course.courseInfo.crseShortDesc} [${course.courseInfo.totalCredits??'unknown'} Credits]`,
  rows:course.classSections.flatMap(section=>{
   if(section.termId!==requestTerm)throw new CliFailure('ADAPTER_CHANGED','The source section belongs to a different term than its request.');
   const meetings=section.meetingInfoList.length?section.meetingInfoList:[null];
   return meetings.map(meeting=>{
    const people=meeting?.instructorList??[];
    const date=meeting?`${meeting.startDate||'unknown'} - ${meeting.endDate||'unknown'}; weekday ${meeting.weekDay||'unknown'} ${meeting.meetingStartTime||'unknown'} - ${meeting.meetingEndTime||'unknown'}`:'TBA';
    const values=[`${section.classSection} (${section.classNbr})`,date,meeting?.facilityName??'unknown',people.filter(p=>p.instructorRoleInd==='PI').map(p=>p.instructorName).join('\n'),people.filter(p=>['TA','IA','GTA'].includes(p.instructorRoleInd)).map(p=>p.instructorName).join('\n'),...(['enrollmentCapacity','enrollmentNbr','availableNbr','waitListNbr'] as const).map(k=>String(section[k]??'-')),[section.notes??'',...([section.addConsentInd,section.dropConsentInd].some(v=>v&&v!=='No Consent')?['Consent']:[])].filter(Boolean).join('\n')];
    return values.map(text=>({text,rowspan:1}));
   });
  })
 }))};
}
