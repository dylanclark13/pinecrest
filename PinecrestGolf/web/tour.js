import {inWater,surface,CLUBS,PUTTER_INDEX,YD,lieFactor,height,makeBall,stepBall,greenGradient} from './physics.js';
// A seeded field stays the same when a tournament is resumed or reloaded.
const NAMES=['Alex Mercer','Theo Brooks','Mateo Reyes','Owen Park','Finn Wallace','Jules Bennett','Noah Okada','Leo Sullivan','Sam Patel','Eli Morgan','Luca Rossi','Max Chen','Ben Anders','Kai Williams','Nico Costa','Adam Shah','Sean Walker','Jack Ellis','Rory Hayes'];
export function tourRandom(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createTourField(id,holes,level=1){
 return NAMES.map((name,i)=>{const rand=tourRandom(id+':'+i),skill=rand()*.09,form=[rand(),rand(),rand()];
 const scores=Array.from({length:54},(_,h)=>{const par=holes[h%18].par,r=rand(),pressure=(level-1)*.007+(form[Math.floor(h/18)]-.5)*.035-skill;const delta=r<.018-pressure/5?-2:r<.27-pressure?-1:r<.80-pressure?0:r<.965-pressure/2?1:2;return Math.max(1,par+delta);});
 const shots=scores.map((score,h)=>planTourHole(holes[h%18],id+':'+name,h,score));shots.forEach((plan,h)=>scores[h]=plan.length);
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
 for(let i=0;i<=32;i++){const x=from[0]+(hole.pin[0]-from[0])*i/32,z=from[1]+(hole.pin[1]-from[1])*i/32;if(!['green','fringe'].includes(surface(hole,x,z))||Math.hypot(...greenGradient(hole,x,z))>.12)return false;}
 return true;
}
// Use the player's rolling physics; never force the ball to a preset finishing point.
export function planTourPutt(hole,from,aimError=0,paceError=0){
 const dx=hole.pin[0]-from[0],dz=hole.pin[1]-from[1],distance=Math.hypot(dx,dz),friction=hole.greenFriction??.52;
 const duration=Math.max(.15,2*distance/(Math.sqrt(2*friction*distance+.49)+.7));
 const [gx,gz]=greenGradient(hole,...from);
 let vx=dx/duration+(.5*friction*dx/Math.max(distance,.01)+4.905*gx)*duration;
 let vz=dz/duration+(.5*friction*dz/Math.max(distance,.01)+4.905*gz)*duration;
 function simulate(x,z,seconds,capture,record=false,dt=1/120){
  const b=makeBall(hole,...from);b.vx=x;b.vz=z;b.moving=true;const path=record?[[0,b.x,b.y,b.z]]:null;let event=null;
  const count=Math.ceil(seconds/dt);
  for(let i=0;i<count&&b.moving;i++){event=stepBall(b,hole,dt,capture);if(record&&(i%4===3||!b.moving))path.push([b.time,b.x,b.y,b.z]);}
  return {b,path,event};
 }
 // Solve a line and pace that reaches the cup with modest speed, including slope and contours.
 for(let i=0;i<6;i++){
  const {b}=simulate(vx,vz,duration,false,false,i===5?1/120:1/30);const ex=dx-(b.x-from[0]),ez=dz-(b.z-from[1]);
  if(Math.hypot(ex,ez)<.008&&i===5)break;
  vx+=ex/duration*.9;vz+=ez/duration*.9;
 }
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
function planTourHole(hole,name,index,total){
 const rand=tourRandom(name+':'+index),side=(rand()-.5)*8;
 function position(n){
  if(n<=0)return [0,0];if(n>=total)return [...hole.pin];
  if(n===total-1)return [hole.pin[0]+1.4+Math.abs(side)*.3,hole.pin[1]+1.8];
  if(n===total-2)return [hole.pin[0]+side*.65,hole.pin[1]+5];
  const fraction=n/Math.max(1,total-2),lengths=hole.path.slice(1).map((p,i)=>Math.hypot(p[0]-hole.path[i][0],p[1]-hole.path[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*fraction;
  for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=remaining/lengths[i];return [hole.path[i][0]+(hole.path[i+1][0]-hole.path[i][0])*t+side,hole.path[i][1]+(hole.path[i+1][1]-hole.path[i][1])*t];}remaining-=lengths[i];}return [...hole.pin];
 }
 const shots=[];let from=[0,0];
 function stroke(to,holed=false){
  const distance=Math.hypot(to[0]-from[0],to[1]-from[1]);
  const putt=false;
  const water=inWater(hole,...to),out=surface(hole,...to)==='out';
  shots.push({from:[...from],to:[...to],distance,putt,water,out,holed:holed&&!water&&!out,...tourClub(hole,from,to,putt)});
  if(water||out)shots.push({from:[...to],to:[...from],distance:0,putt:false,penalty:true,reason:water?'Water':'Out of bounds',holed:false});
  else from=[...to];
 }
 for(let n=1;n<=total;n++){
  if(['green','fringe'].includes(surface(hole,...from))&&Math.hypot(from[0]-hole.pin[0],from[1]-hole.pin[1])<30){
   if(!canPuttToCup(hole,from)){stroke(hole.pin,true);return shots;}
   for(let attempt=0;attempt<12;attempt++){
    const putt=planTourPutt(hole,from,attempt===0?(rand()-.5)*.035:0,attempt===0?(rand()-.5)*.10:0);shots.push(putt);
    if(putt.holed)return shots;
    if(putt.water||putt.out){shots.push({from:putt.to,to:[...from],distance:0,putt:false,penalty:true,reason:putt.water?'Water':'Out of bounds',holed:false});}
    else from=[...putt.to];
    if(!canPuttToCup(hole,from)||attempt>=3&&(putt.water||putt.out)){stroke(hole.pin,true);return shots;}
   }
   stroke(hole.pin,true);return shots;
  }
  const target=position(n);
  // Add actual approach/recovery strokes instead of stretching a shot to match a predetermined score.
  for(let step=0;Math.hypot(target[0]-from[0],target[1]-from[1])>tourClub(hole,from,target).capacity+.001;step++){
   if(step>40)throw Error('NPC could not find a reachable route.');
   const heading=Math.atan2(target[1]-from[1],target[0]-from[0]),reach=tourClub(hole,from,target).capacity;
   const candidates=[];
   for(const fraction of [.98,.8,.6,.4,.2])for(const offset of [0,.2,-.2,.45,-.45,.8,-.8,1.2,-1.2]){
    const a=heading+offset,p=[from[0]+Math.cos(a)*reach*fraction,from[1]+Math.sin(a)*reach*fraction],lie=surface(hole,...p);
    if(['water','out'].includes(lie)||Math.hypot(p[0]-from[0],p[1]-from[1])>tourClub(hole,from,p).capacity)continue;
    candidates.push({p,cost:Math.hypot(p[0]-target[0],p[1]-target[1])+(lie==='sand'?25:lie==='rough'?8:0)});
   }
   candidates.sort((a,b)=>a.cost-b.cost);if(!candidates.length)throw Error('NPC has no legal landing spot.');stroke(candidates[0].p);
  }
  stroke(target,n===total);
 }

 return shots;
}
export function tourShot(hole,player,index,shot){
 const plan=player.shots?.[index]||planTourHole(hole,player.name,index,player.scores[index]);
 return plan[shot-1];
}
