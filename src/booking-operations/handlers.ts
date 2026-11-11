import {cancelReservation} from './cancel.js';
import {createReservation} from './create.js';
import type {OperationResult} from './contract.js';
import type {CommandHandler,QueryOptions} from '../core/contracts.js';
import {CliFailure} from '../core/errors.js';
import {resolveDataPaths} from '../session/paths.js';
import {withOperationStore} from './store.js';
import {normalizePreviewInput} from './intent.js';
import {preparePreview,inspectOperation,operationFailure,type OperationSession} from './workflow.js';
export async function readStdin(maxBytes:number):Promise<string>{
 let size=0;const chunks:Buffer[]=[];
 for await(const chunk of process.stdin){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.byteLength;if(size>maxBytes)throw new CliFailure('INVALID_ARGUMENT');chunks.push(b);}
 return Buffer.concat(chunks).toString('utf8');
}
export function createOperationHandlers(config:{session?:OperationSession}={}):Record<string,CommandHandler>{
 return Object.fromEntries(['preview','cancel-preview','operation','create','cancel'].map(action=>[action==='operation'?'booking.operation':'booking.library.'+action,async(args,deps)=>{
  let intent:unknown;
  if(action==='preview'){
   if(args.input!=='-')throw new CliFailure('INVALID_ARGUMENT');const text=await(deps.readInput??readStdin)(65536);
   if(Buffer.byteLength(text)>65536)throw new CliFailure('INVALID_ARGUMENT');
   try{intent=normalizePreviewInput(JSON.parse(text),deps.now());}catch{throw new CliFailure('INVALID_ARGUMENT');}
  }
  const paths=resolveDataPaths(deps.env??process.env);
  const options:QueryOptions={refresh:false,deadlineMs:Number(args.deadlineMs)};
  const session:OperationSession=config.session??(async(secret,o,run)=>{
   const [{withLibraryReader},{createLibraryOperationSource}]=await Promise.all([import('../adapters/booking-library/reader.js'),import('../adapters/booking-library/preview.js')]);
   return withLibraryReader(o,(reader,sessionOptions)=>run(createLibraryOperationSource(reader,deps.now),sessionOptions),deps,args.headed===true);
  });
  let receipt:OperationResult|undefined;
  try{return await withOperationStore(paths.root,async store=>{
   receipt=await(action==='cancel'?cancelReservation(store,session,String(args.operation),String(args.confirm),options,deps.now):action==='create'?createReservation(store,session,String(args.operation),String(args.confirm),options,deps.now):action==='operation'?inspectOperation(store,String(args.id),args.refresh===true?session:undefined,options,deps.now):preparePreview(store,session,action==='preview'?{action:'create',intent}:{action:'cancel',id:String(args.id),range:{from:String(args.from),to:String(args.to),timezone:'Asia/Shanghai'}},options,deps.now));return receipt;
  });}catch(error){
   if(!receipt)throw error;
   const value=receipt.data?{...receipt.data}:null;if(value)delete value.confirmationDigest;
   return operationFailure('booking '+action,error,value);
  }
 }]));
}
