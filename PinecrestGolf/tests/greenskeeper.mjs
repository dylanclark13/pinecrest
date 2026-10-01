import assert from 'node:assert/strict';
import {GreenskeeperGame,KEEPER_TOOLS} from '../web/greenskeeper.js';
const g=new GreenskeeperGame();assert.equal(g.strike(),false);g.start();assert(g.strike());assert.equal(g.score,20);assert.equal(g.quality,'perfect');assert.equal(g.strike(),false);g.update(0);assert.equal(g.time,30);assert.equal(g.setDifficulty('expert'),false);
for(let i=0;i<KEEPER_TOOLS.length;i++){g.tool=i;g.update(g.cooldown);g.clock=0;const before=g.score;assert(g.strike());assert(g.score>=before+KEEPER_TOOLS[i].points);assert.equal(g.effectTool,KEEPER_TOOLS[i].id);assert.equal(g.cooldown,Math.max(1.65,KEEPER_TOOLS[i].cooldown));}
g.update(30);assert.equal(g.running,false);assert.equal(g.time,0);assert.equal(g.strike(),false);const best=g.best;g.start();assert.equal(g.score,0);assert.equal(g.best,best);assert.equal(g.hits,0);g.update(30);
for(const mode of ['casual','standard','expert']){
 assert(g.setDifficulty(mode));g.tool=0;g.start();g.clock=Math.PI/2/g.settings.speed;assert(g.strike());assert.equal(g.quality,'miss');assert.equal(g.score,0);assert.equal(g.hits,0);assert.equal(g.attempts,1);
 g.update(1);g.clock=Math.asin(g.settings.window+g.settings.perfect)/g.settings.speed;assert(g.strike());assert.equal(g.quality,'solid');assert.equal(g.score,10);assert.equal(g.accuracy,50);
 g.update(1);g.clock=0;assert(g.strike());assert.equal(g.quality,'perfect');assert.equal(g.score,30);assert.equal(g.perfects,1);assert.equal(g.combo,1);
 const time=g.time;g.update(-1);assert.equal(g.time,time);g.update(NaN);assert.equal(g.time,time);
 g.update(30);assert(g.message.includes('67% accuracy'));assert(g.message.includes('Best combo 2×'));
}
assert.equal(g.bests.expert,30);assert.equal(g.bests.casual,30);assert(g.bests.standard>30);assert.equal(g.setDifficulty('missing'),false);
console.log('PASS ten tools, three difficulties, misses, hit grades, combos, cooldowns, pause, round summary and separate session bests.');

const comedy=new GreenskeeperGame();comedy.start();comedy.strike();const first=comedy.quip;assert(!comedy.spokenLine.includes(first));comedy.update(.33);assert.equal(comedy.spokenLine,first);assert.equal(comedy.strike(),false);comedy.update(comedy.cooldown);comedy.clock=0;assert(comedy.strike());assert.notEqual(comedy.quip,first);assert.equal(comedy.variant,1);comedy.update(3);assert.equal(comedy.spokenLine,'Please keep all complaints in writing.');
console.log('PASS delayed comic lines, rotating variants and full perfect-hit recovery');
