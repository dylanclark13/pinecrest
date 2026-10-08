import assert from 'node:assert/strict';
import {COURSES} from '../web/courses.js';
import {height,BALL_RADIUS} from '../web/physics.js';
import {prepareNPCFlight,npcFlightFrame} from '../web/npc-flight.js';
let count=0;
for(const course of COURSES)for(const h of course.holes){
 const points=[[0,0],...h.path.slice(1),...h.sand.map(s=>s.slice(0,2)),...h.water.map(w=>w.slice(0,2)),h.pin];
 for(let i=1;i<points.length;i++){
  const shot={from:points[i-1],to:points[i],distance:Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])},f=prepareNPCFlight(h,shot);
  let previous=npcFlightFrame(shot,f,0);
  assert.equal(npcFlightFrame(shot,f,-1).airborne,false);
  for(let j=1;j<=240;j++){
   const b=npcFlightFrame(shot,f,j*f.duration/240);assert(Object.values(b).every(v=>typeof v!=='number'||Number.isFinite(v)));
   assert(b.y>=height(h,b.x,b.z)+BALL_RADIUS-.025);
   // A quadratic arc has a constant vertical second difference: no terrain-driven kinks.
   if(j<240){const next=npcFlightFrame(shot,f,(j+1)*f.duration/240);assert(Math.abs(next.y-2*b.y+previous.y+8*f.arc/240**2)<1e-8);}
   previous=b;
  }
  const end=npcFlightFrame(shot,f,f.duration);assert.deepEqual([end.x,end.z],shot.to);assert.equal(end.moving,false);assert.equal(end.y,f.endY);count++;
 }
}
console.log('PASS '+count+' NPC flight paths: continuous world-space arcs, terrain clearance, finite velocity, exact landings and stable completion.');
