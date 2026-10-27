export const term={id:'2610',name:'2026-27 Fall',isCurrent:true,startDate:'2026-09-01',endDate:'2026-12-25'};
export const termPage={code:'0',data:[{termId:'2610',termName:'2026-27 Fall',description:'2026-27 Fall',termStartDate:'2026-09-01',termEndDate:'2026-12-25'}],totalSize:1,totalPage:1,nextPage:false,pageIndex:1,pageSize:10};
export const row={classId:'2610-1000-L01',classSection:'L01',crseId:'synthetic-course',crseCode:'TEST5000',crseName:'Synthetic Course',enrollmentStatus:'enrolSuccess',meetingInfoList:[
 {classSectionId:'meeting-a',classId:'2610-1000-L01',startDate:'2026-09-01',endDate:'2026-12-07',weekDay:'1,2',meetingStartTime:'09:00',meetingEndTime:'10:20',facilityName:'Room A',instructorList:[{instructorName:'Synthetic Instructor'}]},
 {classSectionId:'meeting-b',classId:'2610-1000-L01',startDate:'2026-09-01',endDate:'2026-12-07',weekDay:'3',meetingStartTime:'13:00',meetingEndTime:'14:20',facilityName:'Room B',instructorList:[{instructorName:'Second Instructor'}]}
]};
export const batch={request:{startDate:term.startDate,endDate:term.endDate,includeWaitlistedClass:'N',own:true,selectedTermLabel:term.name,finishedTermLabel:term.name},body:{code:'0',data:[row],totalSize:0,totalPage:0,nextPage:false,pageIndex:0}};
export const reader={current:async()=>({code:'0',data:{termId:'2610'}}),terms:async()=>termPage,timetable:async()=>batch};
