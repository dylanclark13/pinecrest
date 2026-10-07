import {inWater,surface} from '../web/physics.js';
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
for(const course of COURSES){const rivals=createTourField('trajectory',course.holes,course.level);for(const p of rivals.slice(0,2))for(let h=0;h<54;h++)for(let shot=1;shot<=p.scores[h];shot++){const t=tourShot(course.holes[h%18],p,h,shot);assert([...t.from,...t.to,t.distance].every(Number.isFinite));if(t.penalty){assert(inWater(course.holes[h%18],...t.from));assert(!inWater(course.holes[h%18],...t.to));}else assert(!inWater(course.holes[h%18],...t.from));if(t.putt)assert(['green','fringe'].includes(surface(course.holes[h%18],...t.from))); if(t.holed)assert.deepEqual(t.to,course.holes[h%18].pin);}}
console.log('PASS 54-hole tournament save/resume, stable NPC field, standings, round boundaries, duplicate reward safety, account isolation, normal-round validation and NPC shot paths.');

const wet={...holes[0],water:[[0,-170,100,100]]},rival=createTourField('wet',Array(18).fill(wet),8)[0];assert(rival.shots.some(plan=>plan.some(t=>t.penalty)));for(const plan of rival.shots)assert.equal(plan.filter(t=>t.penalty).length,plan.filter(t=>t.water).length);
const u='reward-test',active=(await request('/api/rounds',{course:0,mode:'full'},u)).body.round;
const attempt=(await request('/api/impossible/start',{},u)).body.id;
assert.equal((await request('/api/impossible/reward',{id:attempt,strokes:21},u)).status,400);
assert.equal((await request('/api/impossible/reward',{id:attempt,strokes:8},'other')).status,404);
for(let i=0;i<2;i++){const reward=await request('/api/impossible/reward',{id:attempt,strokes:8},u);assert.equal(reward.status,200);assert.equal(reward.body.profile.tokens,1000);}
assert.equal((await request('/api/profile',undefined,u)).body.round.id,active.id);
assert.equal((await request('/api/stats',undefined,u)).body.stats.scoredHoles,0);
console.log('PASS water penalties and dry NPC lies, green-only putts, 1,000-credit reward, retry deduplication, ownership and round/stat isolation.');

let checkedShots=0;
for(const course of COURSES){const field=createTourField('rules-audit',course.holes,course.level);for(const player of field)for(let index=0;index<54;index++){
 const h=course.holes[index%18],plan=player.shots[index];assert.equal(plan.length,player.scores[index]);assert.equal(plan.filter(s=>s.holed).length,1);assert(plan.at(-1).holed);let previous=[0,0];
 for(const s of plan){checkedShots++;assert.deepEqual(s.from,previous);previous=s.to;
  if(s.penalty){assert(['water','out'].includes(surface(h,...s.from)));assert(!['water','out'].includes(surface(h,...s.to)));continue;}
  assert(!['water','out'].includes(surface(h,...s.from)));if(!s.putt)assert(s.distance<=s.capacity+.001);assert(s.power>0&&s.power<=1);assert(Number.isInteger(s.clubIndex));
  if(surface(h,...s.from)==='sand')assert(['pw','gw','sw','lw'].includes(['driver','3wood','5wood','hybrid','5iron','6iron','7iron','8iron','9iron','pw','gw','sw','lw','putter'][s.clubIndex]));
  if(s.putt){assert.equal(s.clubIndex,13);assert(s.path.length>1);assert(s.path.every(p=>p.every(Number.isFinite)));assert.deepEqual([s.path[0][1],s.path[0][3]],s.from);assert.deepEqual([s.path.at(-1)[1],s.path.at(-1)[3]],s.to);const dx=h.pin[0]-s.from[0],dz=h.pin[1]-s.from[1];assert(s.velocity[0]*dx+s.velocity[1]*dz>0);}
 }
 assert.deepEqual(previous,h.pin);
}}
console.log('PASS '+checkedShots+' NPC events across all 8 courses: reachable club distances, valid lies, penalty continuity, green-only putts, hole-outs and exact score totals.');
