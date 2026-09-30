import assert from 'node:assert/strict';
import {GreenskeeperGame,KEEPER_TOOLS} from '../web/greenskeeper.js';
const g=new GreenskeeperGame();assert.equal(g.strike(),false);g.start();assert.equal(g.strike(),true);assert.equal(g.score,20);assert.equal(g.strike(),false);g.update(0);assert.equal(g.time,30);
for(let i=0;i<KEEPER_TOOLS.length;i++){g.tool=i;g.update(1.3);const before=g.score;assert(g.strike());assert(g.score>=before+KEEPER_TOOLS[i].points);assert.equal(g.effectTool,KEEPER_TOOLS[i].id);assert.equal(g.cooldown,KEEPER_TOOLS[i].cooldown);}
g.update(30);assert.equal(g.running,false);assert.equal(g.time,0);assert.equal(g.strike(),false);const best=g.best;g.start();assert.equal(g.score,0);assert.equal(g.best,best);assert.equal(g.hits,0);console.log('PASS all tools, cooldowns, combo scoring, paused clock, round end and session best.');
