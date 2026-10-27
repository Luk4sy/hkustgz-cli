import type {Capability} from '../../core/contracts.js';
export const CATALOG_URL='https://sisn.hkust-gz.edu.cn/cq';
export const CATALOG_EVIDENCE='R4-CATALOG-BATCH-20261027';
export const CATALOG_CAPABILITIES:Capability[]=['search','course'].map(action=>({id:'catalog.'+action,service:'catalog',state:'verified',reason:null,evidenceId:CATALOG_EVIDENCE}));
export const CATALOG_WARNING={code:'SOURCE_UPDATE_INTERVAL',message:'Class information normally updates every 15–20 minutes; quotas are not real-time.'};
