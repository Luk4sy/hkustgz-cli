/** Optional process-local cache. No private results or raw browser data are persisted. */
export class PublicCatalogCache<T>{
 private values=new Map<string,{value:T;at:number}>();
 get(key:string,now:number,refresh:boolean):T|undefined{const entry=this.values.get(key);return !refresh&&entry&&now>=entry.at&&now-entry.at<300000?structuredClone(entry.value):undefined;}
 put(key:string,value:T,now:number,publicEvidence:boolean):void{if(!publicEvidence)return;if(this.values.size>=100)this.values.clear();this.values.set(key,{value:structuredClone(value),at:now});}
}
