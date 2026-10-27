export const apps={result:'1',data:{total:1,appList:[{id:35,name:'Synthetic Application',appUrl:'/launch?ticket=private-marker&app=35'}]}};
export const columns={result:'1',data:[{wybs:'notice',lmmc:'Notices'},{wybs:'mnews_16',lmmc:'Students',jkcs:{siteId:2,columnId:16}}]};
export const notice={id:354,title:'Synthetic notice',date:'2026-10-27 09:00:00',colName:'Students',content:'',articleUrl:'https://myportal.hkust-gz.edu.cn/mnews/_redirect?siteId=2&columnId=16&articleId=354',linkUrl:''};
export const notices={result:'1',data:{total:1,list:[notice]}};
export const categories={resultCode:0,result:{data:[{teamCategoryVOS:[{id:-3,calendarCateId:0,calendarCateName:'Outlook'},{id:-2,calendarCateId:0,calendarCateName:'My Course'}]}]}};
export const range={from:'2026-10-27',to:'2026-10-28',timezone:'Asia/Shanghai' as const};
export const calendar=(category=-3)=>({request:{categoryId:category,from:'2026-10-27',to:'2026-10-28',queryType:'2',type:'0'},body:[{day:'2026-10-27 00:00:00',events:[{beginTime:'2026-10-27 09:00:00',endTime:'2026-10-27 10:00:00',schedule:{id:0,tag10:'synthetic-original-id',title:'Synthetic event',location:'Room A',cateGory:{id:category,name:category===-3?'Outlook':'My Course'}}}]}]});
export const reader={apps:async()=>apps,columns:async()=>columns,notices:async()=>notices,categories:async()=>categories,agenda:async(category:{id:number})=>calendar(category.id),detail:async()=>({status:200,contentFound:true,loginForm:false,bodyText:'Synthetic complete body',articleId:'354'})};
