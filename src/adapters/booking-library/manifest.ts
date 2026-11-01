import type {Capability} from '../../core/contracts.js';
export const LIBRARY_ORIGIN='https://libroombooking.hkust-gz.edu.cn';export const LIBRARY_URL=LIBRARY_ORIGIN+'/#/ic/home';
export const LIBRARY_CAPABILITIES:Capability[]=['rooms','availability','mine'].map(a=>({id:'booking.library.'+a,service:'booking-library',state:'verified',reason:null,evidenceId:'R8-LIBRARY-20261030'}));
