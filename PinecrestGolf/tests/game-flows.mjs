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
const context=vm.createContext({createGolfMusic,GreenskeeperGame,KEEPER_TOOLS,...physics,...courses,...progression,...character,...challenges,console,document,window:{addEventListener:noop,matchMedia:()=>({matches:false})},requestAnimationFrame:noop,performance:{now:()=>1000},setTimeout:()=>1,clearTimeout:noop,structuredClone,GolfRenderer:Renderer,fetch:async(path,options)=>{const r=await request(path,options?.body?JSON.parse(options.body):undefined,'ui');return {ok:r.status===200,json:async()=>r.body}}});
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
