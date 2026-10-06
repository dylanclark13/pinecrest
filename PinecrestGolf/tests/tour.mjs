import assert from 'node:assert/strict';
import {request} from './features.mjs';
import {COURSES} from '../web/courses.js';
import {createTourField,tourStandings,tourPartners,tourShot} from '../web/tour.js';
const holes=COURSES[0].holes,user='tour-player';
let start=await request('/api/rounds',{course:0,mode:'tour'},user);assert.equal(start.status,200);let round=start.body.round;assert.equal(round.end_hole,53);
const field=createTourField(round.id,holes,1);assert.equal(field.length,19);assert(field.every(p=>p.scores.length===54));assert.deepEqual(createTourField(round.id,holes,1),field);
assert.notDeepEqual(createTourField('different-event',holes,1),field);
const scores=Array(54).fill(null),opening=tourStandings(field,scores,holes);assert(opening.every(p=>p.place==='T1'&&p.total===0));
for(let h=0;h<54;h++){
 const result=await request('/api/rounds/'+round.id+'/holes',{hole:h,strokes:holes[h%18].par},user);assert.equal(result.status,200);scores[h]=holes[h%18].par;
 if(h===17||h===35){assert.equal(result.body.round.next_hole,h+1);const resume=(await request('/api/profile',undefined,user)).body.round;assert.equal(resume.id,round.id);assert.equal(resume.scores.length,h+1);assert.equal(resume.course,0);assert.deepEqual(createTourField(resume.id,holes,1),field);}
 if(h===53)assert.equal(result.body.round,null);
}
const board=tourStandings(field,scores,holes),own=board.find(p=>p.id==='you');assert.equal(own.total,216);assert.equal(own.toPar,0);assert.deepEqual(own.rounds,[72,72,72]);assert.equal(own.through,54);assert(board.every((p,i)=>i===0||p.total>=board[i-1].total));
for(let r=0;r<3;r++)assert.equal(new Set(tourPartners(field,scores,holes,r).map(p=>p.id)).size,2);
const tokens=(await request('/api/profile',undefined,user)).body.profile.tokens;await request('/api/rounds/'+round.id+'/holes',{hole:53,strokes:4},user);assert.equal((await request('/api/profile',undefined,user)).body.profile.tokens,tokens);
assert.equal((await request('/api/rounds/'+round.id+'/holes',{hole:53,strokes:4},'other')).status,404);
assert.equal((await request('/api/stats',undefined,user)).body.stats.scoredHoles,54);
const normal=(await request('/api/rounds',{course:0,mode:'full'},user)).body.round;assert.equal((await request('/api/rounds/'+normal.id+'/holes',{hole:18,strokes:4},user)).status,400);
assert((await request('/api/records',undefined,user)).body.records.every(r=>r.personal===null));
for(const course of COURSES){const rivals=createTourField('trajectory',course.holes,course.level);for(const p of rivals.slice(0,2))for(let h=0;h<54;h++)for(let shot=1;shot<=p.scores[h];shot++){const t=tourShot(course.holes[h%18],p,h,shot);assert([...t.from,...t.to,t.distance].every(Number.isFinite));if(t.holed)assert.deepEqual(t.to,course.holes[h%18].pin);}}
console.log('PASS 54-hole tournament save/resume, stable NPC field, standings, round boundaries, duplicate reward safety, account isolation, normal-round validation and NPC shot paths.');
