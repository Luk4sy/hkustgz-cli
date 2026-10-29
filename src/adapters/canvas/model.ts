import type {DateRange} from '../../core/contracts.js';
export interface CanvasCourse{id:string;code:string|null;name:string;termName:string|null;url:string}
export interface CanvasWire{url:string;body:unknown;link:string|null}
export type CanvasKind='assignments'|'announcements'|'agenda';
export interface CanvasReader{courses:(signal:AbortSignal)=>Promise<CanvasCourse[]>;initial:(kind:CanvasKind,course:string|undefined,range:DateRange|undefined,signal:AbortSignal)=>Promise<CanvasWire>;page:(url:string,kind:CanvasKind,signal:AbortSignal)=>Promise<CanvasWire>}
