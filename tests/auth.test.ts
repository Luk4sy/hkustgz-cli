import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyAuthObservation} from '../src/session/auth.js';
import {visitService} from '../src/session/auth.js';
import type {Session} from '../src/core/contracts.js';
const observed={url:'https://sisn.hkust-gz.edu.cn/system/my-calendar',loginForm:false,challenge:false,portalApps:false,sisTerm:false,sisMeetings:false,canvasCourses:false};
test('HTTP 200 login page is not authenticated and source tickets are not exposed',()=>{
 const report=classifyAuthObservation('sis',{...observed,url:'https://sso.hkust-gz.edu.cn/Account/Login?code=private-marker',loginForm:true},0);
 assert.equal(report.state,'unauthenticated');assert.doesNotMatch(report.checkedUrl,/private-marker|code=/);
});
test('unknown auth remains unknown even when the SIS shell is visible',()=>{
 assert.equal(classifyAuthObservation('sis',observed,0).state,'unknown');
 assert.equal(classifyAuthObservation('sis',{...observed,sisTerm:true},0).state,'unknown');
});
test('positive service data cannot authenticate a different service or unrecognized origin',()=>{
 assert.equal(classifyAuthObservation('sis',{...observed,sisTerm:true,sisMeetings:true},0).state,'authenticated');
 assert.equal(classifyAuthObservation('portal',{...observed,sisTerm:true,sisMeetings:true},0).state,'unknown');
 assert.equal(classifyAuthObservation('sis',{...observed,url:'https://other.example/',sisTerm:true,sisMeetings:true},0).state,'unknown');
 assert.equal(classifyAuthObservation('booking-library',{...observed},0).state,'unknown');
});
test('normal redirect DOM context replacement is observed again without restarting login',async()=>{
 let observations=0;let navigations=0;
 const page={goto:async()=>{navigations++;},url:()=>observed.url,evaluate:async()=>{if(observations++===0)throw new Error('Execution context was destroyed, most likely because of a navigation');return{...observed,sisTerm:true,sisMeetings:true};}};
 const report=await visitService('sis',{service:'sis',page} as unknown as Session,Date.now()+2000,false);
 assert.equal(report.state,'authenticated');assert.equal(navigations,1);assert.equal(observations,2);
});

test('observed exact Canvas identity tenant requires manual login without accepting sibling tenants',()=>{
 const origin='https://47277e8d-a0fd-490e-b982-ee46ab1fd96f.sin.login.instructure.com';
 assert.equal(classifyAuthObservation('canvas',{...observed,url:origin+'/am/oauth2/alpha/authorize?state=private-marker',loginForm:true},0).state,'unauthenticated');
 assert.equal(classifyAuthObservation('canvas',{...observed,url:'https://other.sin.login.instructure.com/',loginForm:true},0).state,'unknown');
});

test('navigation replacing the final auth observation remains unknown rather than an internal failure',async()=>{
 const page={goto:async()=>{},url:()=> 'https://hkust-gz.instructure.com/login/saml?state=private-marker',evaluate:async()=>{throw new Error('Execution context was destroyed, most likely because of a navigation');}};
 const report=await visitService('canvas',{service:'canvas',page} as unknown as Session,Date.now()+200,false);
 assert.equal(report.state,'unknown');assert.doesNotMatch(report.checkedUrl,/private-marker|state=/);
});
