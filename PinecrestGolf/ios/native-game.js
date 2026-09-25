// App-only integration, appended to the bundled game module by sync-game.mjs.
let nativeCheckpointKey='',nativePaused=false,nativePublished=false;
async function nativeCheckpoint(){
 if(practice||!hasRound||!roundId||finished||ball.moving||phase!=='ready')return;
 const value={roundId,hole:holeIndex,ball:{...ball},strokes,clubIndex,angle,spinBack,spinShape,holeMetrics:{...holeMetrics},greenGrid,view};
 const key=JSON.stringify(value);if(key===nativeCheckpointKey)return;
 await api('/api/checkpoint',value);nativeCheckpointKey=key;
}
function restoreNativeCheckpoint(v){
 if(!v||v.roundId!==roundId||v.hole!==holeIndex||!v.ball||!['x','y','z'].every(k=>Number.isFinite(v.ball[k]))||!Number.isInteger(v.strokes)||v.strokes<0||v.strokes>12||!Number.isInteger(v.clubIndex)||v.clubIndex<0||v.clubIndex>=CLUBS.length||!Number.isFinite(v.angle))return;
 ball={...v.ball,moving:false,holed:false};strokes=v.strokes;clubIndex=v.clubIndex;angle=v.angle;spinBack=clamp(v.spinBack||0,-1,1);spinShape=clamp(v.spinShape||0,-1,1);holeMetrics=v.holeMetrics||holeMetrics;greenGrid=!!v.greenGrid;view=['follow','overhead','putting'].includes(v.view)?v.view:'follow';setAddress();syncSpin();updateSuggestion();drawMap();
}
async function nativeStatus(){
 if(!profileLoaded)return;
 const data=await api('/api/stats');
 const clubs=CLUBS.map(c=>{const level=clubLevel(career,c.id),now=upgradeClub(c,level),next=level<4?upgradeClub(c,level+1):null;return {id:c.id,name:c.name,level:level+1,cost:UPGRADE_COSTS[level]||0,carry:now.range,nextCarry:next?.range||now.range,forgiveness:Math.round((now.forgiveness-1)*100),nextForgiveness:next?Math.round((next.forgiveness-1)*100):Math.round((now.forgiveness-1)*100),spin:c.type==='putter'?0:Math.round(now.spinControl*100),nextSpin:c.type==='putter'?0:Math.round((next?.spinControl||now.spinControl)*100)};});
 nativePublished=true;window.webkit.messageHandlers.status.postMessage({tokens:career.tokens,name:career.displayName||'Golfer',courses:COURSES.map((c,i)=>({id:i,name:c.name,difficulty:c.difficulty,available:career.unlockedCourses.includes(i),best:career.courseBest[i]??0,medal:career.courseMedals[i]||''})),clubs,stats:data.stats,resume:Boolean(savedRound||hasRound),sound:sound});
}
window.pinecrestNative=async(action,value)=>{
 try{
 if(action==='pause'){await nativeCheckpoint();cancelSetup();nativePaused=true;return;}
 if(action==='wake'){nativePaused=false;return;}
 if(action==='status'){await nativeStatus();return;}
 if(action==='sound'){sound=Boolean(value);return;}
 if(action==='controller'){if(nativePaused)return;const code=value.code;window.dispatchEvent(new KeyboardEvent(value.down?'keydown':'keyup',{code,repeat:false,bubbles:true}));return;}
 if(['downswing','flight'].includes(phase)||savePending||pendingScore)throw Error('Wait until the shot and score finish saving.');
 await nativeCheckpoint();cancelSetup();
 if(action==='upgrade'){const club=CLUBS.find(c=>c.id===value);if(!club)throw Error('Club not found.');const data=await api('/api/upgrade',{clubId:value,expectedLevel:clubLevel(career,value)});career=data.profile;renderHome();await nativeStatus();return;}
 for(const d of document.querySelectorAll('dialog[open]'))d.close();
 if(action==='start'){const data=await api('/api/rounds',value);if(practice)leavePractice();career=data.profile;savedRound=data.round;applyRound(data.round);}
 else if(action==='resume'){if(practice)leavePractice();if(!hasRound&&!savedRound)throw Error('Start a round first.');resumeSavedRound();}
 else if(action==='range'||action==='putting'){startPractice(action==='range'?'range':'putting');}
 else if(action==='daily'){const data=await api('/api/daily',{});if(practice)leavePractice();career=data.profile;savedRound=data.round;applyRound(data.round);}
 else if(action==='character'){showCourses();setHomeTab('character');}
 else if(action==='tutorial')showOnboarding();
 else return;
 nativePaused=false;window.webkit.messageHandlers.play.postMessage(true);
 }catch(e){window.webkit.messageHandlers.nativeError.postMessage(e.message);}
};
setInterval(()=>{if(profileLoaded&&!nativePublished)nativeStatus().catch(()=>{});nativeCheckpoint().catch(e=>window.webkit.messageHandlers.nativeError.postMessage(e.message));},2000);
window.addEventListener('pagehide',()=>{nativeCheckpoint().catch(()=>{});});
