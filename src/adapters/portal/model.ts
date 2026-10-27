import type {DateRange} from '../../core/contracts.js';
export interface PortalApp {id:string;name:string;url:string|null}
export interface NoticeSource {id:string;name:string;kind:'portal'|'mnews';siteId?:number;columnId?:number}
export interface PortalNotice {id:string;source:string;sourceId:string;title:string;publishedAt:string|null;category:string|null;url:string|null}
export interface PortalNoticeDetail extends PortalNotice {bodyText:string}
export interface PortalCategory {id:number;name:string}
export interface PortalEvent {id:string|null;source:string;sourceId:string;title:string|null;startsAt:string|null;endsAt:string|null;location:string|null;courseCode:string|null;sectionId:string|null;duplicateCandidate:boolean}
export interface PortalReader {apps:(signal:AbortSignal)=>Promise<unknown>;columns:(signal:AbortSignal)=>Promise<unknown>;notices:(source:NoticeSource,page:number,signal:AbortSignal)=>Promise<unknown>;detail:(notice:PortalNotice,signal:AbortSignal)=>Promise<unknown>;categories:(signal:AbortSignal)=>Promise<unknown>;agenda:(category:PortalCategory,range:DateRange,signal:AbortSignal)=>Promise<unknown>}
