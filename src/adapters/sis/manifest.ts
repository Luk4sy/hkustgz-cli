import type {Capability} from '../../core/contracts.js';
export const SIS_URL='https://sisn.hkust-gz.edu.cn/system/my-calendar';
export const SIS_ORIGIN='https://sisn-service.hkust-gz.edu.cn';
export const SIS_EVIDENCE='R5-SIS-20261027';
export const SIS_CAPABILITIES:Capability[]=['terms','timetable','today'].map(action=>({id:'sis.'+action,service:'sis',state:'verified',reason:null,evidenceId:SIS_EVIDENCE}));
export const EXCEPTION_WARNING={code:'EXCEPTIONS_UNKNOWN',message:'This is a planned schedule. Cancellations, rescheduling and make-up classes have not been verified.'};
