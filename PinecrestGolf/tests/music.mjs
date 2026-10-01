import assert from 'node:assert/strict';
import {createGolfMusic} from '../web/music.js';
const events={},hostEvents={},timers=new Map(),stored=new Map();let id=0,contexts=0,notes=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
class Audio {
 constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};}
 resume(){this.state='running';return Promise.resolve();}
 suspend(){this.state='suspended';return Promise.resolve();}
 createGain(){return {gain:param(),connect(){},disconnect(){}};}
 createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){notes++;},stop(){this.onended?.();}};}
}
const host={AudioContext:Audio,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},addEventListener:(n,fn)=>hostEvents[n]=fn,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id)};
const page={hidden:false,addEventListener:(n,fn)=>events[n]=fn};
const music=createGolfMusic(host,page),flush=()=>new Promise(r=>setImmediate(r));
assert.equal(contexts,0,'no audio context before interaction');events.pointerdown();await flush();assert.equal(contexts,1);assert(notes>0);assert.equal(timers.size,1);
events.pointerdown();events.keydown();await flush();assert.equal(timers.size,1,'gestures do not stack loops');
page.hidden=true;events.visibilitychange();await flush();assert.equal(timers.size,0,'hidden page stops scheduling');
page.hidden=false;events.visibilitychange();await flush();assert.equal(timers.size,1);
music.setEnabled(false);await flush();assert.equal(timers.size,0);music.setVolume(.6);await flush();assert.equal(timers.size,0,'volume does not override mute');
const restored=createGolfMusic({...host,addEventListener(){}},{hidden:false,addEventListener(){}});assert.equal(restored.enabled,false);assert.equal(restored.volume,.6);
music.setEnabled(true);await flush();music.setPaused(true);await flush();assert.equal(timers.size,0);music.setPaused(false);await flush();assert.equal(timers.size,1);
music.setVolume(0);await flush();assert.equal(timers.size,0);music.setVolume(.3);await flush();assert.equal(timers.size,1);
hostEvents.pagehide();await flush();assert.equal(timers.size,0);
console.log('PASS audio gesture gating, one scheduler, background/native pause, mute, zero volume and saved settings.');
