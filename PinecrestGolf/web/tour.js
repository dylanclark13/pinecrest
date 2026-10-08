import {inWater,surface,CLUBS,PUTTER_INDEX,YD,lieFactor,height,makeBall,stepBall,greenGradient} from './physics.js';
// A seeded field stays the same when a tournament is resumed or reloaded.
const NAMES=['Alex Mercer','Theo Brooks','Mateo Reyes','Owen Park','Finn Wallace','Jules Bennett','Noah Okada','Leo Sullivan','Sam Patel','Eli Morgan','Luca Rossi','Max Chen','Ben Anders','Kai Williams','Nico Costa','Adam Shah','Sean Walker','Jack Ellis','Rory Hayes'];
export function tourRandom(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createTourField(id,holes,level=1){
 return NAMES.map((name,i)=>{
  const rand=tourRandom(id+':'+i),skill=rand(),form=[rand(),rand(),rand()];
  // Ability changes execution, never a target score or the number of waypoints.
  const ability=form.map(f=>Math.max(0,Math.min(1,skill+(f-.5)*.3)));
  const shots=Array.from({length:54},(_,h)=>planTourHole(holes[h%18],id+':'+name,h,ability[Math.floor(h/18)],level));
  const scores=shots.map(plan=>plan.length);
  return {id:i,name,scores,shots,appearance:{skin:i%6,shirt:(i+2)%6,pants:i%4,cap:i%5,hat:true}};
 });
}

export function tourStandings(field,scores,holes,name='You'){
 const through=scores.findIndex(x=>x==null),count=through<0?scores.length:through;
 const rows=[{id:'you',name,scores},...field].map(p=>{const rounds=[0,1,2].map(r=>{const n=Math.max(0,Math.min(18,count-r*18));return n?p.scores.slice(r*18,r*18+n).reduce((a,b)=>a+b,0):null;});return {...p,through:count,total:rounds.reduce((a,b)=>a+(b||0),0),toPar:p.scores.slice(0,count).reduce((a,b,i)=>a+b-holes[i%18].par,0),rounds};}).sort((a,b)=>a.toPar-b.toPar||String(a.id).localeCompare(String(b.id)));
 for(const row of rows){row.rank=1+rows.filter(p=>p.toPar<row.toPar).length;row.place=(rows.filter(p=>p.toPar===row.toPar).length>1?'T':'')+row.rank;}
 return rows;
}
export function tourPartners(field,scores,holes,round){
 if(round===0)return field.slice(0,2);
 const previous=scores.slice(0,round*18),board=tourStandings(field,previous,holes),at=board.findIndex(p=>p.id==='you');
 return board.filter(p=>p.id!=='you').sort((a,b)=>Math.abs(board.indexOf(a)-at)-Math.abs(board.indexOf(b)-at)).slice(0,2).map(p=>field.find(f=>f.id===p.id));
}
export function tourClub(hole,from,to,putt=false){
 if(putt)return {clubIndex:PUTTER_INDEX,capacity:30,power:Math.min(1,Math.hypot(to[0]-from[0],to[1]-from[1])/30)};
 const lie=surface(hole,...from),dx=to[0]-from[0],dz=to[1]-from[1],distance=Math.hypot(dx,dz);
 const wind=((hole.wind?.[0]||0)*dx+(hole.wind?.[1]||0)*dz)/Math.max(1,distance);
 const climb=Math.max(0,height(hole,...to)-height(hole,...from));
 const choices=CLUBS.map((club,clubIndex)=>({clubIndex,capacity:Math.max(5,club.range/YD*lieFactor(lie,club,hole)*.94+Math.min(0,wind)*2-climb*.8)})).filter(c=>c.clubIndex!==PUTTER_INDEX&&(lie!=='sand'||CLUBS[c.clubIndex].type==='wedge')&&(lie==='tee'||c.clubIndex!==0));
 choices.sort((a,b)=>a.capacity-b.capacity);const chosen=choices.find(c=>c.capacity>=distance)||choices.at(-1);
 return {...chosen,power:Math.min(1,distance/chosen.capacity)};
}
function canPuttToCup(hole,from){
 const d=Math.hypot(from[0]-hole.pin[0],from[1]-hole.pin[1]);if(d>=30)return false;
 const [gx,gz]=greenGradient(hole,...from);
 const deceleration=(hole.greenFriction??.52)+9.81*(gx*(hole.pin[0]-from[0])+gz*(hole.pin[1]-from[1]))/Math.max(d,.01);
 // A steep downhill roll cannot arrive slowly enough for cup capture; chip closer.
 if(-2*deceleration*d>1.5**2)return false;
 for(let i=0;i<=32;i++){const x=from[0]+(hole.pin[0]-from[0])*i/32,z=from[1]+(hole.pin[1]-from[1])*i/32;if(!['green','fringe'].includes(surface(hole,x,z))||Math.hypot(...greenGradient(hole,x,z))>.12)return false;}
 return true;
}
// Use the player's rolling physics; never force the ball to a preset finishing point.
export function planTourPutt(hole,from,aimError=0,paceError=0){
 const dx=hole.pin[0]-from[0],dz=hole.pin[1]-from[1],distance=Math.hypot(dx,dz),friction=hole.greenFriction??.52;
 const [gx,gz]=greenGradient(hole,...from);
 // Use the slope along the line for pace, not flat-green friction. On fast
 // greens a flat estimate caused repeated overshoots even with zero error.
 const deceleration=friction+9.81*(gx*dx+gz*dz)/Math.max(distance,.01);
 const duration=Math.max(.15,2*distance/(Math.sqrt(Math.max(.09,2*deceleration*distance+.49))+.7));
 let vx=dx/duration+(.5*friction*dx/Math.max(distance,.01)+4.905*gx)*duration;
 let vz=dz/duration+(.5*friction*dz/Math.max(distance,.01)+4.905*gz)*duration;
 function simulate(x,z,seconds,capture,record=false,dt=1/120){
  const b=makeBall(hole,...from);b.vx=x;b.vz=z;b.moving=true;const path=record?[[0,b.x,b.y,b.z]]:null;let event=null;
  const count=Math.ceil(seconds/dt);
  for(let i=0;i<count&&b.moving;i++){event=stepBall(b,hole,dt,capture);if(record&&(i%4===3||!b.moving))path.push([b.time,b.x,b.y,b.z]);}
  return {b,path,event};
 }
 // Solve launch velocity against the rolling integrator. A local Jacobian
 // accounts for contours; retain the best solution if a trial crosses a hazard.
 let best={error:Infinity,vx,vz};
 for(let i=0;i<8;i++){
  const dt=i<5?1/30:1/120;
  if(i===5)best={error:Infinity,vx,vz};
  const {b}=simulate(vx,vz,duration,false,false,dt),ex=hole.pin[0]-b.x,ez=hole.pin[1]-b.z,error=Math.hypot(ex,ez);
  if(error<best.error)best={error,vx,vz};
  if(error<.008){if(i>=5)break;i=4;continue;}
  const epsilon=.02,bx=simulate(vx+epsilon,vz,duration,false,false,dt).b,bz=simulate(vx,vz+epsilon,duration,false,false,dt).b;
  const xx=(bx.x-b.x)/epsilon,xz=(bz.x-b.x)/epsilon,zx=(bx.z-b.z)/epsilon,zz=(bz.z-b.z)/epsilon,det=xx*zz-xz*zx;
  let sx=ex/duration,sz=ez/duration;
  if(Math.abs(det)>.001){sx=(ex*zz-ez*xz)/det;sz=(ez*xx-ex*zx)/det;}
  const limit=Math.max(.5,Math.hypot(vx,vz)*.5),scale=Math.min(1,limit/Math.max(.001,Math.hypot(sx,sz)));
  vx+=sx*scale*.9;vz+=sz*scale*.9;
 }
 ({vx,vz}=best);
 const heading=Math.atan2(dz,dx),desired=Math.atan2(vz,vx),offset=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading)),speed0=Math.hypot(vx,vz),limited=heading+Math.max(-Math.PI/4,Math.min(Math.PI/4,offset));vx=Math.cos(limited)*speed0;vz=Math.sin(limited)*speed0;
 const c=Math.cos(aimError),sn=Math.sin(aimError),ax=(vx*c-vz*sn)*(1+paceError),az=(vx*sn+vz*c)*(1+paceError);
 const {b,path,event}=simulate(ax,az,40,true,true),speed=Math.hypot(ax,az);
 return {from:[...from],to:[b.x,b.z],distance:Math.hypot(b.x-from[0],b.z-from[1]),putt:true,clubIndex:PUTTER_INDEX,capacity:Math.max(30,speed*speed/(2*friction)),power:Math.min(1,speed*speed/(2*friction*30)),angle:Math.atan2(ax,-az),velocity:[ax,az],path,duration:b.time,holed:!!b.holed,water:event==='water',out:event==='out'};
}
export function tourPuttFrame(shot,time){
 const path=shot.path,t=Math.max(0,Math.min(time,shot.duration));let lo=0,hi=path.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(path[mid][0]<=t)lo=mid;else hi=mid;}
 const a=path[lo],b=path[hi],f=b[0]>a[0]?Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))):0;
 return {x:a[1]+(b[1]-a[1])*f,y:a[2]+(b[2]-a[2])*f,z:a[3]+(b[3]-a[3])*f};
}
function planTourHole(hole,name,index,ability=.5,level=hole.level||1){
 const rand=tourRandom(name+':'+index),shots=[];
 const errorScale=(1.25-ability*.65)*(1+(level-1)*.01);
 let from=[0,0],recover=false,hazardMisses=0;
 function landingCost(p){
  const lie=surface(hole,...p),length=Math.hypot(p[0]-from[0],p[1]-from[1]);
  if(['water','out'].includes(lie)||length>tourClub(hole,from,p).capacity*.98)return Infinity;
  // After losing a ball, favor a wider safety margin on the next attempt.
  const margin=Math.min(Math.hypot(from[0]-hole.pin[0],from[1]-hole.pin[1])*.4,(1.2+length*.035)*errorScale)*(1+hazardMisses*.5);
  let risk=0;
  for(let k=0;k<8;k++){
   const a=k*Math.PI/4,edge=surface(hole,p[0]+Math.cos(a)*margin,p[1]+Math.sin(a)*margin);
   if(['water','out'].includes(edge))risk+=14;
  }
  return Math.hypot(p[0]-hole.pin[0],p[1]-hole.pin[1])+risk+(lie==='sand'?35:lie==='rough'?16:0);
 }
 function record(shot){
  shots.push(shot);
  if(shot.water||shot.out){
   hazardMisses++;
   shots.push({from:[...shot.to],to:[...from],distance:0,putt:false,penalty:true,reason:shot.water?'Water':'Out of bounds',holed:false});
  }else {from=[...shot.to];hazardMisses=0;}
 }
 // This is a fault guard, not a score cap: never truncate or manufacture a hole-out.
 for(let attempt=0;attempt<40;attempt++){
  if(!recover&&canPuttToCup(hole,from)){
   const d=Math.hypot(from[0]-hole.pin[0],from[1]-hole.pin[1]);
   // Pace/line errors need a lighter touch on fast greens: the same
   // velocity error travels farther when friction is low.
   const lineError=errorScale*Math.min(1,d/2),paceError=lineError*Math.min(1,(hole.greenFriction??.52)/.6)**2;
   const putt=planTourPutt(hole,from,(rand()-.5)*.24*lineError,(rand()-.5)*.24*paceError);
   record(putt);if(putt.holed)return shots;
   recover=putt.water||putt.out;
   continue;
  }
  recover=false;
  const distance=Math.hypot(from[0]-hole.pin[0],from[1]-hole.pin[1]);
  let target=[...hole.pin];
  if(distance>tourClub(hole,from,target).capacity*.94){
   const heading=Math.atan2(target[1]-from[1],target[0]-from[0]),reach=tourClub(hole,from,target).capacity;
   const candidates=[];
   for(const fraction of [.94,.8,.6,.4,.2])for(const offset of [0,.2,-.2,.45,-.45,.8,-.8,1.2,-1.2]){
    const a=heading+offset,p=[from[0]+Math.cos(a)*reach*fraction,from[1]+Math.sin(a)*reach*fraction],lie=surface(hole,...p);
    if(['water','out'].includes(lie)||Math.hypot(p[0]-from[0],p[1]-from[1])>tourClub(hole,from,p).capacity*.98)continue;
    candidates.push({p,cost:landingCost(p)});
   }
   candidates.sort((a,b)=>a.cost-b.cost);
   if(!candidates.length)throw Error('NPC has no legal landing spot.');
   target=candidates[0].p;
  }else{
   // Favor the safe side of a guarded green, or lay up for a shorter chip.
   // The resulting execution error can still miss that landing area.
   const candidates=[target];
   for(const radius of [Math.min(5,hole.greenRadius*.4),25,45])for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    candidates.push([hole.pin[0]+Math.cos(a)*radius,hole.pin[1]+Math.sin(a)*radius]);
   }
   const ranked=candidates.map(p=>({p,cost:landingCost(p)})).filter(c=>Number.isFinite(c.cost));
   ranked.sort((a,b)=>a.cost-b.cost);
   if(ranked.length)target=ranked[0].p;
  }
  // Sample execution once. A miss into a hazard counts; no rerolls for a better score.
  const length=Math.hypot(target[0]-from[0],target[1]-from[1]);
  const spread=Math.min(distance*.4,(1.2+length*.035)*errorScale),angle=rand()*Math.PI*2,radius=Math.sqrt(rand())*spread;
  let to=[target[0]+Math.cos(angle)*radius,target[1]+Math.sin(angle)*radius];
  // Wind, elevation and the actual lie still constrain every played club.
  for(let i=0;i<20;i++){
   const d=Math.hypot(to[0]-from[0],to[1]-from[1]),capacity=tourClub(hole,from,to).capacity;
   if(d<=capacity)break;
   const f=capacity*.98/d;to=[from[0]+(to[0]-from[0])*f,from[1]+(to[1]-from[1])*f];
  }
  const club=tourClub(hole,from,to),d=Math.hypot(to[0]-from[0],to[1]-from[1]);
  if(d>club.capacity+.001)throw Error('NPC shot exceeds club capacity.');
  record({from:[...from],to,distance:d,putt:false,water:inWater(hole,...to),out:surface(hole,...to)==='out',holed:false,...club});
 }
 throw Error('NPC could not finish hole '+hole.id+' ('+name+':'+index+').');
}
export function tourShot(hole,player,index,shot){
 const plan=player.shots?.[index]||planTourHole(hole,player.name,index);
 return plan[shot-1];
}
