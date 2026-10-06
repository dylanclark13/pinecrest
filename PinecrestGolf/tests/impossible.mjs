import assert from 'node:assert/strict';
import {impossibleHole} from '../web/impossible.js';
import {surface,height,makeBall,launch,stepBall,CLUBS} from '../web/physics.js';
const h=impossibleHole();assert.equal(surface(h,0,0),'tee');assert.equal(surface(h,...h.pin),'green');
for(const w of h.water)assert.equal(surface(h,w[0],w[1]),'water');
for(const point of [[-23,-230],[32,-455]])assert.equal(surface(h,...point),'fairway');
for(const s of h.sand)assert.equal(surface(h,s[0],s[1]),'sand');
for(let x=-110;x<=110;x+=10)for(let z=0;z>=-650;z-=10)assert(Number.isFinite(height(h,x,z)));
// There is a real cup: a slow, accurately aligned putt can finish the challenge.
const b=makeBall(h,h.pin[0],h.pin[1]+.25);b.moving=true;b.vz=-.45;b.vx=0;b.airborne=false;let event;
for(let i=0;i<240&&b.moving;i++){event=stepBall(b,h,1/120);if(event==='cup')break;}assert.equal(event,'cup');
// Water remains a scored hazard, rather than letting a ball rest invisibly underneath it.
const wet=makeBall(h,h.water[0][0],h.water[0][1]);wet.moving=true;assert.equal(stepBall(wet,h,1/120),'water');
const tee=makeBall(h);launch(tee,h,CLUBS[0],.8,0,0);for(let i=0;i<5000&&tee.moving;i++)stepBall(tee,h,1/120);assert.equal(tee.moving,false);assert([tee.x,tee.y,tee.z].every(Number.isFinite));
console.log('PASS Gauntlet geometry, narrow safe landing shelves, live bunkers/water, finite terrain and attainable cup.');
