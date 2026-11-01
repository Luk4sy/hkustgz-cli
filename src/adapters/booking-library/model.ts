export interface Floor {id:string;name:string}
export interface Room {id:string;name:string;floorId:string;floorName:string;capacity:number|null;type:string|null}
export interface Interval {start:string;end:string}
export interface RoomAvailability {roomId:string;date:string;openIntervals:Interval[];busyIntervals:Interval[];availableIntervals:Interval[];unknownIntervals:Interval[];rulesCoverage:'complete'|'partial'|'unknown';restrictions:string[]}
export interface OwnBooking {id:string;rooms:Array<{id:string;name:string}>;startsAt:string;endsAt:string;statusCode:number}
export interface LibraryReader {inspection?:import('./detail.js').LibraryInspectionReader;mine?:(range:import('../../core/contracts.js').DateRange,page:number,signal:AbortSignal)=>Promise<unknown>;floors:(signal:AbortSignal)=>Promise<unknown>;page:(floorId:string,date:string,page:number,signal:AbortSignal)=>Promise<unknown>}
