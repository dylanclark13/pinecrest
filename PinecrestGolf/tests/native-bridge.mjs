import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as physics from '../web/physics.js';
import * as courses from '../web/courses.js';
import * as progression from '../web/progression.js';
import * as character from '../web/character.js';
import * as challenges from '../web/challenges.js';
let disk='';const nativeMessages={};globalThis.window={webkit:{messageHandlers:{career:{postMessage:async b=>{if(b.operation==='read')return disk;disk=b.data;return true;}},haptic:{postMessage(){}},status:{postMessage:v=>nativeMessages.status=v},play:{postMessage:v=>nativeMessages.play=v},nativeError:{postMessage:v=>nativeMessages.error=v}}}};await import('../ios/PinecrestGolf/Game/native.js');const nativeFetch=window.fetch;
const html=fs.readFileSync(new URL('../ios/PinecrestGolf/Game/index.html',import.meta.url),'utf8');
const noop=()=>{},ctx2d=new Proxy({},{get:()=>noop,set:()=>true});
class Element{constructor(id){this.id=id;this.hidden=false;this.open=false;this.value='';this.dataset={};this.style={};this.width=300;this.height=400;this.classList={add:noop,remove:noop,toggle:noop};}getContext(){return ctx2d}setAttribute(){}getAttribute(){return 'false'}addEventListener(){}querySelector(){return new Element('child')}showModal(){this.open=true}close(){this.open=false}getBoundingClientRect(){return {left:0,top:0,width:300,height:400}}}
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
const document={getElementById(id){assert(elements.has(id),'Missing element '+id);return elements.get(id)},querySelector(){return [...elements.values()].find(e=>e.open)||null},querySelectorAll(){return []},addEventListener:noop,hidden:false};
let renderCalls=0;
class Renderer{constructor(){this.eye=[2,3,6];this.center=[0,0,0];this.trees=[]}loadHole(h){this.h=h}render(state){assert(state.hole);assert(Number.isFinite(state.ball.x));renderCalls++}pointOnCourse(){return null}}
const context=vm.createContext({...physics,...courses,...progression,...character,...challenges,console,document,window:{...window,dispatchEvent:noop,addEventListener:noop,matchMedia:()=>({matches:false})},requestAnimationFrame:noop,performance:{now:()=>1000},setInterval:()=>1,setTimeout:()=>1,clearTimeout:noop,structuredClone,GolfRenderer:Renderer,fetch:nativeFetch});
const source=fs.readFileSync(new URL('../ios/PinecrestGolf/Game/game.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');vm.runInContext(source,context);

await new Promise(r=>setImmediate(r));const run=s=>vm.runInContext(s,context);
await run('window.pinecrestNative("status")');assert.equal(nativeMessages.status.courses.length,8);assert.equal(nativeMessages.status.clubs.length,14);assert.equal(nativeMessages.error,undefined);
await run('window.pinecrestNative("start",{course:0,mode:"full"})');assert.equal(run('homeOpen'),false);assert(nativeMessages.play);
run('strokes=2;ball.x=4;ball.z=-32;holeMetrics.putts=1');await run('nativeCheckpoint()');assert.equal(JSON.parse(disk).checkpoint.strokes,2);
run('hasRound=false');await run('loadCareer()');await run('window.pinecrestNative("resume")');assert.equal(run('ball.x'),4);assert.equal(run('strokes'),2);
await run('window.pinecrestNative("pause")');assert.equal(run('nativePaused'),true);await run('window.pinecrestNative("wake")');assert.equal(run('nativePaused'),false);
await run('window.pinecrestNative("putting")');assert.equal(run('practice'),'putting');const before=JSON.parse(disk).profile.tokens;
run('strokes=1;ball.holed=true;finishHole()');assert.equal(JSON.parse(disk).profile.tokens,before);
await run('window.pinecrestNative("resume")');assert.equal(run('practice'),null);assert.equal(run('ball.x'),4);
await run('window.pinecrestNative("sound",true)');await run('window.pinecrestNative("status")');assert.equal(nativeMessages.status.sound,true);
await run('window.pinecrestNative("upgrade","driver")');assert(nativeMessages.error.includes('tokens'));
console.log('PASS native menu commands, summary payload, between-shot restore, pause, practice isolation, online separation, sound and insufficient-token errors.');
