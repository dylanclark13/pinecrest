import assert from 'node:assert/strict';
import {COURSES} from '../web/courses.js';
import {planTourPutt,tourPuttFrame} from '../web/tour.js';
import {makeBall,stepBall} from '../web/physics.js';
const base={...COURSES[0].holes[0],pin:[0,-100],greenRadius:30,sand:[],water:[],island:false,contour:0,greenFriction:.52};
const shots=[];
for(const slope of [[0,0],[.035,0],[-.035,0],[0,.035],[0,-.035]]){
 const h={...base,slope},from=[0,-94],s=planTourPutt(h,from);shots.push(s);assert(s.holed);assert(s.velocity[1]<0);assert(Math.abs(s.angle)<Math.PI/4);
 const b=makeBall(h,...from);[b.vx,b.vz]=s.velocity;b.moving=true;let i=1;
 for(let n=0;n<4801&&b.moving;n++){stepBall(b,h,1/120);if(i<s.path.length&&Math.abs(b.time-s.path[i][0])<1e-8){assert(Math.hypot(b.x-s.path[i][1],b.y-s.path[i][2],b.z-s.path[i][3])<1e-8);i++;}}
 assert(b.holed);assert.equal(i,s.path.length);const end=tourPuttFrame(s,100);assert.deepEqual([end.x,end.z],h.pin);
}
assert(shots[1].path.some(p=>p[1]>.1));assert(shots[2].path.some(p=>p[1]<-.1));assert(shots[0].path.every(p=>Math.abs(p[1])<1e-9));
assert(shots[3].velocity[1]!==shots[4].velocity[1]);
const miss=planTourPutt({...base,slope:[.035,0]},[0,-94],.04,-.06);assert(!miss.holed);const next=planTourPutt({...base,slope:[.035,0]},miss.to);assert.deepEqual(next.from,miss.to);assert(next.holed);
console.log('PASS actual rolling-physics replay, left/right break, flat-green straight roll, uphill/downhill pace, forward aim, cup detection and follow-up from actual miss.');
