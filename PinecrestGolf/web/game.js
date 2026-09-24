import {PALETTES,DEFAULT_LOOK} from './character.js';
import {CLUBS,PUTTER_INDEX,YD,clamp,height,surface,makeBall,launch,stepBall,recommendedClub,lieFactor,effectiveWind,greenGradient,bunkerRadius} from './physics.js';
import {GolfRenderer} from './renderer.js';
import {COURSES,TOTAL_HOLES} from './courses.js';
import {TIERS,UPGRADE_COSTS,clubLevel,upgradeClub} from './progression.js';
const $=id=>document.getElementById(id),canvas=$('course'),map=$('minimap'),mapCtx=map.getContext('2d');
let renderer;try{renderer=new GolfRenderer(canvas);}catch(error){$('loadError').hidden=false;console.error(error);}
let courseIndex=1,course=COURSES[1],HOLES=course.holes,roundMode='full',roundStart=0,roundEnd=17,pendingCourse=1,pendingRound='full';
let holeIndex=0,hole=HOLES[0],ball=makeBall(hole),clubIndex=0,angle=0,view='follow',strokes=0,scores=Array(HOLES.length).fill(null);
let phase='ready',power=0,suggested=1,chargeTime=0,timingTime=0,timingNeedle=-1,accuracy=0,downswingTime=0,followTime=0,actor=null;
let trail=[],lastLie={x:0,z:0},shotStart={x:0,z:0},shotDistance=0,shotCarry=0,shotInFlight=false,finished=false,greenGrid=false;
let homeOpen=true,hasRound=false,homeTab='play',guestCareer=false,profileLoaded=false,profileBusy=false,career={tokens:0,clubLevels:{},holes:0,rounds:0},savedRound=null,roundId=null,savePending=false,pendingScore=null,spinBack=0,spinShape=0;
let account=null,appearanceDraft={...DEFAULT_LOOK},authMode='login',onboardingStep=0,onboardingSeen=false,recordData=[];
let sound=false,audioContext=null,toastTimer=0,mapTransform=null,collisionCooldown=0,aimTarget=[...hole.pin],aimKey=0,pointerAim=0,lastStrike='';
const scoreText=n=>n===0?'E':n>0?'+'+n:String(n);
const totalScore=()=>scores.reduce((s,n,i)=>n===null?s:s+n-HOLES[i].par,0);
const isModal=()=>document.querySelector('dialog[open]')!==null;
const ready=()=>!homeOpen&&phase==='ready'&&!finished&&!isModal();
const finalHole=()=>holeIndex===roundEnd;
function activeClub(){const c=upgradeClub(CLUBS[clubIndex],clubLevel(career,CLUBS[clubIndex].id));if(clubIndex!==PUTTER_INDEX)return c;const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD;return {...c,range:Math.round(clamp(d*1.75,3,30))};}
function toast(text,duration=3000){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
function playTone(kind){if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime,notes=kind==='cup'?[523,659,784,1046]:kind==='hit'?[clubIndex===PUTTER_INDEX?330:150]:kind==='water'?[100,70]:[200];notes.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=kind==='hit'?'triangle':'sine';osc.frequency.setValueAtTime(freq,now+i*.12);if(kind==='hit')osc.frequency.exponentialRampToValueAtTime(50,now+.12);gain.gain.setValueAtTime(.0001,now+i*.12);gain.gain.exponentialRampToValueAtTime(.12,now+i*.12+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.12+.22);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.12);osc.stop(now+i*.12+.25);});}catch{sound=false;}}
function setAddress(){actor={x:ball.x,z:ball.z,angle,club:activeClub(),appearance:career.appearance,phase:'address',progress:0,power:.7};}
function updateSuggestion(){
  if(phase!=='ready')return;const c=activeClub(),d=Math.hypot(aimTarget[0]-ball.x,aimTarget[1]-ball.z)*YD,lie=surface(hole,ball.x,ball.z),roll=c.type==='wood'?1.1:c.type==='putter'?1:1.045;
  suggested=clamp(d/(c.range*lieFactor(lie,c,hole)*roll),.008,1);suggested=Math.round(suggested*20)/20;
  const showGuide=courseIndex<3;$('suggestion').hidden=!showGuide;$('powerTarget').hidden=!showGuide;
  $('powerTarget').style.left=clamp(suggested*100-2,0,96)+'%';$('powerTarget').style.width='4%';
  $('suggestion').textContent=clubIndex===PUTTER_INDEX?'Flat-ground guide '+Math.round(suggested*100)+'%':'Range guide '+Math.round(suggested*100)+'% · wind excluded';setAddress();updateUI();
}
function updateUI(){
  $('game').classList.toggle('ball-in-play',['downswing','flight'].includes(phase));
  const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD,lie=surface(hole,ball.x,ball.z),c=activeClub();const sweet=Math.min(.30,hole.sweetSpot*c.forgiveness*(c.type==='putter'?1.15:1));$('sweetSpot').style.left=(50-sweet*50)+'%';$('sweetSpot').style.width=sweet*100+'%';
  $('pinDistance').innerHTML=d<10?(d*3).toFixed(1)+' <small>ft</small>':Math.round(d)+' <small>yd</small>';
  $('strokeValue').textContent=ball.moving||finished?strokes:strokes+1;$('roundScore').textContent=scoreText(totalScore());
  $('lieLabel').textContent=({tee:'TEE BOX',green:'ON THE GREEN',fringe:'FRINGE',fairway:'FAIRWAY',rough:'DEEP ROUGH',sand:'BUNKER',water:'WATER',out:'OUT OF BOUNDS',path:'CART PATH'})[lie];
  $('clubName').textContent=c.name;$('clubTierLabel').textContent=TIERS[clubLevel(career,CLUBS[clubIndex].id)].name.toUpperCase()+' CLUB';$('hudLevel').textContent=career.tokens+' TOKENS';$('spinButton').disabled=phase!=='ready'||clubIndex===PUTTER_INDEX;$('spinSummary').textContent=clubIndex===PUTTER_INDEX?'Putt':spinBack||spinShape?'Set':'Neutral';$('clubDistance').textContent=c.range+' yd '+(clubIndex===PUTTER_INDEX?'putt scale':'carry')+' · '+c.loft+'°';
  $('powerValue').innerHTML=Math.round(power*100)+'<span>%</span>';$('powerFill').style.width=power*100+'%';$('carryValue').textContent=Math.round(c.range*power*lieFactor(lie,c,hole))+' yd';
  $('swingButton').disabled=['downswing','flight','complete'].includes(phase);
  $('swingText').textContent=phase==='accuracy'?'Tap to strike':phase==='power'?'Release for timing':phase==='downswing'?'Swinging…':phase==='flight'?'Ball in play':finished?'Hole complete':'Hold to swing';
  $('powerTitle').textContent=phase==='power'?'1 · SET YOUR POWER':phase==='accuracy'?'POWER LOCKED':'SWING POWER';
  $('aimTip').style.opacity=phase==='ready'?'1':'0';$('clubPrev').disabled=$('clubNext').disabled=phase!=='ready';
  $('flightReadout').hidden=!ball.moving;$('timingPanel').hidden=phase!=='accuracy';$('timingMarker').style.left=(timingNeedle+1)*50+'%';
  $('swingButton').classList.toggle('timing-active',phase==='accuracy');
  $('statusLine').textContent=phase==='accuracy'?'TAP SPACE OR THE BUTTON AS THE MARKER CROSSES THE CENTER':phase==='downswing'?'KEEP YOUR EYE ON THE BALL':ball.moving?'BALL IN PLAY · '+lastStrike:finished?'HOLE COMPLETE':lie==='green'?'FAST GREEN · READ THE BREAK':lie==='sand'?'DEEP BUNKER · WEDGE RECOMMENDED':lie==='rough'?'DEEP ROUGH · '+Math.round(hole.roughFactor*100)+'% CARRY':strokes===0?'CHAMPIONSHIP TEES · TIMED STRIKES':'FIND YOUR LINE · COMMIT TO THE SHOT';
  $('roundProgress').textContent='Hole '+(holeIndex+1)+' · '+(roundMode==='full'?'18 hole round':roundMode==='front'?'Front nine':'Back nine');$('courseTitle').textContent=course.name.toUpperCase()+' · '+course.difficulty.toUpperCase();
  const elev=(height(hole,...hole.pin)-height(hole,ball.x,ball.z))*3.28084;
  $('elevationValue').textContent=(elev>=0?'+':'')+Math.round(elev)+' ft';$('lieImpact').textContent=Math.round(lieFactor(lie,c,hole)*100)+'% carry';
  const slope=greenGradient(hole,ball.x,ball.z);$('greenReading').textContent=lie==='green'?'Slope '+(Math.hypot(...slope)*100).toFixed(1)+'%':'Green pace: '+(course.level===1?'moderate':course.level===4?'very fast':'fast');
  $('gridButton').classList.toggle('selected',greenGrid);$('gridButton').setAttribute('aria-pressed',String(greenGrid));
  const wind=effectiveWind(hole,ball.moving?ball.time:0),mph=Math.hypot(...wind)*2.23694;
  $('windValue').innerHTML=Math.round(mph)+' <small>mph</small>';$('gustValue').textContent='Gusts '+Math.round(Math.hypot(...hole.wind)*2.23694*1.35);
  $('windArrow').style.transform='rotate('+(Math.atan2(wind[0],-wind[1])-angle)+'rad)';
}
function startHole(index){
  holeIndex=index;hole=HOLES[index];ball=makeBall(hole);strokes=0;finished=false;phase='ready';power=0;trail=[];followTime=0;clubIndex=recommendedClub(hole,ball);greenGrid=false;spinBack=0;spinShape=0;syncSpin();
  angle=Math.atan2(hole.pin[0],-hole.pin[1]);aimTarget=[...hole.pin];renderer?.loadHole(hole);
  $('holeName').textContent=hole.name;$('holeCount').textContent=String(index+1).padStart(2,'0')+' / '+HOLES.length;$('parValue').textContent=hole.par;
  const length=hole.path.reduce((s,p,i)=>i?s+Math.hypot(p[0]-hole.path[i-1][0],p[1]-hole.path[i-1][1]):0,0);$('lengthValue').textContent=Math.round(length*YD);
  $('holeAdvice').textContent=hole.tip;$('sweetSpot').style.left=(50-hole.sweetSpot*50)+'%';$('sweetSpot').style.width=hole.sweetSpot*100+'%';$('shotSummary').hidden=true;updateSuggestion();drawMap();
}
function aimAt(x,z){if(!ready())return;if(Math.hypot(x-ball.x,z-ball.z)<.2)return;angle=Math.atan2(x-ball.x,-(z-ball.z));aimTarget=[x,z];updateSuggestion();drawMap();}
function aimDelta(delta){if(!ready())return;angle+=delta;const d=Math.max(1,Math.hypot(aimTarget[0]-ball.x,aimTarget[1]-ball.z));aimTarget=[ball.x+Math.sin(angle)*d,ball.z-Math.cos(angle)*d];updateSuggestion();drawMap();}
function changeClub(delta){if(!ready())return;clubIndex=(clubIndex+delta+CLUBS.length)%CLUBS.length;updateSuggestion();}
function beginCharge(){
  if(phase==='accuracy'){commitStrike();return;}
  if(!ready()||!renderer)return;phase='power';chargeTime=0;power=.008;actor.phase='backswing';actor.progress=0;$('shotSummary').hidden=true;updateUI();
  if(sound)try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch{}
}
function releasePower(){if(phase!=='power')return;phase='accuracy';power=clamp(power,.008,1);timingTime=0;timingNeedle=-1;actor.phase='set';actor.progress=1;actor.power=power;updateUI();}
function cancelSetup(){if(phase==='power'||phase==='accuracy'){phase='ready';power=0;setAddress();updateSuggestion();}aimKey=0;pointerAim=0;}
function commitStrike(){
  if(phase!=='accuracy'||isModal())return;
  const timingWindow=Math.min(.30,hole.sweetSpot*activeClub().forgiveness*(clubIndex===PUTTER_INDEX?1.15:1));const perfect=Math.abs(timingNeedle)<timingWindow;accuracy=perfect?0:Math.sign(timingNeedle)*(Math.abs(timingNeedle)-timingWindow)/(1-timingWindow);
  lastStrike=perfect?'PURE STRIKE':Math.abs(accuracy)<.2?'SOLID CONTACT':accuracy<0?'EARLY · HOOK':'LATE · SLICE';
  if(clubIndex===PUTTER_INDEX&&!perfect)lastStrike=accuracy<0?'PULLED PUTT':'PUSHED PUTT';
  phase='downswing';downswingTime=0;actor.phase='downswing';actor.progress=0;actor.power=power;actor.club=activeClub();actor.angle=angle;updateUI();
}
function impact(){
  lastLie={x:ball.x,z:ball.z};shotStart={...lastLie};shotDistance=0;shotCarry=0;shotInFlight=true;collisionCooldown=0;trail=[];strokes++;
  launch(ball,hole,actor.club,power,angle,accuracy,{back:spinBack,shape:spinShape});phase='flight';followTime=0;actor.phase='follow';actor.progress=0;playTone('hit');
  toast(lastStrike==='PURE STRIKE'?'Pure strike.':lastStrike.toLowerCase().replace(/^./,c=>c.toUpperCase()),1700);updateUI();drawMap();
}
function restAfterShot(penalty=false){
  trail=[];power=0;phase='ready';aimTarget=[...hole.pin];angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z));clubIndex=recommendedClub(hole,ball);
  const lie=surface(hole,ball.x,ball.z);greenGrid=lie==='green'||lie==='fringe';
  $('shotSummary').hidden=false;$('shotResult').textContent=penalty?'PENALTY · +1':lastStrike;$('lastCarry').textContent=Math.round(shotCarry*YD)+' yd';$('lastTotal').textContent=Math.round(shotDistance*YD)+' yd';
  updateSuggestion();drawMap();if(strokes>=12){finishHole(true);return;}
  const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD;
  if(!penalty)toast(lie==='green'?'On the green · '+(d<10?(d*3).toFixed(1)+' ft':Math.round(d)+' yd')+' to the cup.':lie==='sand'?'Deep bunker. Open the sand wedge and commit.':lie==='rough'?'Deep rough. Expect reduced carry.':Math.round(shotDistance*YD)+' yd · '+Math.round(shotCarry*YD)+' yd carry');
}
function finishHole(limit=false){
  if(finished)return;finished=true;phase='complete';power=0;scores[holeIndex]=strokes;pendingScore={roundId,hole:holeIndex,strokes};saveHoleResult();const n=strokes-hole.par;
  $('resultTitle').textContent=limit?'Stroke limit.':strokes===1?'Hole in one!':n<=-3?'Albatross!':n===-2?'Eagle!':n===-1?'Birdie.':n===0?'Par.':n===1?'Bogey.':n===2?'Double bogey.':'In the cup.';
  $('resultEyebrow').textContent=finalHole()?'ROUND COMPLETE':holeIndex===8?'FRONT NINE COMPLETE':'HOLE '+String(holeIndex+1).padStart(2,'0')+' COMPLETE';
  $('resultCopy').textContent=finalHole()?(roundEnd-roundStart+1)+' holes complete. You finished '+scoreText(totalScore())+' at '+course.name+'.':limit?'12 strokes reached. Pick up and start fresh on the next hole.':n<0?'A well-earned score on a demanding course.':n===0?'Right on the number. Keep it going.':'A new hole is a fresh start.';
  $('resultStrokes').textContent=strokes;$('resultPar').textContent=scoreText(n);$('resultRound').textContent=scoreText(totalScore());$('nextHole').textContent=finalHole()?'Back to the clubhouse ↗':holeIndex===8?'Start the back nine ↗':'Next hole ↗';playTone('cup');updateUI();drawMap();
  setTimeout(()=>{if(finished&&!$('holeDialog').open)$('holeDialog').showModal();},700);
}
function showScore(){
  cancelSetup();let body='';for(let i=0;i<HOLES.length;i++){if(i<roundStart||i>roundEnd)continue;if(i===roundStart||i===9)body+='<tr class="nine-heading"><td colspan="4">'+(i===0?'FRONT NINE':'BACK NINE')+'</td></tr>';const h=HOLES[i];body+='<tr class="'+(i===holeIndex?'current-row':'')+'"><td>'+String(i+1).padStart(2,'0')+'</td><td>'+h.name+'</td><td>'+h.par+'</td><td>'+(scores[i]??(i===holeIndex&&strokes?strokes+'*':'—'))+'</td></tr>';if(i===8||i===17){const from=i-8,part=scores.slice(from,i+1),total=part.reduce((s,n)=>s+(n??0),0);body+='<tr class="nine-total"><td colspan="2">'+(i===8?'OUT':'IN')+'</td><td>36</td><td>'+(part.every(n=>n===null)?'—':total)+'</td></tr>';}}
  $('scoreTable').innerHTML='<table><thead><tr><th>HOLE</th><th>NAME</th><th>PAR</th><th>SCORE</th></tr></thead><tbody>'+body+'</tbody><tfoot><tr><td colspan="2">ROUND · '+scoreText(totalScore())+'</td><td>'+HOLES.slice(roundStart,roundEnd+1).reduce((s,h)=>s+h.par,0)+'</td><td>'+scores.reduce((s,n)=>s+(n??0),0)+'</td></tr></tfoot></table><p>* Hole in progress. Round score includes completed holes.</p>';$('scoreDialog').showModal();
}
function toggleView(){cancelSetup();view=view==='follow'?'overview':'follow';$('cameraText').textContent=view==='overview'?'Golfer view':'Course view';}
function drawMap(){
  const c=mapCtx,w=map.width,h=map.height,pad=22,minZ=hole.pin[1]-32,maxZ=18,scale=Math.min((w-2*pad)/180,(h-2*pad)/(maxZ-minZ));mapTransform={scale,cx:w/2,cz:pad+maxZ*scale};
  const pos=(x,z)=>[w/2+x*scale,pad+(maxZ-z)*scale];c.clearRect(0,0,w,h);c.lineCap='round';c.lineJoin='round';c.beginPath();(hole.centerline||hole.path).forEach((p,i)=>{const [x,y]=pos(...p);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.strokeStyle='#395c37';c.lineWidth=hole.width*2*scale+7;c.stroke();c.strokeStyle='#699552';c.lineWidth=hole.width*2*scale;c.stroke();
  for(const s of hole.water){const [x,y]=pos(s[0],s[1]);c.fillStyle='#6babb2';c.beginPath();c.ellipse(x,y,s[2]*scale,s[3]*scale,0,0,Math.PI*2);c.fill();}
  const [px,py]=pos(...hole.pin);if(hole.island){c.fillStyle='#62844c';c.beginPath();c.arc(px,py,(hole.greenRadius+5)*scale,0,Math.PI*2);c.fill();}c.fillStyle='#90b86b';c.beginPath();c.arc(px,py,hole.greenRadius*scale,0,Math.PI*2);c.fill();
  for(const s of hole.sand){c.fillStyle='#806c45';c.beginPath();for(let i=0;i<=56;i++){const a=i/56*Math.PI*2,r=bunkerRadius(s,a),[x,y]=pos(s[0]+Math.cos(a)*s[2]*r,s[1]+Math.sin(a)*s[3]*r);if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();c.strokeStyle='#e1d0a0';c.lineWidth=1.5;c.stroke();}
  c.strokeStyle='#f6f4e4';c.lineWidth=2;c.beginPath();c.moveTo(px,py);c.lineTo(px,py-15);c.stroke();c.fillStyle='#efd482';c.beginPath();c.moveTo(px,py-15);c.lineTo(px+10,py-12);c.lineTo(px,py-8);c.fill();
  const [bx,by]=pos(ball.x,ball.z);if(phase==='ready'){const d=Math.min(180,activeClub().range/YD),end=[ball.x+Math.sin(angle)*d,ball.z-Math.cos(angle)*d],[ex,ey]=pos(...end);c.strokeStyle='#e2f7aaa0';c.setLineDash([4,5]);c.lineWidth=1.5;c.beginPath();c.moveTo(bx,by);c.lineTo(ex,ey);c.stroke();c.setLineDash([]);}
  c.fillStyle='#fff';c.beginPath();c.arc(bx,by,4,0,Math.PI*2);c.fill();c.strokeStyle='#ffffff66';c.lineWidth=1;c.beginPath();c.arc(bx,by,7,0,Math.PI*2);c.stroke();
}
async function api(path,body){
 const options={headers:{'content-type':'application/json'},credentials:'same-origin'};if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}const response=await fetch(path,options);let data;try{data=await response.json();}catch{throw Error('The connection was interrupted. Please retry.');}if(!response.ok)throw Error(data.error||'Progress is unavailable. Please retry.');return data;
}
function homeMessage(message,error=false){$('progressStatus').textContent=message;$('progressStatus').classList.toggle('error',error);}
async function loadCareer(){
 if(profileBusy)return;profileBusy=true;$('homeRetry').hidden=true;homeMessage('Loading saved career…');
 try{const data=await api('/api/profile');career=data.profile;savedRound=data.round;account=data.account||null;appearanceDraft={...DEFAULT_LOOK,...career.appearance};guestCareer=Boolean(data.guest);profileLoaded=true;$('saveDetails').textContent=guestCareer?'Guest progress is linked to this browser. Clearing cookies starts a new career.':'Progress and rounds save after every hole.';homeMessage(guestCareer?'Guest career saved for this browser.':'Career saved to your account.');}catch(error){homeMessage(error.message,true);$('homeRetry').hidden=false;}
 finally{profileBusy=false;renderHome();renderCharacter();renderAccount();if(profileLoaded&&!career.onboarded&&!onboardingSeen&&!isModal()){onboardingSeen=true;showOnboarding();}}
}
function setHomeTab(tab){homeTab=tab;$('homeScreen').classList.toggle('character-view',tab==='character');for(const [id,name]of[['homePlay','play'],['homeEquipment','equipment'],['homeCharacter','character'],['homeRecords','records']])$(id).hidden=tab!==name;for(const [id,name]of[['playTab','play'],['equipmentTab','equipment'],['characterTab','character'],['recordsTab','records']]){$(id).classList.toggle('selected',tab===name);$(id).setAttribute('aria-pressed',String(tab===name));}renderEquipment();if(tab==='character'){appearanceDraft={...DEFAULT_LOOK,...career.appearance};renderCharacter();}if(tab==='records')loadRecords();}
function showCourses(){
 if(savePending||pendingScore){toast('Save this hole before returning to the clubhouse.');return;}cancelSetup();pendingCourse=courseIndex;pendingRound=roundMode;for(const d of document.querySelectorAll('dialog[open]'))d.close();homeOpen=true;$('homeScreen').hidden=false;$('game').classList.add('at-home');renderer?.loadHole(COURSES[pendingCourse].holes[0]);setHomeTab('play');renderHome();
}
function closeHome(){homeOpen=false;$('homeScreen').hidden=true;$('game').classList.remove('at-home');}
function renderHome(){
 const levels=CLUBS.map(c=>clubLevel(career,c.id)),upgrades=levels.reduce((a,b)=>a+b,0),costs=levels.filter(l=>l<4).map(l=>UPGRADE_COSTS[l]),next=costs.length?Math.min(...costs):null;
 $('careerLevel').textContent=career.tokens+' TOKENS';$('careerTier').textContent='14 clubs · Individual upgrades';$('homeLevel').textContent=career.tokens+' tokens';$('careerFill').style.width=(next?Math.min(1,career.tokens/next)*100:100)+'%';$('careerXP').textContent=profileLoaded?career.holes+' holes completed · '+upgrades+' club upgrades':'Loading progress…';$('careerNext').textContent=next?(career.tokens>=next?'Upgrade a club in My equipment':'Next upgrade starts at '+next+' tokens'):'Every club at maximum level';
 const canResume=hasRound&&!(finished&&finalHole())||savedRound;$('resumeRound').hidden=!canResume;$('resumeRound').textContent='Continue '+(hasRound?course.name:COURSES[savedRound?.course||0].name)+' · Hole '+(hasRound?holeIndex+1:(savedRound?.next_hole||0)+1)+' ↗';renderCourseChoices();renderEquipment();
}
function renderCourseChoices(){
 $('courseChoices').innerHTML=COURSES.map((c,i)=>'<button '+(c.requires&&!career.unlockedCourses?.includes(i)?'disabled ':'')+'class="course-choice '+(i===pendingCourse?'chosen':'')+'" data-course="'+i+'" aria-pressed="'+(i===pendingCourse)+'"><span class="course-art '+c.biome+'"><span>'+String(i+1).padStart(2,'0')+'</span><span class="course-selected-mark">'+(c.requires&&!career.unlockedCourses?.includes(i)?'LOCKED':i===pendingCourse?'SELECTED':'AVAILABLE')+'</span></span><span class="course-choice-body"><span class="course-choice-top"><span>'+c.tag+'</span><b>'+c.difficulty+'</b></span><strong>'+c.name+'</strong><span>'+c.description+(c.requires?'<br>Required full rounds: 72 strokes or fewer.<br>'+c.requires.map(r=>COURSES[r].name+': '+(career.courseBest?.[r]??'No full round')+' / 72').join('<br>'):'')+'</span><small>18 HOLES · PAR '+c.par+'</small></span></button>').join('');
 for(const b of document.querySelectorAll('[data-course]'))b.onclick=()=>{pendingCourse=Number(b.dataset.course);renderer?.loadHole(COURSES[pendingCourse].holes[0]);renderCourseChoices();};
 for(const b of document.querySelectorAll('[data-round]')){b.setAttribute('aria-pressed',String(b.dataset.round===pendingRound));b.classList.toggle('selected',b.dataset.round===pendingRound);b.onclick=()=>{pendingRound=b.dataset.round;renderCourseChoices();};}
 $('startRound').disabled=!profileLoaded||profileBusy||savePending||Boolean(COURSES[pendingCourse].requires&&!career.unlockedCourses?.includes(pendingCourse));$('startRound').textContent=profileBusy?'Loading…':'Play '+(pendingRound==='full'?'18 holes':pendingRound==='front'?'the front nine':'the back nine')+' ↗';$('roundResetNote').hidden=!(hasRound||savedRound);
}
function renderEquipment(){
 $('equipmentLevel').textContent=career.tokens+' TOKENS';
 $('equipmentChoices').innerHTML=CLUBS.map(c=>{const level=clubLevel(career,c.id),t=TIERS[level],club=upgradeClub(c,level),cost=UPGRADE_COSTS[level],next=level<4?upgradeClub(c,level+1):null,afford=career.tokens>=cost;
 return '<article class="equipment-card '+(level?'equipped':'')+'" style="--tier-color:rgb('+t.color.map(v=>Math.round(v*255)).join(',')+')"><div class="club-number">'+c.label+'</div><span class="small-label">LEVEL '+(level+1)+' / 5 · '+t.name+'</span><h2>'+c.name+'</h2><p>'+t.finish+'</p><dl><div><dt>'+ (c.type==='putter'?'Putt scale':'Carry')+'</dt><dd>'+club.range+' yd'+(next&&c.type!=='putter'?' → '+next.range:'')+'</dd></div><div><dt>Forgiveness</dt><dd>+'+Math.round((t.forgiveness-1)*100)+'%'+(next?' → +'+Math.round((next.forgiveness-1)*100)+'%':'')+'</dd></div><div><dt>Spin response</dt><dd>'+(c.type==='putter'?'Straight roll':Math.round(t.spin*100)+'%')+'</dd></div></dl><button data-upgrade="'+c.id+'" '+(!profileLoaded||!next||!afford?'disabled':'')+'>'+(!next?'Maximum level':afford?'Upgrade · '+cost+' tokens':'Need '+(cost-career.tokens)+' more tokens')+'</button><small>'+(next?'Next level costs '+cost+' tokens':'Fully upgraded')+'</small></article>';}).join('');
 for(const b of document.querySelectorAll('[data-upgrade]'))b.onclick=async()=>{const id=b.dataset.upgrade,expectedLevel=clubLevel(career,id);for(const button of document.querySelectorAll('[data-upgrade]'))button.disabled=true;try{const data=await api('/api/upgrade',{clubId:id,expectedLevel});career=data.profile;updateSuggestion();renderHome();homeMessage(CLUBS.find(c=>c.id===id).name+' upgraded to level '+(expectedLevel+2)+'. Spent '+data.spent+' tokens.');}catch(error){await loadCareer();homeMessage(error.message,true);renderEquipment();}};
 $('bagTitle').textContent='Your 14 clubs';$('bagDescription').textContent='Earn tokens on the course. Choose which club to improve. Upgrades cost 150, 400, 900 and 1,800 tokens.';$('bagClubs').innerHTML=CLUBS.map(c=>'<div><b>'+c.label+'</b><span>'+c.name+'</span><strong>Level '+(clubLevel(career,c.id)+1)+'</strong></div>').join('');
}
function applyRound(r){roundId=r.id;courseIndex=r.course;course=COURSES[courseIndex];HOLES=course.holes;roundMode=r.mode;roundStart=roundMode==='back'?9:0;roundEnd=roundMode==='front'?8:17;scores=Array(18).fill(null);for(const s of r.scores||[])scores[s.hole]=s.strokes;hasRound=true;closeHome();startHole(r.next_hole);}
async function startSelectedRound(){
 if(!profileLoaded||profileBusy||pendingScore)return;profileBusy=true;renderCourseChoices();
 try{const data=await api('/api/rounds',{course:pendingCourse,mode:pendingRound});career=data.profile;savedRound=data.round;applyRound(data.round);toast(course.name+' · '+course.difficulty+' · '+(roundEnd-roundStart+1)+' holes');}catch(error){homeMessage(error.message,true);}finally{profileBusy=false;renderCourseChoices();}
}
function resumeSavedRound(){if(hasRound&&finished&&savedRound){applyRound(savedRound);return;}if(hasRound&&!(finished&&finalHole())){closeHome();renderer?.loadHole(hole);updateUI();}else if(savedRound)applyRound(savedRound);}
async function saveHoleResult(){
 if(!pendingScore||savePending)return;savePending=true;$('nextHole').disabled=true;$('retryScore').hidden=true;$('resultXP').textContent='Saving your score…';const payload={...pendingScore};
 try{const data=await api('/api/rounds/'+payload.roundId+'/holes',{hole:payload.hole,strokes:payload.strokes});career=data.profile;savedRound=data.round;pendingScore=null;$('resultXP').textContent='+'+data.earned+' tokens'+(data.roundBonus?' · Round bonus included':'');$('resultUnlock').textContent=career.tokens+' tokens available. Spend them on individual clubs in My equipment.';$('nextHole').disabled=false;homeMessage(guestCareer?'Guest career saved for this browser.':'Career saved to your account.');}
 catch(error){$('resultXP').textContent='Score not saved yet.';$('resultUnlock').textContent=error.message;$('retryScore').hidden=false;}
 finally{savePending=false;}
}
function syncSpin(){
 $('spinSummary').textContent=clubIndex===PUTTER_INDEX?'Putt':spinBack||spinShape?'Set':'Neutral';$('backSpin').value=spinBack*100;$('sideSpin').value=spinShape*100;$('backSpinLabel').textContent=spinBack?Math.abs(Math.round(spinBack*100))+'% '+(spinBack>0?'backspin':'topspin'):'Neutral';$('sideSpinLabel').textContent=spinShape?Math.abs(Math.round(spinShape*100))+'% '+(spinShape<0?'draw':'fade'):'Straight';$('spinCapability').textContent=TIERS[clubLevel(career,CLUBS[clubIndex].id)].name+' clubs · '+Math.round(TIERS[clubLevel(career,CLUBS[clubIndex].id)].spin*100)+'% spin response. Rough and sand reduce control.';
}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderCharacter(){
 $('golferName').value=career.displayName||'Golfer';$('wearHat').checked=appearanceDraft.hat;
 $('appearanceChoices').innerHTML=Object.entries(PALETTES).map(([key,colors])=>'<fieldset><legend>'+({skin:'Skin tone',shirt:'Shirt',pants:'Trousers',cap:'Cap'}[key])+'</legend><div class="swatches">'+colors.map((color,i)=>'<button type="button" data-swatch="'+key+':'+i+'" style="background:'+color+'" class="swatch '+(appearanceDraft[key]===i?'chosen':'')+'" aria-label="'+key+' color '+(i+1)+'" aria-pressed="'+(appearanceDraft[key]===i)+'"></button>').join('')+'</div></fieldset>').join('');
 for(const button of document.querySelectorAll('[data-swatch]'))button.onclick=()=>{const [key,index]=button.dataset.swatch.split(':'),name=$('golferName').value;appearanceDraft[key]=Number(index);renderCharacter();$('golferName').value=name;};
}
$('wearHat').onchange=e=>{appearanceDraft.hat=e.target.checked;};
$('saveGolfer').onclick=async()=>{$('saveGolfer').disabled=true;try{const data=await api('/api/customize',{displayName:$('golferName').value.trim(),appearance:appearanceDraft});career=data.profile;updateSuggestion();$('golferStatus').textContent='Golfer saved.';}catch(error){$('golferStatus').textContent=error.message;}finally{$('saveGolfer').disabled=false;}};
async function loadRecords(){ $('recordCards').textContent='Loading course records…';try{const data=await api('/api/records');recordData=data.records;renderRecords();}catch(error){$('recordCards').textContent=error.message;}}
function renderRecords(){const mode=$('recordsMode').value||'full',par=mode==='full'?72:36;$('recordCards').innerHTML=COURSES.map((c,i)=>{const r=recordData.find(r=>r.course===i&&r.mode===mode)||{leaders:[],personal:null};return '<article class="record-card"><span class="small-label">'+escapeHTML(c.difficulty)+'</span><h2>'+escapeHTML(c.name)+'</h2><p>Your best: <strong>'+(r.personal===null?'No completed round':r.personal+' strokes · '+scoreText(r.personal-par))+'</strong></p>'+(r.leaders.length?'<ol>'+r.leaders.map(l=>'<li><span>'+escapeHTML(l.name)+'</span><b>'+l.strokes+' <small>'+scoreText(l.strokes-par)+'</small></b></li>').join('')+'</ol>':'<p>Be the first to complete this round.</p>')+'</article>';}).join('');}
$('recordsMode').onchange=renderRecords;$('refreshRecords').onclick=loadRecords;
function renderAccount(){$('saveProgressBanner').hidden=Boolean(account)||!profileLoaded;$('guestSaveNote').textContent=guestCareer?'Guest progress stays linked to this browser. Clearing cookies starts a new career.':'Use your email and password to return to this career.';$('accountButton').textContent=account?'Account':'Save progress';$('accountSignedIn').hidden=!account;$('accountForm').hidden=Boolean(account);$('accountEmail').textContent=account?.email||'';$('accountTitle').textContent=account?'Your account':authMode==='register'?'Create account':'Sign in';}
function setAuthMode(mode){authMode=mode;renderAccount();$('accountStatus').textContent='';$('loginPassword').autocomplete=mode==='login'?'current-password':'new-password';$('passwordLabel').textContent='Password';$('accountSubmit').textContent=mode==='register'?'Create account':'Sign in';$('registerMode').hidden=mode!=='login';$('loginMode').hidden=mode==='login';$('accountHint').textContent=mode==='register'?'Your current career will move into this account. Use a password with 12 or more characters.':'Sign in to resume your saved golfer, tokens and equipment.';}
function openAccount(mode){setAuthMode(mode);$('accountDialog').showModal();}
$('accountButton').onclick=()=>openAccount(account?'login':'register');$('createAccountCTA').onclick=()=>openAccount('register');$('signInCTA').onclick=()=>openAccount('login');$('registerMode').onclick=()=>setAuthMode('register');$('loginMode').onclick=()=>setAuthMode('login');
$('accountForm').onsubmit=async e=>{e.preventDefault();$('accountSubmit').disabled=true;$('accountStatus').textContent='Please wait…';try{const data=await api('/api/auth/'+authMode,{email:$('loginEmail').value,password:$('loginPassword').value});$('loginPassword').value='';$('accountDialog').close();hasRound=false;await loadCareer();}catch(error){$('accountStatus').textContent=error.message;}finally{$('accountSubmit').disabled=false;}};
$('signOut').onclick=async()=>{try{await api('/api/auth/logout',{});hasRound=false;account=null;$('accountDialog').close();await loadCareer();}catch(error){$('accountStatus').textContent=error.message;}};
$('deleteAccountButton').onclick=()=>{if(!account)return;$('accountDialog').close();$('deleteAccountEmail').textContent=account.email;$('deleteAccountPassword').value='';$('deleteAccountStatus').textContent='';$('deleteAccountDialog').showModal();};
$('cancelDeleteAccount').onclick=()=>$('deleteAccountDialog').close();
$('deleteAccountForm').onsubmit=async e=>{e.preventDefault();if(!account)return;$('confirmDeleteAccount').disabled=true;$('deleteAccountStatus').textContent='Deleting account…';try{await api('/api/auth/delete',{email:account.email,password:$('deleteAccountPassword').value});$('deleteAccountPassword').value='';$('deleteAccountDialog').close();account=null;hasRound=false;profileLoaded=false;recordData=[];await loadCareer();}catch(error){$('deleteAccountStatus').textContent=error.message;}finally{$('confirmDeleteAccount').disabled=false;}};
const TUTORIAL=[
 {chapter:'Getting started',title:'Your first round starts here',copy:'Learn the controls, then work through shot decisions before you play. These practice decisions do not spend tokens or affect your score. You can skip or replay this guide from the clubhouse.',cue:'12 LESSONS · CONTROLS + COURSE STRATEGY',tip:'Your goal: finish each hole in as few strokes as possible.'},
 {chapter:'Getting started',title:'Choose your challenge',copy:'Eight courses offer 144 holes. Score 72 or lower in a full round at both Granite Highlands and Atlantic Links to open Blackwater Dunes. Beat 72 on each challenge course to open the next. Choose front nine, back nine, or a full round. Willow Park has wider fairways and slower greens; Pinecrest adds tighter lines, Granite Highlands adds elevation, and Atlantic Links has strong wind and fast greens.',cue:'RELAXED → CLUB → TOUR → CHAMPIONSHIP',tip:'Create your look in My golfer. Start with nine holes while learning.',question:'Which course gives you the most forgiving first round?',options:['Atlantic Links','Willow Park','Granite Highlands'],answer:1,feedback:'Willow Park offers the widest timing window and more forgiving conditions.'},
 {chapter:'Swing fundamentals',title:'Aim for a landing area',copy:'Click the course or overhead map to aim. Use the left and right arrow keys for fine adjustments, or the on-screen aim buttons on mobile. Change camera with C or the camera button to inspect the line.',cue:'PICK A SAFE TARGET · THEN FINE-TUNE',tip:'Aim at the wide part of the fairway. The flag is not always the safest target.'},
 {chapter:'Swing fundamentals',title:'Match the club to the shot',copy:'Browse all 14 clubs with the club arrows. Woods cover long distances, irons handle approaches, wedges offer shorter high shots, and the putter rolls the ball. Number keys 1–8 select the first eight clubs. Check the range shown for your current club level.',cue:'WOODS · IRONS · WEDGES · PUTTER',tip:'The range guide is an estimate. Wind, spin, elevation and the landing surface change the result.',question:'You are on the green with a clear path to the cup. Which club is designed for this shot?',options:['Lob wedge','Driver','Putter'],answer:2,feedback:'The putter keeps the ball rolling and uses a slower timing meter.'},
 {chapter:'Swing fundamentals',title:'Set power, then make contact',copy:'Hold the swing button or Space to build power. Release to lock it in. Tap again when the timing marker reaches the center. Early contact hooks the ball; late contact slices it. Your golfer completes the downswing before impact.',cue:'HOLD → RELEASE → TAP AT CENTER',tip:'Power rises and falls if you keep holding. Press Esc to cancel setup before the strike.',question:'You have released the button at your chosen power. What comes next?',options:['Tap when the timing marker reaches the center','Hold until power reaches 100%','Wait for the ball to launch automatically'],answer:0,feedback:'The second tap sets contact accuracy. Centered timing keeps your intended line.'},
 {chapter:'Shot strategy',title:'Account for wind and elevation',copy:'Check the wind arrow and speed before each shot. A headwind reduces carry; a following wind can add distance. Crosswinds move the ball sideways. Elevated greens need more carry, while downhill shots need room to land and roll.',cue:'DISTANCE + WIND + HEIGHT',tip:'Make small corrections. There is no single power percentage that works for every condition.',question:'A crosswind is carrying shots to the right. How should you adjust your starting line?',options:['Aim farther right','Aim slightly left into the wind','Ignore wind and use maximum power'],answer:1,feedback:'Starting slightly left leaves room for the wind to bring the ball back toward your target.'},
 {chapter:'Shot strategy',title:'Respect the lie and hazards',copy:'Rough and sand reduce carry. Check your lie before trusting a distance estimate, and use a shorter club when a controlled recovery is safer. Water and out-of-bounds add a penalty stroke and return the ball to its last lie.',cue:'SAFE LANDING FIRST · DISTANCE SECOND',tip:'A layup leaves a manageable next shot instead of risking a penalty.',question:'A lake extends beyond your reliable carry distance. What is the safer plan?',options:['Hit harder than the meter allows','Aim straight at the flag anyway','Lay up on safe ground before the lake'],answer:2,feedback:'A safe layup avoids relying on a carry your club cannot reliably produce.'},
 {chapter:'Advanced control',title:'Control the landing with spin',copy:'Open Spin beside the club selector before swinging. Backspin helps reduce release after landing; topspin encourages forward roll. Spin also changes flight, so leave room for the landing and judge the result rather than treating it as a guaranteed stop.',cue:'BACKSPIN: LESS RELEASE · TOPSPIN: MORE ROLL',tip:'Start with a modest setting. Spin is unavailable for the putter.',question:'Your approach needs to land softly on a shallow green. Which spin setting helps limit roll?',options:['Topspin','Backspin','Maximum power with no adjustment'],answer:1,feedback:'Backspin helps check the ball after landing. It still needs enough carry to reach the green.'},
 {chapter:'Advanced control',title:'Shape shots deliberately',copy:'The side-spin control adds draw or fade to shape a shot. Combine a sensible starting line with modest shaping, then allow for the wind. Strong side spin can make a narrow landing area harder to hit.',cue:'STARTING LINE + SHAPE + WIND',tip:'Reset spin when you no longer need it. Neutral spin is a useful baseline for learning club distances.'},
 {chapter:'The short game',title:'Read the moving slope dots',copy:'Use G or the green-grid button to reveal slopes. Dots move downhill and travel faster on steeper sections. Read the dots along the entire putt, then aim against the break so the slope can bring the ball toward the cup.',cue:'DOT DIRECTION = DOWNHILL · SPEED = STEEPNESS',tip:'A green can change slope along your line. Check more than the patch beside the ball.',question:'Dots along your putt move to the right. Which starting line compensates for the break?',options:['A little left of the cup','A little right of the cup','Always directly at the cup'],answer:0,feedback:'Aim left to allow for the downhill movement to the right. Pace also changes how much the putt breaks.'},
 {chapter:'The short game',title:'Pace matters as much as line',copy:'Use the putter and release at a controlled power. Uphill putts need more pace; downhill putts need less. Tap the slower timing meter near the center. A ball moving too quickly can cross the cup without dropping.',cue:'READ THE BREAK · CONTROL THE ARRIVAL SPEED',tip:'Treat the power guide as a starting point. Adjust for slope instead of hitting every putt hard.',question:'A downhill putt repeatedly races past the hole. What should you try?',options:['Add more power','Switch to a driver','Reduce power and reassess the line'],answer:2,feedback:'Less power helps the ball arrive at a catchable speed. Recheck your aim as the pace changes.'},
 {chapter:'Your career',title:'Build a bag worth saving',copy:'Complete holes and rounds to earn tokens. In My equipment, spend tokens on the specific club you want to improve. Each of the 14 clubs has five levels; upgrades cost 150, 400, 900, then 1,800 tokens. Clubs never upgrade automatically.',cue:'PLAY → EARN TOKENS → CHOOSE AN UPGRADE',tip:'Completed rounds count toward course records, with separate front-nine, back-nine and full-round standings. Create an account to return to your career on another device.'}
];
let tutorialAnswers={};
function showOnboarding(){onboardingStep=0;tutorialAnswers={};renderOnboarding();$('onboardingDialog').showModal();}
function renderOnboarding(){
 const step=TUTORIAL[onboardingStep],last=onboardingStep===TUTORIAL.length-1;
 $('onboardingCount').textContent='LESSON '+(onboardingStep+1)+' OF '+TUTORIAL.length+' · '+step.chapter;
 $('onboardingProgress').value=onboardingStep+1;$('onboardingProgress').max=TUTORIAL.length;
 $('onboardingTitle').textContent=step.title;$('onboardingCopy').textContent=step.copy;$('onboardingIllustration').textContent=step.cue;$('onboardingTip').textContent=step.tip;
 $('onboardingChallenge').hidden=!step.question;$('onboardingQuestion').textContent=step.question||'';
 for(let i=0;i<3;i++){const button=$('onboardingChoice'+i);button.textContent=step.options?.[i]||'';button.setAttribute('aria-pressed',String(tutorialAnswers[onboardingStep]===i));button.onclick=()=>{tutorialAnswers[onboardingStep]=i;renderOnboarding();};}
 const chosen=tutorialAnswers[onboardingStep];$('onboardingFeedback').textContent=chosen===undefined?'':chosen===step.answer?'Correct. '+step.feedback:'Try again. '+step.feedback;
 $('onboardingBack').disabled=onboardingStep===0;$('onboardingAccountPrompt').hidden=!last||Boolean(account);$('onboardingNext').textContent=last?(account?'Start playing':'Continue as guest'):'Next lesson';$('onboardingStatus').textContent='';
 $('onboardingDialog').scrollTop=0;
}
async function finishOnboarding(){try{const data=await api('/api/onboarding',{});career=data.profile;$('onboardingDialog').close();return true;}catch(error){$('onboardingStatus').textContent=error.message;return false;}}
$('onboardingNext').onclick=()=>{if(onboardingStep<TUTORIAL.length-1){onboardingStep++;renderOnboarding();}else finishOnboarding();};$('onboardingBack').onclick=()=>{onboardingStep=Math.max(0,onboardingStep-1);renderOnboarding();};$('onboardingSkip').onclick=finishOnboarding;$('onboardingDialog').addEventListener('cancel',e=>{e.preventDefault();finishOnboarding();});$('tutorialButton').onclick=showOnboarding;
$('onboardingCreateAccount').onclick=async()=>{if(await finishOnboarding())openAccount('register');};$('onboardingSignIn').onclick=async()=>{if(await finishOnboarding())openAccount('login');};

$('mobileMapButton').onclick=()=>{const open=$('mobileMapButton').getAttribute('aria-expanded')!=='true';$('mobileMapButton').setAttribute('aria-expanded',String(open));$('game').classList.toggle('mobile-map-open',open);$('mobileMapButton').textContent=open?'Close map':'Map';};
$('mobileDetailsButton').onclick=()=>{cancelSetup();$('mobileDetailsContent').innerHTML='<p><strong>'+escapeHTML(hole.name)+'</strong> · Hole '+(holeIndex+1)+' · Par '+hole.par+'</p><p>Round score: '+scoreText(totalScore())+' · '+escapeHTML($('lieLabel').textContent)+'</p><p>Elevation: '+escapeHTML($('elevationValue').textContent)+' · '+escapeHTML($('lieImpact').textContent)+'</p><p>'+escapeHTML(hole.tip)+'</p><p>'+escapeHTML($('greenReading').textContent)+'</p>';$('mobileSound').textContent=sound?'Turn sound off':'Turn sound on';$('mobileDetailsDialog').showModal();};
$('mobileScore').onclick=()=>{$('mobileDetailsDialog').close();showScore();};
$('mobileHelp').onclick=()=>{$('mobileDetailsDialog').close();$('helpDialog').showModal();};
$('mobileSound').onclick=()=>{$('soundButton').click();$('mobileSound').textContent=sound?'Turn sound off':'Turn sound on';};
$('characterTab').onclick=()=>setHomeTab('character');$('recordsTab').onclick=()=>setHomeTab('records');
$('spinButton').onclick=()=>{if(!ready()||clubIndex===PUTTER_INDEX)return;syncSpin();$('spinDialog').showModal();};
$('backSpin').oninput=e=>{if(phase==='ready'){spinBack=Number(e.target.value)/100;syncSpin();}};$('sideSpin').oninput=e=>{if(phase==='ready'){spinShape=Number(e.target.value)/100;syncSpin();}};$('resetSpin').onclick=()=>{spinBack=0;spinShape=0;syncSpin();};
$('playTab').onclick=()=>setHomeTab('play');$('equipmentTab').onclick=()=>setHomeTab('equipment');$('homeRetry').onclick=loadCareer;$('resumeRound').onclick=resumeSavedRound;$('retryScore').onclick=saveHoleResult;
$('courseButton').onclick=showCourses;$('startRound').onclick=startSelectedRound;
$('swingButton').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();$('swingButton').setPointerCapture(e.pointerId);beginCharge();});
$('swingButton').addEventListener('pointerup',e=>{e.preventDefault();releasePower();});
$('swingButton').addEventListener('pointercancel',cancelSetup);$('swingButton').addEventListener('lostpointercapture',()=>{if(phase==='power')cancelSetup();});
$('swingButton').addEventListener('keydown',e=>{if(e.code==='Enter'&&!e.repeat){e.preventDefault();beginCharge();}});$('swingButton').addEventListener('keyup',e=>{if(e.code==='Enter'){e.preventDefault();releasePower();}});
$('clubPrev').onclick=()=>changeClub(-1);$('clubNext').onclick=()=>changeClub(1);$('cameraButton').onclick=toggleView;$('gridButton').onclick=()=>{greenGrid=!greenGrid;updateUI();};
$('helpButton').onclick=()=>{cancelSetup();$('helpDialog').showModal();};$('scoreButton').onclick=showScore;$('resultScorecard').onclick=showScore;
$('soundButton').onclick=()=>{sound=!sound;$('soundButton').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('soundButton').querySelector('.off-mark').hidden=sound;if(sound)playTone('bounce');};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
for(const d of document.querySelectorAll('dialog')){d.addEventListener('click',e=>{if(e.target===d&&d.id!=='holeDialog'){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});if(d.id==='holeDialog')d.addEventListener('cancel',e=>e.preventDefault());}
$('nextHole').onclick=()=>{$('holeDialog').close();if(finalHole()){showCourses();}else{startHole(holeIndex+1);toast(hole.name+' · Par '+hole.par);}};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=renderer?.pointOnCourse(e.clientX,e.clientY);if(p)aimAt(...p);});
map.addEventListener('pointerdown',e=>{if(!mapTransform)return;const r=map.getBoundingClientRect(),x=(e.clientX-r.left)*map.width/r.width,y=(e.clientY-r.top)*map.height/r.height;aimAt((x-mapTransform.cx)/mapTransform.scale,(mapTransform.cz-y)/mapTransform.scale);});
for(const [id,dir]of[['aimLeft',-1],['aimRight',1]]){const btn=$(id);btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);pointerAim=dir;aimDelta(dir*.008);});for(const event of['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>{pointerAim=0;});}
window.addEventListener('keydown',e=>{if(isModal()||homeOpen)return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)beginCharge();if(e.code==='ArrowLeft')aimKey=-1;if(e.code==='ArrowRight')aimKey=1;if(e.code==='KeyC'&&!e.repeat)toggleView();if(e.code==='KeyG'&&!e.repeat){greenGrid=!greenGrid;updateUI();}if(e.code==='ArrowUp'&&!e.repeat)changeClub(-1);if(e.code==='ArrowDown'&&!e.repeat)changeClub(1);if(e.code==='Escape')cancelSetup();if(/^Digit[1-8]$/.test(e.code)&&ready()){clubIndex=Number(e.code.slice(-1))-1;updateSuggestion();}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();releasePower();}if(e.code==='ArrowLeft'||e.code==='ArrowRight')aimKey=0;});window.addEventListener('blur',cancelSetup);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSetup();});
let last=performance.now(),accum=0,uiClock=0,aimClock=0;
function animate(now){
  const dt=Math.min((now-last)/1000,.05);last=now;const paused=isModal()||document.hidden||homeOpen;
  if(!paused){
    if((aimKey||pointerAim)&&ready()){aimClock+=dt;if(aimClock>.035){aimDelta((aimKey||pointerAim)*aimClock*(clubIndex===PUTTER_INDEX?.15:.32));aimClock=0;}}
    if(phase==='power'){chargeTime+=dt;const t=(chargeTime/(clubIndex===PUTTER_INDEX?1.25:1.05))%2;power=clamp(t<=1?t:2-t,.008,1);actor.progress=Math.min(1,chargeTime/.2);actor.power=power;}
    if(phase==='accuracy'){timingTime+=dt;const speed=clubIndex===PUTTER_INDEX?hole.timingSpeed*.66:hole.timingSpeed,t=(timingTime*speed)%2;timingNeedle=-1+2*(t<=1?t:2-t);if(timingTime>3){timingNeedle=1;commitStrike();}}
    if(phase==='downswing'){downswingTime+=dt;const duration=actor.club.type==='putter'?.16:.20;actor.progress=clamp(downswingTime/duration,0,1);if(downswingTime>=duration)impact();}
    if(actor?.phase==='follow'){followTime+=dt;actor.progress=clamp(followTime/.60,0,1);}
    if(ball.moving){accum+=dt;for(let i=0;i<8&&accum>=1/120&&ball.moving;i++){
      accum-=1/120;const previous={x:ball.x,z:ball.z},event=stepBall(ball,hole,1/120);shotDistance=Math.hypot(ball.x-shotStart.x,ball.z-shotStart.z);collisionCooldown-=1/120;
      if(collisionCooldown<=0&&ball.moving)for(const t of renderer.trees){const distance=Math.hypot(ball.x-t.x,ball.z-t.z),trunk=distance<(t.r||.5)+.08&&ball.y<t.y+t.h*.68,canopy=distance<t.canopy*.8&&ball.y>t.y+t.h*.48&&ball.y<t.y+t.h;if(trunk||canopy){ball.vx*=trunk?-.32:.46;ball.vz*=trunk?-.32:.46;ball.vy*=.65;if(trunk){ball.x=previous.x;ball.z=previous.z;}collisionCooldown=.7;toast(trunk?'Caught the trunk.':'Clipped the canopy.');break;}}
      if(event==='bounce'){if(shotInFlight){shotCarry=shotDistance;shotInFlight=false;}playTone('bounce');}
      if(event==='water'||event==='out'){strokes++;ball=makeBall(hole,lastLie.x,lastLie.z);restAfterShot(true);toast((event==='water'?'In the water.':'Out of bounds.')+' +1 penalty · replay from your last lie.',3800);playTone('water');break;}
      if(event==='cup'){finishHole();break;}if(event==='rest'){restAfterShot();break;}
    }
    if(ball.moving){trail.push({x:ball.x,y:ball.y,z:ball.z});if(trail.length>95)trail.shift();$('flightDistance').innerHTML=Math.round(shotDistance*YD)+' <small>yd</small>';$('flightPhase').textContent=ball.airborne?'IN FLIGHT':'ROLLING';}}
    else accum=0;
  }
  uiClock+=dt;if(uiClock>.035){updateUI();uiClock=0;}if(now%150<20)drawMap();
  if(homeOpen){const h=COURSES[pendingCourse].holes[0],hb=makeBall(h);renderer?.render({ball:hb,hole:h,angle:0,view:homeTab==='character'?'character':homeTab==='equipment'?'equipment':'home',moving:false,trail:[],power:0,clubIndex:0,actor:{x:0,z:0,angle:0,club:upgradeClub(CLUBS[0],clubLevel(career,CLUBS[0].id)),appearance:homeTab==='character'?appearanceDraft:career.appearance,phase:'address',progress:0,power:.7}},dt);}else renderer?.render({ball,hole,angle,view,moving:ball.moving,trail,power,clubIndex,actor,greenGrid},paused?0:dt);requestAnimationFrame(animate);
}
if(renderer){startHole(roundStart);renderHome();requestAnimationFrame(animate);}loadCareer();
if(document.modelContext?.registerTool){
  const life=new AbortController(),register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}};
  register({name:'get_golf_state',description:'Read the current championship golf hole, lie, club, score, and swing phase.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({hole:holeIndex+1,totalHoles:HOLES.length,availableHoles:TOTAL_HOLES,course:course.name,difficulty:course.difficulty,round:roundMode,name:hole.name,par:hole.par,strokes,club:CLUBS[clubIndex].name,lie:surface(hole,ball.x,ball.z),yardsToPin:Math.round(Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD),tokens:career.tokens,clubLevel:clubLevel(career,CLUBS[clubIndex].id)+1,clubTier:TIERS[clubLevel(career,CLUBS[clubIndex].id)].name,spin:{back:spinBack,shape:spinShape},homeOpen,rangeGuidePercent:courseIndex<3?Math.round(suggested*100):null,phase,moving:ball.moving,finished,roundScore:scoreText(totalScore())})});
  register({name:'configure_golf_shot',description:'Choose the selected club and aim offset from the pin, without swinging.',inputSchema:{type:'object',properties:{club:{type:'integer',minimum:1,maximum:14},aimOffsetDegrees:{type:'number',minimum:-180,maximum:180}},required:['club','aimOffsetDegrees'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!Number.isInteger(input.club)||input.club<1||input.club>14||!Number.isFinite(input.aimOffsetDegrees)||Math.abs(input.aimOffsetDegrees)>180)throw Error('Use a club from 1–14 and an aim offset from -180 to 180 degrees.');if(!ready())throw Error('Wait until the course is ready for a shot.');clubIndex=input.club-1;angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z))+input.aimOffsetDegrees*Math.PI/180;const d=Math.hypot(hole.pin[0]-ball.x,hole.pin[1]-ball.z);aimTarget=[ball.x+Math.sin(angle)*d,ball.z-Math.cos(angle)*d];updateSuggestion();drawMap();return {club:CLUBS[clubIndex].name,rangeGuidePercent:courseIndex<3?Math.round(suggested*100):null};}});
  window.addEventListener('pagehide',()=>life.abort(),{once:true});
}
