import {CLUB_IDS,UPGRADE_COSTS,holeReward} from './progression.js';
import {unlockedCourses,medal,dailyChallenge} from './challenges.js';
import {validAppearance,DEFAULT_LOOK} from './character.js';
const bridge=window.webkit.messageHandlers.career;
let state=null,queue=Promise.resolve();
const fresh=()=>({version:3,profile:{tokens:0,clubLevels:{},holes:0,rounds:0,displayName:'Golfer',appearance:{...DEFAULT_LOOK},onboarded:false},round:null,history:[],dailyRewards:{},checkpoint:null});
function validate(s){
 if(s?.version===1){const p=s.profile,tier=Math.max(0,Math.min(4,p.equipped||0));s={...s,version:2,profile:{tokens:Math.floor((p.xp||0)/10),clubLevels:Object.fromEntries(CLUB_IDS.map(id=>[id,tier])),holes:p.holes||0,rounds:p.rounds||0}};if(s.round)s.round.rewards={};}
 if(s?.version===2)s={...fresh(),...s,version:3,profile:{...fresh().profile,...s.profile}};
 if(s?.version!==3||!s.profile||!['tokens','holes','rounds'].every(k=>Number.isSafeInteger(s.profile[k])&&s.profile[k]>=0)||!s.profile.clubLevels||Object.entries(s.profile.clubLevels).some(([id,l])=>!CLUB_IDS.includes(id)||!Number.isInteger(l)||l<0||l>4)||!Array.isArray(s.history)||!s.dailyRewards)throw Error('Saved career is unreadable. Your save has been preserved.');
 if(s.round&&(!Array.isArray(s.round.scores)||!s.round.rewards||!Number.isInteger(s.round.next_hole)))throw Error('Saved round is unreadable. Your save has been preserved.');return s;
}
async function load(){if(!state){const raw=await bridge.postMessage({operation:'read'});state=raw?validate(JSON.parse(raw)):fresh();}return state;}
function progress(s){const best={};for(const r of s.history)if(r.status==='complete'&&r.mode==='full'&&r.scores.length===18){const total=r.scores.reduce((a,h)=>a+h.strokes,0);best[r.course]=Math.min(best[r.course]??Infinity,total);}return {courseBest:best,courseMedals:Object.fromEntries(Object.entries(best).map(([c,v])=>[c,medal(v)])),unlockedCourses:unlockedCourses(best)};}
const profile=s=>({...s.profile,...progress(s)});
const round=s=>s.round?.status==='active'?{...s.round,checkpoint:s.checkpoint}:null;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const nativeID=()=>{const h=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const pars=[4,3,5,4,3,5,4,4,4,4,3,5,4,4,3,5,4,4];
function stats(s){const v={scoredHoles:0,trackedHoles:0,putts:0,fairwayAttempts:0,fairways:0,greenAttempts:0,greens:0};for(const r of [...s.history,...(s.round?[s.round]:[])])if(r.mode!=='daily')for(const h of r.scores){v.scoredHoles++;if(!h.metrics)continue;v.trackedHoles++;v.putts+=h.metrics.putts;v.greenAttempts++;v.greens+=h.metrics.gir;if(h.metrics.fairway!==null){v.fairwayAttempts++;v.fairways+=h.metrics.fairway;}}return v;}
async function handle(path,options){try{
 const current=await load(),post=options.method==='POST';
 if(!post){
 if(path==='/api/profile')return json({profile:profile(current),round:round(current),guest:false,account:null});
 if(path==='/api/stats')return json({stats:stats(current),...progress(current)});
 if(path==='/api/daily'){const daily=dailyChallenge();return json({daily,reward:current.dailyRewards[daily.day]??null});}
 if(path==='/api/records'){const records=[];for(let course=0;course<8;course++)for(const mode of ['front','back','full']){const totals=current.history.filter(r=>r.status==='complete'&&r.course===course&&r.mode===mode).map(r=>r.scores.reduce((a,h)=>a+h.strokes,0)),personal=totals.length?Math.min(...totals):null;records.push({course,mode,personal,leaders:personal===null?[]:[{name:current.profile.displayName,strokes:personal}]});}return json({records});}
 return json({error:'Not found.'},404);
 }
 const b=JSON.parse(options.body||'{}'),s=structuredClone(current);let extra={};
 if(path==='/api/checkpoint'){if(s.round?.status==='active'&&b.roundId===s.round.id&&b.hole===s.round.next_hole)s.checkpoint=b;else return json({ok:false});}
 else if(path==='/api/customize'){const name=String(b.displayName||'').trim();if(name.length<2||name.length>24||!validAppearance(b.appearance))throw Error('Choose a valid golfer name and appearance.');s.profile.displayName=name;s.profile.appearance=b.appearance;}
 else if(path==='/api/onboarding')s.profile.onboarded=true;
 else if(path==='/api/upgrade'){const level=b.expectedLevel;if(!CLUB_IDS.includes(b.clubId)||!Number.isInteger(level)||level<0||level>=4)throw Error('Choose a valid upgrade.');const cost=UPGRADE_COSTS[level];if((s.profile.clubLevels[b.clubId]||0)!==level||s.profile.tokens<cost)throw Error('Not enough tokens, or club level changed.');s.profile.tokens-=cost;s.profile.clubLevels[b.clubId]=level+1;extra={spent:cost};}
 else if(path==='/api/rounds'||path==='/api/daily'){
 const daily=path==='/api/daily'?dailyChallenge():null,c=daily?daily.course:b.course,mode=daily?'daily':b.mode;
 if(!Number.isInteger(c)||!progress(s).unlockedCourses.includes(c)||!['front','back','full','daily'].includes(mode))throw Error('Choose an available course and round.');
 if(s.round){s.history.push({...s.round,status:'closed'});}s.checkpoint=null;
 s.round={id:nativeID(),course:c,mode,daily,next_hole:daily?daily.start:mode==='back'?9:0,end_hole:daily?daily.end:mode==='front'?8:17,status:'active',scores:[],rewards:{}};
 }else if(/^\/api\/rounds\/[^/]+\/holes$/.test(path)){
 const r=s.round;if(!r||path.split('/')[3]!==r.id){const previous=s.history.find(r=>r.id===path.split('/')[3]);if(previous?.rewards[b.hole]!==undefined)return json({profile:profile(s),round:round(s),earned:previous.rewards[b.hole],duplicate:true});throw Error('Round not found.');}
 if(!Number.isInteger(b.hole)||b.hole<0||b.hole>17||!Number.isInteger(b.strokes)||b.strokes<1||b.strokes>13)throw Error('Invalid score.');
 if(r.rewards[b.hole]!==undefined)return json({profile:profile(s),round:round(s),earned:r.rewards[b.hole],duplicate:true});
 if(r.status!=='active'||r.next_hole!==b.hole)throw Error('Finish the current hole first.');
 const m=b.metrics;if(m&&(!Number.isInteger(m.putts)||m.putts<0||m.putts>b.strokes||![null,0,1].includes(m.fairway)||![0,1].includes(m.gir)))throw Error('Invalid statistics.');
 const done=b.hole===r.end_hole,isDaily=r.mode==='daily',roundBonus=done&&!isDaily?(r.mode==='full'?20:8):0;let earned=isDaily?0:holeReward(b.strokes,pars[b.hole],r.course+1)+roundBonus,dailyReward=0;
 r.scores.push({hole:b.hole,strokes:b.strokes,metrics:m});
 if(isDaily&&done&&s.dailyRewards[r.daily.day]===undefined){const total=r.scores.reduce((a,h)=>a+h.strokes,0),par=pars.slice(r.daily.start,r.daily.end+1).reduce((a,b)=>a+b,0);dailyReward=total<=par?50:total<=par+3?40:35;s.dailyRewards[r.daily.day]=dailyReward;earned+=dailyReward;}
 s.profile.tokens+=earned;if(!isDaily){s.profile.holes++;if(done)s.profile.rounds++;}r.rewards[b.hole]=earned;r.next_hole++;s.checkpoint=null;if(done){r.status='complete';s.history.push(r);s.round=null;}extra={earned,roundBonus,dailyReward};
 }else throw Error('Use Online career in the native menu for email accounts. Device careers stay on this device.');
 await bridge.postMessage({operation:'write',data:JSON.stringify(s)});state=s;return json({profile:profile(s),round:round(s),...extra});
 }catch(error){return json({error:error.message||'Save failed. Please retry.'},503);}}
window.fetch=(input,options={})=>{const path=typeof input==='string'?input:input.url;if(!path.startsWith('/api/'))return Promise.reject(Error('Offline game uses bundled content.'));const task=queue.then(()=>handle(path,options));queue=task.catch(()=>{});return task;};
window.golfHaptic=kind=>window.webkit.messageHandlers.haptic.postMessage(kind);
