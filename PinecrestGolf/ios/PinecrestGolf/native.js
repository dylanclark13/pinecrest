import {CLUB_IDS, UPGRADE_COSTS, holeReward} from './progression.js';
const PARS=[4,3,5,4,3,5,4,4,4,4,3,5,4,4,3,5,4,4];
const bridge=window.webkit.messageHandlers.career;
let state=null, queue=Promise.resolve();
const fresh=()=>({version:2,profile:{tokens:0,clubLevels:{},holes:0,rounds:0},round:null});
function validate(s){
 if(s?.version===1){const p=s.profile;const tier=Math.max(0,Math.min(4,p.equipped||0));s={...s,version:2,profile:{tokens:Math.floor((p.xp||0)/10),clubLevels:Object.fromEntries(['driver','3wood','5iron','7iron','9iron','pw','sw','putter'].map(id=>[id,tier])),holes:p.holes||0,rounds:p.rounds||0}};if(s.round)s.round.rewards=Object.fromEntries(Object.keys(s.round.rewards||{}).map(k=>[k,0]));}
 if(s?.version!==2||!s.profile||!['tokens','holes','rounds'].every(k=>Number.isSafeInteger(s.profile[k])&&s.profile[k]>=0)||!s.profile.clubLevels||Object.entries(s.profile.clubLevels).some(([id,l])=>!CLUB_IDS.includes(id)||!Number.isInteger(l)||l<0||l>4))throw Error('Saved career is unreadable. Your save has been preserved.');
 if(s.round&&(!Array.isArray(s.round.scores)||!s.round.rewards||!Number.isInteger(s.round.next_hole)))throw Error('Saved round is unreadable. Your save has been preserved.');
 return s;
}
async function load(){if(!state){const raw=await bridge.postMessage({operation:'read'});state=raw?validate(JSON.parse(raw)):fresh();}return state;}
const profile=s=>s.profile;
const round=s=>s.round?.status==='active'?s.round:null;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
async function handle(path,options){
 try{
  const current=await load();
  if(path==='/api/profile'&&(options.method||'GET')==='GET')return json({profile:profile(current),round:round(current)});
  if(options.method!=='POST')return json({error:'Unsupported request.'},405);
  const b=JSON.parse(options.body||'{}'),s=JSON.parse(JSON.stringify(current));let extra={};
  if(path==='/api/upgrade'){
   if(!CLUB_IDS.includes(b.clubId)||!Number.isInteger(b.expectedLevel)||b.expectedLevel<0||b.expectedLevel>=4)return json({error:'Choose a valid upgrade.'},400);
   const cost=UPGRADE_COSTS[b.expectedLevel];if((s.profile.clubLevels[b.clubId]||0)!==b.expectedLevel||s.profile.tokens<cost)return json({error:'Your balance or club level changed. Please retry.',profile:s.profile},409);
   s.profile.tokens-=cost;s.profile.clubLevels[b.clubId]=b.expectedLevel+1;extra={spent:cost,clubId:b.clubId};
  }else if(path==='/api/rounds'){
   if(!Number.isInteger(b.course)||b.course<0||b.course>3||!['front','back','full'].includes(b.mode))return json({error:'Choose a course and round length.'},400);
   s.round={id:'round-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),course:b.course,mode:b.mode,next_hole:b.mode==='back'?9:0,end_hole:b.mode==='front'?8:17,status:'active',scores:[],rewards:{}};
  }else if(/^\/api\/rounds\/[^/]+\/holes$/.test(path)){
   const r=s.round;if(!r||path.split('/')[3]!==r.id)return json({error:'Round not found.'},404);
   if(!Number.isInteger(b.hole)||b.hole<0||b.hole>17||!Number.isInteger(b.strokes)||b.strokes<1||b.strokes>13)return json({error:'Invalid score.'},400);
   if(r.rewards[b.hole]!==undefined)return json({profile:profile(s),round:round(s),earned:r.rewards[b.hole],duplicate:true});
   if(r.status!=='active'||r.next_hole!==b.hole)return json({error:'Finish the current hole first.'},409);
   const done=b.hole===r.end_hole,roundBonus=done?(r.mode==='full'?20:8):0,earned=holeReward(b.strokes,PARS[b.hole],r.course+1)+roundBonus;
   s.profile.tokens+=earned;s.profile.holes++;if(done)s.profile.rounds++;
   r.scores.push({hole:b.hole,strokes:b.strokes});r.rewards[b.hole]=earned;r.next_hole++;if(done)r.status='complete';extra={earned,roundBonus};
  }else return json({error:'Not found.'},404);
  await bridge.postMessage({operation:'write',data:JSON.stringify(s)});state=s;
  return json({profile:profile(s),round:round(s),...extra});
 }catch(error){return json({error:error.message||'Progress could not be saved. Please retry.'},503);}
}
window.fetch=(input,options={})=>{
 const path=typeof input==='string'?input:input.url;
 if(!path.startsWith('/api/'))return Promise.reject(Error('This app uses bundled game content.'));
 const task=queue.then(()=>handle(path,options));queue=task.catch(()=>{});return task;
};
window.golfHaptic=kind=>window.webkit.messageHandlers.haptic.postMessage(kind);
