import type {DoctorProbes} from '../../src/core/contracts.js';
export const probes:DoctorProbes={runtime:()=>({nodeVersion:'v24.20.0',platform:'darwin',arch:'arm64'}),data:async()=> 'absent',browser:async()=>({selected:'chrome',chromeAvailable:true}),skill:async()=>({state:'absent',installedVersion:null,expectedVersion:'0.1.0-alpha.1'})};
