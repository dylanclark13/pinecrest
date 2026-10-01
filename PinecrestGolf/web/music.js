// Original procedural score: mellow keys, warm sustained chords, and a soft bass.
// Synthesized locally, with no downloads or third-party recordings.
export function createGolfMusic(host, page) {
 const key='pinecrest-music-v1';
 let enabled=true,volume=.3,context=null,master=null,timer=null,unlocked=false,paused=false,quiet=false,step=0,next=0;
 const voices=new Set(),beat=60/76;
 const chords=[[48,55,59,64],[45,52,55,59],[41,48,52,57],[43,50,55,59],[48,55,60,64],[45,52,57,60],[41,48,55,60],[43,50,59,62]];
 const melody=[[76,0,79,76,74,0,71,0],[72,0,71,69,0,71,0,0],[69,0,72,76,0,72,69,0],[71,0,74,0,79,0,74,0]];
 try{const saved=JSON.parse(host.localStorage.getItem(key));if(saved){if(typeof saved.enabled==='boolean')enabled=saved.enabled;if(Number.isFinite(saved.volume))volume=Math.max(0,Math.min(1,saved.volume));}}catch{}
 const save=()=>{try{host.localStorage.setItem(key,JSON.stringify({enabled,volume}));}catch{}};
 const active=()=>enabled&&volume>0&&unlocked&&!paused&&!page.hidden;
 function gain(){if(master)master.gain.setTargetAtTime(active()?volume*(quiet?.18:.42):0,context.currentTime,.12);}
 function note(midi,time,length,level,type='sine'){
  const osc=context.createOscillator(),amp=context.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
  amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(level,time+.025);amp.gain.exponentialRampToValueAtTime(.0001,time+length);
  osc.connect(amp);amp.connect(master);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();amp.disconnect();};osc.start(time);osc.stop(time+length+.02);
 }
 function schedule(){
  timer=null;if(!active()||context.state!=='running')return;
  if(next<context.currentTime)next=context.currentTime+.04;
  while(next<context.currentTime+.18){
   const bar=Math.floor(step/8),chord=chords[bar%chords.length],part=step%8;
   if(part===0){for(const pitch of chord)note(pitch+12,next,beat*3.8,.023);note(chord[0]-12,next,beat*1.7,.08);}
   if(part===4)note(chord[0]-12,next,beat*1.5,.055);
   note(chord[[0,2,1,3,2,1,3,1][part]]+12,next,beat*.8,.045,'triangle');
   const lead=melody[bar%4][part];if(lead&&bar%8>=4){note(lead,next,beat*1.3,.052);note(lead+12,next,beat*.55,.01);}
   step++;next+=beat/2;
  }
  timer=host.setTimeout(schedule,80);
 }
 function stop(){
  if(timer!==null){host.clearTimeout(timer);timer=null;}
  if(!context)return;gain();
  for(const voice of voices){try{voice.stop();}catch{}}voices.clear();next=context.currentTime+.05;
  context.suspend().catch(()=>{});
 }
 async function sync(){
  if(!active()){stop();return;}
  try{
   const Audio=host.AudioContext||host.webkitAudioContext;if(!Audio)return;
   if(!context){context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);}
   await context.resume();if(!active()){stop();return;}gain();if(timer===null)schedule();
  }catch{/* Autoplay restrictions leave music silent until another user gesture. */}
 }
 function unlock(){unlocked=true;void sync();}
 page.addEventListener('pointerdown',unlock,{passive:true});page.addEventListener('keydown',unlock);
 page.addEventListener('visibilitychange',()=>{void sync();});
 host.addEventListener('pagehide',()=>{paused=true;stop();});
 host.addEventListener('pageshow',()=>{paused=false;void sync();});
 return {
  get enabled(){return enabled;},get volume(){return volume;},
  setEnabled(value){enabled=Boolean(value);save();unlock();},
  setVolume(value){const n=Number(value);if(!Number.isFinite(n))return;volume=Math.max(0,Math.min(1,n));save();unlock();},
  setPaused(value){paused=Boolean(value);void sync();},
  setQuiet(value){if(quiet!==Boolean(value)){quiet=Boolean(value);gain();}}
 };
}
