import {impossibleHole} from '../web/impossible.js';
import * as tour from '../web/tour.js';
import {createGolfMusic} from '../web/music.js';
import {GreenskeeperGame,KEEPER_TOOLS} from '../web/greenskeeper.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as physics from '../web/physics.js';
import * as courses from '../web/courses.js';
import * as progression from '../web/progression.js';
import * as character from '../web/character.js';
import * as challenges from '../web/challenges.js';
import {request} from './features.mjs';
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const noop=()=>{},ctx2d=new Proxy({},{get:()=>noop,set:()=>true});
class Element{constructor(id){this.id=id;this.listeners={};this.hidden=false;this.open=false;this.value='';this.dataset={};this.style={};this.width=300;this.height=400;this.classList={add:noop,remove:noop,toggle:noop};}getContext(){return ctx2d}setAttribute(){}getAttribute(){return 'false'}addEventListener(name,fn){this.listeners[name]=fn}appendChild(child){child.parentNode=this;return child}insertBefore(child){child.parentNode=this;return child}click(){this.onclick?.()}querySelector(){return new Element('child')}showModal(){this.open=true}close(){const was=this.open;this.open=false;if(was)this.listeners.close?.()}getBoundingClientRect(){return {left:0,top:0,width:300,height:400}}}
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
const document={getElementById(id){assert(elements.has(id),'Missing element '+id);return elements.get(id)},querySelector(){return [...elements.values()].find(e=>e.open)||null},querySelectorAll(){return []},addEventListener:noop,hidden:false};
let renderCalls=0;
class Renderer{constructor(){this.eye=[2,3,6];this.center=[0,0,0];this.trees=[]}loadHole(h){this.h=h}render(state){assert(state.hole);assert(Number.isFinite(state.ball.x));renderCalls++}pointOnCourse(){return null}}
const context=vm.createContext({impossibleHole,...tour,createGolfMusic,GreenskeeperGame,KEEPER_TOOLS,...physics,...courses,...progression,...character,...challenges,console,document,window:{addEventListener:noop,matchMedia:()=>({matches:false})},requestAnimationFrame:noop,performance:{now:()=>1000},setTimeout:()=>1,clearTimeout:noop,structuredClone,GolfRenderer:Renderer,fetch:async(path,options)=>{const r=await request(path,options?.body?JSON.parse(options.body):undefined,'ui');return {ok:r.status===200,json:async()=>r.body}}});
const source=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');vm.runInContext(source,context);
await new Promise(r=>setImmediate(r));const run=s=>vm.runInContext(s,context);
run("for(const el of document.querySelectorAll('dialog[open]'))el.close()");for(const e of elements.values())e.close();
run('profileLoaded=true;homeOpen=true');
await run('startSelectedRound()');assert.equal(run('homeOpen'),false);
run('strokes=2;ball.x=3;ball.z=-25;holeMetrics.putts=1;showCourses()');const old=run('JSON.stringify({courseIndex,holeIndex,ball,strokes,roundId,holeMetrics})');
const before=(await request('/api/profile',undefined,'ui')).body.profile;
run("startPractice('range')");assert.equal(run('practice'),'range');assert.equal(run('roundId'),null);
run('strokes=1;shotDistance=100;shotCarry=85;restAfterShot()');assert(elements.get('practiceFeedback').textContent.includes('carry'));
run('showCourses()');assert.equal(run('JSON.stringify({courseIndex,holeIndex,ball,strokes,roundId,holeMetrics})'),old);
assert.deepEqual((await request('/api/profile',undefined,'ui')).body.profile,before);
run("startPractice('putting')");assert.equal(run('view'),'putting');assert.equal(run('clubIndex'),physics.PUTTER_INDEX);assert.equal(run('surface(hole,ball.x,ball.z)'),'green');
run('strokes=1;ball.holed=true;finishHole()');assert.equal(run('pendingScore'),null);assert(elements.get('practiceFeedback').textContent.includes('Holed'));
run('resetPractice()');assert.equal(run('ball.holed'),false);
run('phase="accuracy";timingNeedle=0;power=.5;commitStrike()');assert(run('recording'));run('impact();captureReplay(.05);ball.moving=false;restAfterShot()');assert(run('lastReplay.frames.length>=2'));
const unchanged=run('JSON.stringify({ball,strokes,phase,holeMetrics})');run('startReplay();playReplay(.016);stopReplay()');assert.equal(run('JSON.stringify({ball,strokes,phase,holeMetrics})'),unchanged);
run('showCourses()');assert.equal(run('strokes'),2);assert.equal(run('practice'),null);
await elements.get('startDaily').onclick();assert.equal(run('roundMode'),'daily');assert.equal(run('roundEnd-roundStart+1'),3);assert.equal(run('hole.gust'),0);assert.equal(run('JSON.stringify(hole.wind)'),run('JSON.stringify(dailyConfig.wind)'));
await run('loadStats()');assert(elements.get('personalStats').innerHTML.includes('Putts per hole'));
run('renderEquipment()');assert(elements.get('equipmentChoices').innerHTML.includes('percentage points'));assert(elements.get('equipmentChoices').innerHTML.includes('Timing window grows'));
console.log('PASS complete DOM wiring, practice isolation/restoration, putting setup, replay without gameplay mutation, daily entry, stats and upgrade comparisons.');
const golfBefore=run('JSON.stringify({roundId,scores,strokes,ball,career})');run("setHomeTab('greenskeeper');keeper.start();keeper.strike();updateKeeper(.016)");assert.equal(elements.get('homeGreenskeeper').hidden,false);assert.equal(run('JSON.stringify({roundId,scores,strokes,ball,career})'),golfBefore);run("setHomeTab('play')");assert.equal(elements.get('homeGreenskeeper').hidden,true);console.log('PASS Greenskeeper tab visibility, renderer wiring and golf career isolation.');

run('closeHome();phase="ready";finished=false;ball.moving=false;updateUI()');
assert(elements.get('mobileDistance').textContent.includes('yd')||elements.get('mobileDistance').textContent.includes('ft'));
run('openMobileTools()');assert(elements.get('mobileDetailsDialog').open);
assert.equal(elements.get('hudLeft').parentNode,elements.get('mobileToolsContent'));
elements.get('mobileDetailsDialog').close();
assert.equal(elements.get('hudLeft').parentNode,elements.get('hudMiddle'));
assert.equal(elements.get('hudRight').parentNode,elements.get('hudMiddle'));
run('openMobileTools(true)');
elements.get('minimap').listeners.pointerdown({clientX:180,clientY:150});
assert.equal(elements.get('mobileDetailsDialog').open,false);
assert.equal(run('phase'),'ready');assert(run('aimTarget.every(Number.isFinite)'));
run('openMobileTools();greenGrid=false');elements.get('gridButton').click();
assert.equal(elements.get('mobileDetailsDialog').open,false);assert.equal(run('greenGrid'),true);
run('toast("Penalty: replay from the last lie.")');assert(elements.get('mobileNotice').textContent.includes('Penalty'));
console.log('PASS compact distance display, tools panel restoration, modal map aiming, green controls and inline notifications');
function timedShot(fast,shotPower,shotAccuracy){
 for(const e of elements.values())e.close();
 run("showCourses();startPractice('range');phase='ready';power="+shotPower+";accuracy="+shotAccuracy+";actor.club=activeClub();impact();recording=null;accum=0;last=1000;fastForward="+fast);
 let frames=0;while(run('ball.moving')&&frames<3000){frames++;run('animate('+(1000+frames*1000/60)+')');}
 assert(frames<3000,'shot finishes');
 const result=run('JSON.stringify({x:ball.x,y:ball.y,z:ball.z,holed:ball.holed,strokes,shotCarry,shotDistance})');return {frames,result};
}
for(const [power,accuracy]of[[.7,0],[.95,.6]]){const regular=timedShot(false,power,accuracy),quick=timedShot(true,power,accuracy);assert.equal(quick.result,regular.result,'fast-forward preserves shot outcome');assert(quick.frames<regular.frames*.3,'4x speed finishes much sooner');}
run('updateUI()');assert.equal(elements.get('fastForwardShot').hidden,true);
console.log('PASS normal and off-center shots land identically at 1x and 4x; button hides after landing');

// Exercise actual input handlers, including a press before impact and duplicate clicks.
for(const e of elements.values())e.close();
run("showCourses();startPractice('range');phase='accuracy';power=.7;timingNeedle=.5;commitStrike()");
const forward=elements.get('fastForwardShot');assert.equal(forward.hidden,false);
let prevented=false;forward.listeners.pointerdown({button:0,isPrimary:true,preventDefault(){prevented=true;}});
assert(prevented);assert.equal(run('fastForward'),true);assert.equal(forward.disabled,true);
forward.click();forward.click();assert.equal(run('fastForward'),true,'extra taps never cancel fast-forward');
run('impact()');assert.equal(run('fastForward'),true,'pre-impact press survives ball contact');
run("ball.moving=true;ball.airborne=false;phase='flight';fastForward=false;updateUI()");
forward.click();assert.equal(run('fastForward'),true,'keyboard click works while rolling');
run("ball.moving=false;phase='accuracy';timingNeedle=.5;commitStrike()");assert.equal(run('fastForward'),false,'new shot starts at normal speed');assert.equal(forward.disabled,false);
run("$('helpDialog').showModal()");forward.click();assert.equal(run('fastForward'),false);elements.get('helpDialog').close();
run("phase='ready';ball.moving=false;updateUI()");forward.click();assert.equal(run('fastForward'),false);assert.equal(forward.hidden,true);
console.log('PASS early pointer press, duplicate-click safety, impact persistence, rolling/keyboard activation and per-shot reset.');
// A tour uses the same course for three rounds; NPC views never modify the player's shot.
for(const e of elements.values())e.close();run("showCourses();pendingCourse=1;pendingRound='tour'");await run('startSelectedRound()');
assert.equal(run('HOLES.length'),54);assert.equal(run('HOLES[0]===HOLES[18]&&HOLES[18]===HOLES[36]'),true);assert.equal(run('tourGroup.length'),2);
run('strokes=1;queueTourShots(false)');assert.equal(run('ready()'),false);assert.equal(elements.get('skipTourShot').hidden,false);
const personalShot=run('JSON.stringify({ball,strokes,scores,roundId,clubIndex})');for(let i=0;i<10;i++)run('playTourTurn(.05)');assert.equal(run('JSON.stringify({ball,strokes,scores,roundId,clubIndex})'),personalShot);
elements.get('skipTourShot').click();assert.equal(run('tourTurn'),null);assert.equal(run('ready()'),true);
run('showTourLeaderboard()');assert(elements.get('tourTable').innerHTML.includes('(you)'));assert(elements.get('tourTable').innerHTML.includes('Alex Mercer'));elements.get('tourDialog').close();
run('showCourses()');const savedField=run('JSON.stringify(tourField)'),savedGroup=run('JSON.stringify(tourGroup)');run("startPractice('range');showCourses()");assert.equal(run('JSON.stringify(tourField)'),savedField);assert.equal(run('JSON.stringify(tourGroup)'),savedGroup);
run("scores=HOLES.map((h,i)=>i<18?h.par:null);startHole(18)");assert.equal(run('holeIndex'),18);assert.equal(elements.get('mobileHole').textContent,'R2 · H1');assert.equal(run('tourGroup.length'),2);
run('scores=HOLES.map(h=>h.par);holeIndex=53;hole=HOLES[53];finished=true;updateUI()');assert(elements.get('resultCopy').textContent.includes('216 strokes'));assert.equal(elements.get('resultEyebrow').textContent,'TOURNAMENT COMPLETE');
console.log('PASS tour course repetition, NPC turn/skip controls, player-state isolation, leaderboard, practice restoration and final result UI.');
run("showCourses();pendingCourse=0;pendingRound='tour'");await run('startSelectedRound()');
for(let i=0;i<54;i++){
 assert.equal(run('holeIndex'),i);run('strokes=hole.par;finishHole();skipTourShots()');
 await new Promise(r=>setImmediate(r));assert.equal(run('pendingScore'),null);assert.equal(run('savePending'),false);
 assert.equal(run('scores.filter(x=>x!==null).length'),i+1);
 if(i<53){assert.equal(run('savedRound.next_hole'),i+1);elements.get('nextHole').click();}
}
assert.equal(run('savedRound'),null);run('showTourLeaderboard()');assert(elements.get('tourSummary').textContent.includes('Final results'));elements.get('tourDialog').close();elements.get('nextHole').click();assert.equal(run('homeOpen'),true);
console.log('PASS all 54 holes through real finish/save/next controls and final leaderboard handoff.');
for(const e of elements.values())e.close();run("showCourses();pendingCourse=2;pendingRound='tour'");await run('startSelectedRound()');
run('strokes=2;ball.x=4;ball.z=-25;showCourses()');const beforeChallenge=run('JSON.stringify({roundId,roundMode,ball,strokes,scores,tourField,tourGroup})'),beforeChallengeCareer=run('JSON.stringify(career)');
elements.get('impossibleTab').click();assert.equal(elements.get('homeImpossible').hidden,false);elements.get('startImpossible').click();assert.equal(run('practice'),'impossible');assert.equal(run('HOLES.length'),1);assert.equal(run('hole.name'),'The Gauntlet');assert.equal(elements.get('suggestion').hidden,true);assert.equal(elements.get('impossibleBar').hidden,false);
run('beginCharge()');assert.equal(run('phase'),'power');assert.equal(elements.get('swingButton').disabled,false);run('releasePower()');assert.equal(run('phase'),'accuracy');assert.equal(elements.get('swingButton').disabled,false);run('cancelSetup()');
run('strokes=19;ball.moving=false;restAfterShot(true)');assert.equal(run('finished'),false);run('strokes=20;restAfterShot(true)');assert.equal(run('finished'),true);assert(elements.get('impossibleDialog').open);assert.equal(run('impossibleBest'),null);
elements.get('impossibleAgain').click();assert.equal(run('strokes'),0);assert.equal(run('finished'),false);assert.equal(run('impossibleAttempts'),2);
run('strokes=7;ball.holed=true;finishHole()');assert.equal(run('impossibleBest'),7);assert.equal(run('impossibleClears'),1);assert.equal(run('pendingScore'),null);assert.equal(run('JSON.stringify(career)'),beforeChallengeCareer);
await run('impossibleAward.saving');assert.equal(run('career.tokens'),JSON.parse(beforeChallengeCareer).tokens+1000);await run('claimImpossibleReward()');assert.equal(run('career.tokens'),JSON.parse(beforeChallengeCareer).tokens+1000);
elements.get('impossibleDone').click();assert.equal(run('JSON.stringify({roundId,roundMode,ball,strokes,scores,tourField,tourGroup})'),beforeChallenge);assert.equal(elements.get('homeImpossible').hidden,false);
// Entering from a paused in-flight round still initializes a fresh challenge ball.
run("ball.moving=true;phase='flight';startImpossible()");assert.equal(run('ball.moving'),false);assert.equal(run('phase'),'ready');run('exitImpossible()');assert.equal(run('ball.moving'),true);
console.log('PASS Impossible Hole entry, swing input, 20-stroke failure, retry, success and active-tour/career isolation.');
run("ball.moving=false;phase='ready';showCourses();startPractice('putting');puttScaleFeet=0;updateSuggestion()");
const autoRange=run('activeClub().range');assert.equal(elements.get('puttScaleControl').hidden,false);
elements.get('puttScale').value='360';elements.get('puttScale').onchange();assert.equal(run('activeClub().range'),120);assert.equal(run('actor.club.range'),120);assert(elements.get('puttScaleHint').textContent.includes('360 ft'));
run('beginCharge()');assert.equal(elements.get('puttScale').disabled,true);elements.get('puttScale').value='30';elements.get('puttScale').onchange();assert.equal(run('puttScaleFeet'),360);run('cancelSetup()');
elements.get('puttScale').value='0';elements.get('puttScale').onchange();assert.equal(run('activeClub().range'),autoRange);
run('clubIndex=0;updateSuggestion()');assert.equal(elements.get('puttScaleControl').hidden,true);assert.equal(run('activeClub().range'),run('upgradeClub(CLUBS[0],clubLevel(career,CLUBS[0].id)).range'));
console.log('PASS manual 360-foot putt scale, actual launch-club update, mid-swing lockout and Auto restoration.');
const flat={...courses.COURSES[0].holes[0],pin:[100,-180],greenRadius:400,slope:[0,0],contour:0,elevation:0,water:[],sand:[],island:false};
function puttRoll(range){const b=physics.makeBall(flat,0,-20);physics.launch(b,flat,{...physics.CLUBS[physics.PUTTER_INDEX],range},1,0,0);for(let i=0;i<5000&&b.moving;i++)physics.stepBall(b,flat,1/120);assert.equal(b.moving,false);return Math.hypot(b.x,b.z+20)*physics.YD*3;}
assert(puttRoll(120)>320);assert(puttRoll(120)>puttRoll(10)*8);console.log('PASS longer putt scales produce longer physical rollout at full power.');
