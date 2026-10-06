import assert from 'node:assert/strict';
let disk='',fail=false,writes=0;
globalThis.window={webkit:{messageHandlers:{career:{postMessage:async b=>{if(b.operation==='read')return disk;if(fail)throw Error('Storage full');disk=b.data;writes++;return true;}},haptic:{postMessage(){}}}}};
await import('../ios/PinecrestGolf/Game/native.js');
const request=async(path,body)=>{const r=await window.fetch(path,body===undefined?{}:{method:'POST',body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
let p=await request('/api/profile');assert.deepEqual(p.profile.unlockedCourses,[0,1,2,3,4,5,6,7]);assert.equal(p.round,null);
for(let course=4;course<8;course++)for(const mode of ['front','back','full'])assert.equal((await request('/api/rounds',{course,mode})).status,200);
let start=await request('/api/rounds',{course:3,mode:'full'}),id=start.round.id;
await request('/api/checkpoint',{roundId:id,hole:0,ball:{x:10,y:0,z:-12},strokes:2,clubIndex:4,angle:1});
assert.equal((await request('/api/profile')).round.checkpoint.strokes,2);
for(let hole=0;hole<18;hole++)assert.equal((await request('/api/rounds/'+id+'/holes',{hole,strokes:5,metrics:{putts:2,fairway:1,gir:0}})).status,200);
p=await request('/api/profile');assert.equal(p.profile.courseBest[3],90);assert.equal(p.profile.courseMedals[3],'Bronze');assert.ok(p.profile.unlockedCourses.includes(4));assert.equal(p.round,null);
const tokens=p.profile.tokens;await request('/api/rounds/'+id+'/holes',{hole:17,strokes:5});assert.equal((await request('/api/profile')).profile.tokens,tokens);
const stats=await request('/api/stats');assert.equal(stats.stats.scoredHoles,18);assert.equal(stats.stats.putts,36);
const before=disk;fail=true;assert.equal((await request('/api/upgrade',{clubId:'driver',expectedLevel:0})).status,503);assert.equal(disk,before);assert.equal((await request('/api/profile')).profile.tokens,tokens);fail=false;
const upgrade=await request('/api/upgrade',{clubId:'driver',expectedLevel:0});assert.equal(upgrade.spent,150);assert.equal(upgrade.profile.clubLevels.driver,1);
const daily=await request('/api/daily',{});for(let h=daily.round.next_hole;h<=daily.round.end_hole;h++)await request('/api/rounds/'+daily.round.id+'/holes',{hole:h,strokes:3,metrics:{putts:1,fairway:1,gir:1}});
const after=(await request('/api/profile')).profile.tokens;const again=await request('/api/daily',{});for(let h=again.round.next_hole;h<=again.round.end_hole;h++)await request('/api/rounds/'+again.round.id+'/holes',{hole:h,strokes:3});assert.equal((await request('/api/profile')).profile.tokens,after);assert.equal((await request('/api/stats')).stats.scoredHoles,18);
const record=await request('/api/records');assert.equal(record.records.find(r=>r.course===3&&r.mode==='full').personal,90);
// A fresh module instance must restore from the native file, not the JS heap.
await import('../ios/PinecrestGolf/Game/native.js?relaunch');assert.equal((await request('/api/profile')).profile.tokens,after);
assert.ok(writes>20);console.log('PASS offline career, unlocked challenge courses and medals, checkpoint, duplicate scores, daily rewards, stats, upgrade failure rollback, and relaunch from native storage.');
const event=await request('/api/rounds',{course:7,mode:'tour'});assert.equal(event.status,200);assert.equal(event.round.end_hole,53);const eventID=event.round.id;
for(let h=0;h<54;h++){
 const result=await request('/api/rounds/'+eventID+'/holes',{hole:h,strokes:4});assert.equal(result.status,200);
 if(h===17){await import('../ios/PinecrestGolf/Game/native.js?tour-resume');const restored=await request('/api/profile');assert.equal(restored.round.id,eventID);assert.equal(restored.round.next_hole,18);assert.equal(restored.round.scores.length,18);}
}
assert.equal((await request('/api/profile')).round,null);const tourTokens=(await request('/api/profile')).profile.tokens;await request('/api/rounds/'+eventID+'/holes',{hole:53,strokes:4});assert.equal((await request('/api/profile')).profile.tokens,tourTokens);
console.log('PASS offline 54-hole tour, round-two relaunch and duplicate final-score safety.');
