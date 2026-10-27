export interface Term {id:string;name:string;isCurrent:boolean|null}
export interface SourceTerm extends Term {startDate:string|null;endDate:string|null}
export interface Meeting {id:string;dateFrom:string|null;dateTo:string|null;weekday:number|null;startTime:string|null;endTime:string|null;location:string|null;instructors:string[];exceptionsCoverage:'unknown';exceptions:[]}
export interface TimetableCourse {termId:string;courseId:string;courseCode:string;courseName:string|null;sectionId:string;sectionLabel:string;credits:number|null;enrollmentStatus:string|null;meetings:Meeting[]}
export interface Timetable {termId:string;termName:string;items:TimetableCourse[]}
export interface TodayCourses extends Timetable {date:string;unresolved:TimetableCourse[]}
export interface SisReader {current:(signal:AbortSignal)=>Promise<unknown>;terms:(page:number,signal:AbortSignal)=>Promise<unknown>;timetable:(term:SourceTerm,signal:AbortSignal)=>Promise<unknown>}
