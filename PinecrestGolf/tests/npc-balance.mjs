import assert from 'node:assert/strict';
import {COURSES} from '../web/courses.js';
import {createTourField} from '../web/tour.js';
let holes=0,ones=0,twos=0,threes=0,aces=0;
for(const course of COURSES){
 const field=createTourField('difficulty-check',course.holes,course.level);let counts=[0,0,0,0],rounds=[];
 for(const p of field){for(let r=0;r<3;r++)rounds.push(p.scores.slice(r*18,r*18+18).reduce((a,b)=>a+b,0));for(const plan of p.shots){holes++;const putts=plan.filter(s=>s.putt).length;counts[Math.min(3,putts)]++;if(putts===1)ones++;else if(putts===2)twos++;else if(putts>=3)threes++;if(plan.length===1)aces++;assert.equal(plan.filter(s=>s.holed).length,1);assert(plan.at(-1).putt&&plan.at(-1).holed);assert(plan.filter(s=>!s.putt).every(s=>!s.holed));}}
 console.log(course.name,JSON.stringify({mean:rounds.reduce((a,b)=>a+b,0)/rounds.length,range:[Math.min(...rounds),Math.max(...rounds)],putts:counts}));
}
console.log(JSON.stringify({holes,ones,twos,threes,aces}));assert.equal(aces,0);assert(twos+threes>ones,'Multi-putt holes should outnumber one-putts');assert(threes>0);
