import {CliFailure} from './errors.js';
const normalize=(key:string)=>key.toLowerCase().replace(/[^a-z0-9]/g,'');
const credentials=new Set(['token','authtoken','sessiontoken','sessionid','jsessionid','phpsessid','ssotoken','accesstoken','refreshtoken','idtoken','authorization','authorizationcode','cookie','setcookie','password','passwd','pwd','clientsecret','secret','apikey','apisecret','xapikey','csrf','csrftoken','xsrf','xsrftoken','samlrequest','samlresponse','relaystate','codeverifier','codechallenge']);
const credentialAssignment=new RegExp('\\b('+[...credentials].map(key=>key.split('').join('[_-]*')).join('|')+')(["\']?\\s*[:=]\\s*)("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|[^\\s,;&}\\]]+)','gi');
const temporary=new Set([...credentials,'code','ticket','tt','state','nonce','gid','ts','ampsecversion','sign','signature']);
const absoluteUri=(value:string)=>/^[a-z][a-z0-9+.-]*:/i.test(value);
const linkFields=new Set(['href','src','link','location','action','next','redirect','callback','returnto','redirectto']);
const isLinkField=(key:string)=>/(?:url|uri)$/.test(normalize(key))||linkFields.has(normalize(key));
const urlLike=(value:string,key='')=>absoluteUri(value)||value.startsWith('/')||(isLinkField(key)&&/[?#]/.test(value)&&(normalize(key)!=='location'||! /\s/.test(value)));
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
/** Locate one JSON value without interpreting braces or quotes inside escaped strings. */
function jsonEnd(value:string,start:number):number {
 const first=value[start];const stack:string[]=[];let quoted=first==='"';let escaped=false;
 if(!quoted)stack.push(first==='{'?'}':']');
 for(let i=start+1;i<value.length;i++){
  const char=value[i]!;
  if(quoted){
   if(escaped){escaped=false;continue;}
   if(char==='\\'){escaped=true;continue;}
   if(char==='"'){quoted=false;if(first==='"')return i+1;}
  }else if(char==='"')quoted=true;
  else if(char==='{'||char==='[')stack.push(char==='{'?'}':']');
  else if(char==='}'||char===']'){
   if(stack.pop()!==char)return -1;
   if(!stack.length)return i+1;
  }
 }
 return -1;
}
export function sanitizeValue(value:unknown):unknown {
 const seen=new WeakSet<object>();
 const visit=(item:unknown,depth:number):unknown=>{
  if(depth>32)return '[Truncated]';
  if(typeof item==='string'){
   if(/^\S+$/.test(item)&&(/^[a-z][a-z0-9+.-]*:\/\//i.test(item)||item.startsWith('/'))){
    try{return text(cleanUrl(item,true));}catch{return '[REDACTED URL]';}
   }
   let output='';let cursor=0;let failures=0;
   for(let i=0;i<item.length;i++){
    if(!['{','[','"'].includes(item[i]!))continue;
    const end=jsonEnd(item,i);let parsed:unknown;let valid=false;
    if(end>i){try{parsed=JSON.parse(item.slice(i,end));valid=true;}catch{}}
    if(!valid){if(++failures>64)return '[Truncated diagnostic]';continue;}
    const cleaned=JSON.stringify(visit(parsed,depth+1));
    output+=text(item.slice(cursor,i))+(cleaned===JSON.stringify(parsed)?item.slice(i,end):cleaned);
    cursor=end;i=end-1;
   }
   return output+text(item.slice(cursor));
  }
  if(!item||typeof item!=='object')return item;
  if(seen.has(item))return '[Circular]';seen.add(item);
  let result:unknown;
  if(Array.isArray(item))result=item.map(value=>visit(value,depth+1));
  else result=Object.fromEntries(Object.entries(item).map(([key,value])=>{
   if(credentials.has(normalize(key)))return[key,'[REDACTED]'];
   if(typeof value==='string'&&isLinkField(key)&&urlLike(value,key)){
    try{return[key,text(cleanUrl(value,true))];}catch{return[key,'[REDACTED URL]'];}
   }
   return[key,visit(value,depth+1)];
  }));
  seen.delete(item);return result;
 };
 return visit(value,0);
}
