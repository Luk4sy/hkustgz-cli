import type {Capability} from '../../core/contracts.js';
export const LIBRARY_ORIGIN='https://libroombooking.hkust-gz.edu.cn';export const LIBRARY_URL=LIBRARY_ORIGIN+'/#/ic/home';
export const LIBRARY_CAPABILITIES:Capability[]=['rooms','availability','mine'].map(a=>({id:'booking.library.'+a,service:'booking-library',state:'verified',reason:null,evidenceId:'R8-LIBRARY-20261030'}));

LIBRARY_CAPABILITIES.push(...['detail','preview','create','cancel-preview','cancel'].map(a=>({id:'booking.library.'+a,service:'booking-library' as const,state:'experimental' as const,reason:'Experimental restricted normal-flow operations; live CLI writes have not yet been independently verified. Single-self study-room creation and exact owned single-self cancellation only.',evidenceId:'L2-RESTRICTED-20261102'})));
