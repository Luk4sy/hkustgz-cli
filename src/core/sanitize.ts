import {CliFailure} from './errors.js';
const normalize=(key:string)=>key.toLowerCase().replace(/[^a-z0-9]/g,'');
const credentials=new Set(['token','authtoken','sessiontoken','sessionid','jsessionid','phpsessid','ssotoken','accesstoken','refreshtoken','idtoken','authorization','authorizationcode','cookie','setcookie','password','passwd','pwd','clientsecret','secret','apikey','apisecret','xapikey','csrf','csrftoken','xsrf','xsrftoken','samlrequest','samlresponse','relaystate','codeverifier','codechallenge']);
const credentialAssignment=new RegExp('\\b('+[...credentials].map(key=>key.split('').join('[_-]*')).join('|')+')(["\']?\\s*[:=]\\s*)("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|[^\\s,;&}\\]]+)','gi');
const temporary=new Set([...credentials,'code','ticket','tt','state','nonce','gid','ts','ampsecversion','sign','signature']);
const absoluteUri=(value:string)=>/^[a-z][a-z0-9+.-]*:/i.test(value);
const urlLike=(value:string,key='')=>absoluteUri(value)||value.startsWith('/')||((/(?:url|uri)$/.test(normalize(key))||['next','redirect','callback'].includes(normalize(key)))&&/[?#]/.test(value));
function cleanUrl(value:string,relative:boolean,depth=0):string {
 const url=new URL(value,relative?'https://redaction.invalid':undefined);url.username='';url.password='';
 for(const [key,val] of [...url.searchParams]){
  if(temporary.has(normalize(key)))url.searchParams.delete(key);
  else if(urlLike(val,key)){if(depth>=8)url.searchParams.delete(key);else url.searchParams.set(key,cleanUrl(val,true,depth+1));}
 }
 const hash=url.hash.slice(1);const question=hash.indexOf('?');
 if(question>=0||hash.includes('=')){
  const prefix=question>=0?hash.slice(0,question):'';const params=new URLSearchParams(question>=0?hash.slice(question+1):hash);
  for(const [key,val] of [...params]){
   if(temporary.has(normalize(key)))params.delete(key);
   else if(urlLike(val,key)){if(depth>=8)params.delete(key);else params.set(key,cleanUrl(val,true,depth+1));}
  }
  url.hash=prefix+(params.size?(prefix?'?':'')+params.toString():'');
 }
 if(!relative||absoluteUri(value))return url.href;
 if(value.startsWith('//'))return '//'+url.host+url.pathname+url.search+url.hash;
 return value.split(/[?#]/,1)[0]+url.search+url.hash;
}
export function sanitizeSourceUrl(value:string):string {
 try{return cleanUrl(value,false);}catch{throw new CliFailure('ADAPTER_CHANGED','The source URL is not a valid supported URL.');}
}
function text(value:string):string {
 return value.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi,url=>{
  try{return cleanUrl(url,false);}catch{return '[REDACTED URL]';}
 }).replace(/\b(Authorization\s*:\s*(?:Bearer|Basic)\s+)\S+/gi,'$1[REDACTED]')
 .replace(/\b((?:Set-Cookie|Cookie)\s*:\s*)[^\r\n]+/gi,'$1[REDACTED]')
 .replace(credentialAssignment,(match,key:string,separator:string,raw:string)=>{
  if(!credentials.has(normalize(key)))return match;
  const quote=raw.startsWith('"')?'"':raw.startsWith("'")?"'":'';
  return key+separator+quote+'[REDACTED]'+quote;
 });
}
export function sanitizeValue(value:unknown):unknown {
 const seen=new WeakSet<object>();
 const visit=(item:unknown,depth:number):unknown=>{
  if(depth>32)return '[Truncated]';
  if(typeof item==='string'){
   if(/^\s*[\[{]/.test(item)){
    try{const parsed:unknown=JSON.parse(item);const cleaned=JSON.stringify(visit(parsed,depth+1));if(cleaned!==JSON.stringify(parsed))return cleaned;}catch{}
   }
   return text(item);
  }
  if(!item||typeof item!=='object')return item;
  if(seen.has(item))return '[Circular]';seen.add(item);
  let result:unknown;
  if(Array.isArray(item))result=item.map(value=>visit(value,depth+1));
  else result=Object.fromEntries(Object.entries(item).map(([key,value])=>{
   if(credentials.has(normalize(key)))return[key,'[REDACTED]'];
   if(typeof value==='string'&&/(?:url|uri)$/.test(normalize(key))&&urlLike(value,key)){
    try{return[key,cleanUrl(value,true)];}catch{return[key,'[REDACTED URL]'];}
   }
   return[key,visit(value,depth+1)];
  }));
  seen.delete(item);return result;
 };
 return visit(value,0);
}
