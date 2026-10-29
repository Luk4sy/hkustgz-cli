import type {Capability} from '../../core/contracts.js';
export const CANVAS_CAPABILITIES:Capability[]=['courses','announcements','assignments','agenda'].map(a=>({id:'canvas.'+a,service:'canvas',state:'verified',reason:null,evidenceId:'R7-CANVAS-20261029'}));
