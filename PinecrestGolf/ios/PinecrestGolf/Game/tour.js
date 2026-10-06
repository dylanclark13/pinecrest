// A seeded field stays the same when a tournament is resumed or reloaded.
const NAMES=['Alex Mercer','Theo Brooks','Mateo Reyes','Owen Park','Finn Wallace','Jules Bennett','Noah Okada','Leo Sullivan','Sam Patel','Eli Morgan','Luca Rossi','Max Chen','Ben Anders','Kai Williams','Nico Costa','Adam Shah','Sean Walker','Jack Ellis','Rory Hayes'];
export function tourRandom(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createTourField(id,holes,level=1){
 return NAMES.map((name,i)=>{const rand=tourRandom(id+':'+i),skill=rand()*.09,form=[rand(),rand(),rand()];
 const scores=Array.from({length:54},(_,h)=>{const par=holes[h%18].par,r=rand(),pressure=(level-1)*.007+(form[Math.floor(h/18)]-.5)*.035-skill;const delta=r<.018-pressure/5?-2:r<.27-pressure?-1:r<.80-pressure?0:r<.965-pressure/2?1:2;return Math.max(1,par+delta);});
 return {id:i,name,scores,appearance:{skin:i%6,shirt:(i+2)%6,pants:i%4,cap:i%5,hat:true}};
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
export function tourShot(hole,player,index,shot){
 const total=player.scores[index],rand=tourRandom(player.name+':'+index),side=(rand()-.5)*8;
 function position(n){
  if(n<=0)return [0,0];if(n>=total)return [...hole.pin];
  if(n===total-1)return [hole.pin[0]+1.4+Math.abs(side)*.3,hole.pin[1]+1.8];
  if(n===total-2)return [hole.pin[0]+side*.65,hole.pin[1]+5];
  const fraction=n/Math.max(1,total-2),lengths=hole.path.slice(1).map((p,i)=>Math.hypot(p[0]-hole.path[i][0],p[1]-hole.path[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*fraction;
  for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=remaining/lengths[i];return [hole.path[i][0]+(hole.path[i+1][0]-hole.path[i][0])*t+side,hole.path[i][1]+(hole.path[i+1][1]-hole.path[i][1])*t];}remaining-=lengths[i];}return [...hole.pin];
 }
 const from=position(shot-1),to=position(shot),distance=Math.hypot(to[0]-from[0],to[1]-from[1]);
 return {from,to,distance,putt:distance<14&&shot>1,holed:shot===total};
}
