import type {Capability} from '../../core/contracts.js';
export const PORTAL_URL='https://myportal.hkust-gz.edu.cn/';export const PORTAL_ORIGIN=new URL(PORTAL_URL).origin;export const PORTAL_EVIDENCE='R6-PORTAL-20261027';
export const PORTAL_CAPABILITIES:Capability[]=['apps','notices','notice','agenda'].map(action=>({id:'portal.'+action,service:'portal',state:'verified',reason:null,evidenceId:PORTAL_EVIDENCE}));
export const PORTAL_PATHS={apps:'/sopplus/_web/customized/loadAllServiceApps.jsp',columns:'/sopplus/_web/customized/queryAllColumn.jsp',notices:'/sopplus/_web/customized/getHkustArticleList.jsp',mnews:'/mnews/_web/customized/getPortalArticleList16ByUser.jsp',categories:'/calendar/mgr/api/category/list.rst',agenda:'/calendar/mgr/api/hkust/calendarList.rst'} as const;
