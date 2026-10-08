import {prepareNPCFlight,npcFlightFrame} from './npc-flight.js';
import {impossibleHole} from './impossible.js';
import {createTourField,tourStandings,tourPartners,tourShot,tourPuttFrame} from './tour.js';
import {createGolfMusic} from './music.js';
import {GreenskeeperGame,KEEPER_TOOLS} from './greenskeeper.js';
import {PALETTES,DEFAULT_LOOK} from './character.js';
import {CLUBS,PUTTER_INDEX,YD,clamp,height,surface,makeBall,launch,stepBall,recommendedClub,lieFactor,effectiveWind,greenGradient,bunkerRadius} from './physics.js';
import {GolfRenderer} from './renderer.js';
import {medal,dailyHole} from './challenges.js';
import {COURSES,TOTAL_HOLES} from './courses.js';
import {TIERS,UPGRADE_COSTS,clubLevel,upgradeClub} from './progression.js';
const $=id=>document.getElementById(id),canvas=$('course'),map=$('minimap'),mapCtx=map.getContext('2d');
let renderer;try{renderer=new GolfRenderer(canvas);}catch(error){$('loadError').hidden=false;console.error(error);}
let courseIndex=1,course=COURSES[1],HOLES=course.holes,roundMode='full',roundStart=0,roundEnd=17,pendingCourse=1,pendingRound='full';
let holeIndex=0,hole=HOLES[0],ball=makeBall(hole),clubIndex=0,angle=0,view='follow',strokes=0,scores=Array(HOLES.length).fill(null);
let fastForward=false,puttScaleFeet=0;
const PUTT_SCALES=[0,30,60,120,240,360];
let impossibleAward=null;
let impossibleAttempts=0,impossibleClears=0,impossibleBest=null;
let tourField=[],tourGroup=[],tourQueue=[],tourTurn=null,tourAfterTurns=null;
let phase='ready',power=0,suggested=1,chargeTime=0,timingTime=0,timingNeedle=-1,accuracy=0,downswingTime=0,followTime=0,actor=null;
let trail=[],lastLie={x:0,z:0},shotStart={x:0,z:0},shotDistance=0,shotCarry=0,shotInFlight=false,finished=false,greenGrid=false;
let homeOpen=true,hasRound=false,homeTab='play',guestCareer=false,profileLoaded=false,profileBusy=false,career={tokens:0,clubLevels:{},holes:0,rounds:0},savedRound=null,roundId=null,savePending=false,pendingScore=null,spinBack=0,spinShape=0;
let account=null,appearanceDraft={...DEFAULT_LOOK},authMode='login',onboardingStep=0,onboardingSeen=false,recordData=[];
let sound=false,audioContext=null,toastTimer=0,mapTransform=null,collisionCooldown=0,aimTarget=[...hole.pin],aimKey=0,pointerAim=0,lastStrike='';
let practice=null,practiceSnapshot=null,dailyConfig=null,holeMetrics={putts:0,fairway:null,gir:0},recording=null,lastReplay=null,replay=null;
const keeper=new GreenskeeperGame();let keeperRenderer=null,keeperRenderFailed=false;
const music=createGolfMusic(window,document);
const scoreText=n=>n===0?'E':n>0?'+'+n:String(n);
const totalScore=()=>scores.reduce((s,n,i)=>n===null?s:s+n-HOLES[i].par,0);
const isModal=()=>document.querySelector('dialog[open]')!==null;
const ready=()=>!tourTurn&&!replay&&!homeOpen&&phase==='ready'&&!finished&&!isModal();
const finalHole=()=>holeIndex===roundEnd;
function activeClub(){const c=upgradeClub(CLUBS[clubIndex],clubLevel(career,CLUBS[clubIndex].id));if(clubIndex!==PUTTER_INDEX)return c;const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD;return {...c,range:puttScaleFeet?puttScaleFeet/3:Math.round(clamp(d*1.75,3,30))};}
function toast(text,duration=3000){$('toast').textContent=text;$('mobileNotice').textContent=text;$('mobileNotice').title=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('visible');$('mobileNotice').textContent='';$('mobileNotice').title='';},duration);}
function playTone(kind){if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime,notes=kind==='cup'?[523,659,784,1046]:kind==='pure'?[90,180,360]:kind==='hit'?[clubIndex===PUTTER_INDEX?330:150]:kind==='water'?[100,70]:[200];notes.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=kind==='hit'?'triangle':'sine';osc.frequency.setValueAtTime(freq,now+i*.12);if(kind==='hit')osc.frequency.exponentialRampToValueAtTime(50,now+.12);gain.gain.setValueAtTime(.0001,now+i*.12);gain.gain.exponentialRampToValueAtTime(.12,now+i*.12+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.12+.22);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.12);osc.stop(now+i*.12+.25);});}catch{sound=false;}}
function setAddress(){actor={x:ball.x,z:ball.z,angle,club:activeClub(),appearance:career.appearance,phase:'address',progress:0,power:.7};}
function updateSuggestion(){
  if(phase!=='ready')return;const c=activeClub(),d=Math.hypot(aimTarget[0]-ball.x,aimTarget[1]-ball.z)*YD,lie=surface(hole,ball.x,ball.z),roll=c.type==='wood'?1.1:c.type==='putter'?1:1.045;
  suggested=clamp(d/(c.range*lieFactor(lie,c,hole)*roll),.008,1);suggested=Math.round(suggested*20)/20;
  const showGuide=practice!=='impossible'&&(Boolean(practice)||courseIndex<3);$('suggestion').hidden=!showGuide;$('powerTarget').hidden=!showGuide;
  $('powerTarget').style.left=clamp(suggested*100-2,0,96)+'%';$('powerTarget').style.width='4%';
  $('suggestion').textContent=clubIndex===PUTTER_INDEX?'Flat-ground guide '+Math.round(suggested*100)+'%':'Range guide '+Math.round(suggested*100)+'% · wind excluded';setAddress();updateUI();
}
function updateUI(){
  $('holeName').textContent=hole.name;$('holeCount').textContent=String(holeIndex+1).padStart(2,'0')+' / '+HOLES.length;$('parValue').textContent=hole.par;$('holeAdvice').textContent=hole.tip;
  $('game').classList.toggle('ball-in-play',['downswing','flight'].includes(phase));$('game').classList.toggle('setting-shot',['power','accuracy'].includes(phase));
  const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD,lie=surface(hole,ball.x,ball.z),c=activeClub();const sweet=Math.min(.30,hole.sweetSpot*c.forgiveness*(c.type==='putter'?1.15:1));$('sweetSpot').style.left=(50-sweet*50)+'%';$('sweetSpot').style.width=sweet*100+'%';
  $('pinDistance').innerHTML=d<10?(d*3).toFixed(1)+' <small>ft</small>':Math.round(d)+' <small>yd</small>';
  $('strokeValue').textContent=ball.moving||finished?strokes:strokes+1;$('roundScore').textContent=scoreText(totalScore());
  $('lieLabel').textContent=({tee:'TEE BOX',green:'ON THE GREEN',fringe:'FRINGE',fairway:'FAIRWAY',rough:'DEEP ROUGH',sand:'BUNKER',water:'WATER',out:'OUT OF BOUNDS',path:'CART PATH'})[lie];
  $('clubName').textContent=c.name;$('clubTierLabel').textContent=TIERS[clubLevel(career,CLUBS[clubIndex].id)].name.toUpperCase()+' CLUB';$('hudLevel').textContent=career.tokens+' TOKENS';$('spinButton').disabled=phase!=='ready'||clubIndex===PUTTER_INDEX;$('spinSummary').textContent=clubIndex===PUTTER_INDEX?'Putt':spinBack||spinShape?'Set':'Neutral';$('clubDistance').textContent=c.range+' yd '+(clubIndex===PUTTER_INDEX?'putt scale':'carry')+' · '+c.loft+'°';
  $('powerValue').innerHTML=Math.round(power*100)+'<span>%</span>';$('powerFill').style.width=power*100+'%';$('carryValue').textContent=clubIndex===PUTTER_INDEX?Math.round(c.range*3*power)+' ft flat':Math.round(c.range*power*lieFactor(lie,c,hole))+' yd';
  $('puttScaleControl').hidden=clubIndex!==PUTTER_INDEX;$('puttScale').disabled=!ready();if($('puttScale').value!==String(puttScaleFeet))$('puttScale').value=String(puttScaleFeet);$('puttScaleHint').textContent='100% ≈ '+Math.round(c.range*3)+' ft on flat green';
  $('swingButton').disabled=Boolean(practice&&ball.holed)||['downswing','flight','complete'].includes(phase);
  $('swingText').textContent=phase==='accuracy'?'Tap to strike':phase==='power'?'Release for timing':phase==='downswing'?'Swinging…':phase==='flight'?'Ball in play':finished?'Hole complete':'Hold to swing';
  $('powerTitle').textContent=phase==='power'?'1 · SET YOUR POWER':phase==='accuracy'?'POWER LOCKED':'SWING POWER';
  $('aimTip').style.opacity=phase==='ready'?'1':'0';$('clubPrev').disabled=$('clubNext').disabled=phase!=='ready';
  updateFastForwardControl();
  $('flightReadout').hidden=!ball.moving;$('timingPanel').hidden=phase!=='accuracy';$('timingMarker').style.left=(timingNeedle+1)*50+'%';
  $('swingButton').classList.toggle('timing-active',phase==='accuracy');
  $('statusLine').textContent=phase==='accuracy'?'TAP SPACE OR THE BUTTON AS THE MARKER CROSSES THE CENTER':phase==='downswing'?'KEEP YOUR EYE ON THE BALL':ball.moving?'BALL IN PLAY · '+lastStrike:finished?'HOLE COMPLETE':lie==='green'?'FAST GREEN · READ THE BREAK':lie==='sand'?'DEEP BUNKER · WEDGE RECOMMENDED':lie==='rough'?'DEEP ROUGH · '+Math.round(hole.roughFactor*100)+'% CARRY':strokes===0?'CHAMPIONSHIP TEES · TIMED STRIKES':'FIND YOUR LINE · COMMIT TO THE SHOT';
  $('roundProgress').textContent='Hole '+(holeIndex+1)+' · '+(roundMode==='full'?'18 hole round':roundMode==='front'?'Front nine':'Back nine');$('courseTitle').textContent=course.name.toUpperCase()+' · '+course.difficulty.toUpperCase();
  const elev=(height(hole,...hole.pin)-height(hole,ball.x,ball.z))*3.28084;
  $('elevationValue').textContent=(elev>=0?'+':'')+Math.round(elev)+' ft';$('lieImpact').textContent=Math.round(lieFactor(lie,c,hole)*100)+'% carry';
  const slope=greenGradient(hole,ball.x,ball.z);$('greenReading').textContent=lie==='green'?'Slope '+(Math.hypot(...slope)*100).toFixed(1)+'% · Dots move downhill · Amber = steeper':'Green pace: '+(course.level===1?'moderate':course.level===4?'very fast':'fast');
  $('gridButton').classList.toggle('selected',greenGrid);$('gridButton').setAttribute('aria-pressed',String(greenGrid));
  const wind=effectiveWind(hole,ball.moving?ball.time:0),mph=Math.hypot(...wind)*2.23694;
  $('windValue').innerHTML=Math.round(mph)+' <small>mph</small>';$('gustValue').textContent='Gusts '+Math.round(Math.hypot(...hole.wind)*2.23694*1.35);
  $('mobileHole').textContent=practice?'Practice':'H'+(holeIndex+1)+' · Par '+hole.par;
  $('mobileDistance').textContent=ball.moving?Math.round(shotDistance*YD)+' yd flight':d<10?(d*3).toFixed(1)+' ft':Math.round(d)+' yd';
  $('mobileStroke').textContent='Shot '+(ball.moving||finished?strokes:strokes+1);
  const windNames=['N','NE','E','SE','S','SW','W','NW'],windHeading=(Math.round(Math.atan2(wind[0],-wind[1])/(Math.PI/4))+8)%8;
  $('mobileWind').textContent=Math.round(mph)+' mph '+windNames[windHeading];
  $('mobileWind').title='Wind blows toward '+windNames[windHeading];
  $('mobileReplayStop').hidden=!replay;

  $('windArrow').style.transform='rotate('+(Math.atan2(wind[0],-wind[1])-angle)+'rad)';
  $('puttingCamera').disabled=ball.moving||Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])>35;$('puttingCamera').setAttribute('aria-pressed',String(view==='putting'));
  $('practiceReset').disabled=ball.moving||['power','accuracy','downswing'].includes(phase);$('practiceDistance').disabled=$('practiceReset').disabled;
  if(practice){$('roundProgress').textContent='PRACTICE · No scores saved';$('courseTitle').textContent=practice==='range'?'DRIVING RANGE':'PUTTING GREEN';$('holeName').textContent=practice==='range'?'Practice target':'Practice cup';$('statusLine').textContent=ball.moving?'PRACTICE SHOT IN PLAY':'PRACTICE · RESET BALL TO TRY AGAIN';}
  updateImpossibleUI();
  updateTourUI();
  if(roundMode==='daily'&&!practice)$('roundProgress').textContent='DAILY THREE · '+dailyConfig.day+' · Hole '+(holeIndex-roundStart+1)+' of 3';
}
function startHole(index){
  holeIndex=index;hole=HOLES[index];resetTourGroup();holeMetrics={putts:0,fairway:hole.par>3?0:null,gir:0};lastReplay=null;recording=null;$('replayShot').hidden=$('replayHole').hidden=true;ball=makeBall(hole);strokes=0;finished=false;phase='ready';power=0;trail=[];followTime=0;clubIndex=recommendedClub(hole,ball);greenGrid=false;spinBack=0;spinShape=0;syncSpin();
  angle=Math.atan2(hole.pin[0],-hole.pin[1]);aimTarget=[...hole.pin];renderer?.loadHole(hole);
  $('holeName').textContent=hole.name;$('holeCount').textContent=String(index+1).padStart(2,'0')+' / '+HOLES.length;$('parValue').textContent=hole.par;
  const length=hole.path.reduce((s,p,i)=>i?s+Math.hypot(p[0]-hole.path[i-1][0],p[1]-hole.path[i-1][1]):0,0);$('lengthValue').textContent=Math.round(length*YD);
  $('holeAdvice').textContent=hole.tip;$('sweetSpot').style.left=(50-hole.sweetSpot*50)+'%';$('sweetSpot').style.width=hole.sweetSpot*100+'%';$('shotSummary').hidden=true;updateSuggestion();drawMap();
}
function aimAt(x,z){if(!ready())return;if(Math.hypot(x-ball.x,z-ball.z)<.2)return;angle=Math.atan2(x-ball.x,-(z-ball.z));aimTarget=[x,z];updateSuggestion();drawMap();}
function aimDelta(delta){if(!ready())return;angle+=delta;const d=Math.max(1,Math.hypot(aimTarget[0]-ball.x,aimTarget[1]-ball.z));aimTarget=[ball.x+Math.sin(angle)*d,ball.z-Math.cos(angle)*d];updateSuggestion();drawMap();}
function changeClub(delta){if(!ready())return;clubIndex=(clubIndex+delta+CLUBS.length)%CLUBS.length;updateSuggestion();}
function beginCharge(){
  if(tourTurn)return;
  if(phase==='accuracy'){commitStrike();return;}
  if(!ready()||!renderer||ball.holed)return;phase='power';chargeTime=0;power=.008;actor.phase='backswing';actor.progress=0;$('shotSummary').hidden=true;updateUI();
  if(sound)try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch{}
}
function releasePower(){if(phase!=='power')return;phase='accuracy';power=clamp(power,.008,1);timingTime=0;timingNeedle=-1;actor.phase='set';actor.progress=1;actor.power=power;updateUI();}
function cancelSetup(){if(phase==='power'||phase==='accuracy'){phase='ready';power=0;setAddress();updateSuggestion();}aimKey=0;pointerAim=0;}
function commitStrike(){
  if(phase!=='accuracy'||isModal())return;
  const timingWindow=Math.min(.30,hole.sweetSpot*activeClub().forgiveness*(clubIndex===PUTTER_INDEX?1.15:1));const pure=Math.abs(timingNeedle)<timingWindow,perfect=Math.abs(timingNeedle)<timingWindow*.20;accuracy=pure?0:Math.sign(timingNeedle)*(Math.abs(timingNeedle)-timingWindow)/(1-timingWindow);
  lastStrike=perfect?'PERFECT STRIKE':pure?'PURE STRIKE':Math.abs(accuracy)<.2?'SOLID CONTACT':accuracy<0?'EARLY · HOOK':'LATE · SLICE';
  if(clubIndex===PUTTER_INDEX&&!pure)lastStrike=accuracy<0?'PULLED PUTT':'PUSHED PUTT';
  fastForward=false;phase='downswing';downswingTime=0;actor.phase='downswing';actor.progress=0;actor.power=power;actor.club=activeClub();actor.angle=angle;actor.pure=pure;actor.perfect=perfect;actor.cinematic=perfect&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;recording={hole,frames:[],time:0,label:lastStrike,putt:clubIndex===PUTTER_INDEX,distance:Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD*3};captureReplay(0);updateUI();
}
function impact(){
  lastLie={x:ball.x,z:ball.z};shotStart={...lastLie};shotDistance=0;shotCarry=0;shotInFlight=true;collisionCooldown=0;trail=[];if(surface(hole,ball.x,ball.z)==='green')holeMetrics.putts++;strokes++;
  launch(ball,hole,actor.club,power,angle,accuracy,{back:spinBack,shape:spinShape});phase='flight';followTime=0;actor.phase='follow';actor.progress=0;playTone(actor.perfect?'pure':'hit');
  toast(lastStrike==='PURE STRIKE'?'Pure strike.':lastStrike.toLowerCase().replace(/^./,c=>c.toUpperCase()),1700);updateUI();drawMap();
}
function restAfterShot(penalty=false){
  recordShotStats(penalty);sealReplay(false);
  if(practice){practiceRest(false);return;}
  trail=[];power=0;phase='ready';aimTarget=[...hole.pin];angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z));clubIndex=recommendedClub(hole,ball);
  const lie=surface(hole,ball.x,ball.z);greenGrid=lie==='green'||lie==='fringe';
  $('shotSummary').hidden=false;$('shotResult').textContent=penalty?'PENALTY · +1':lastStrike;$('lastCarry').textContent=Math.round(shotCarry*YD)+' yd';$('lastTotal').textContent=Math.round(shotDistance*YD)+' yd';
  updateSuggestion();drawMap();if(strokes>=12){finishHole(true);return;}
  const d=Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD;
  if(!penalty)toast(lie==='green'?'On the green · '+(d<10?(d*3).toFixed(1)+' ft':Math.round(d)+' yd')+' to the cup.':lie==='sand'?'Deep bunker. Open the sand wedge and commit.':lie==='rough'?'Deep rough. Expect reduced carry.':Math.round(shotDistance*YD)+' yd · '+Math.round(shotCarry*YD)+' yd carry');
  queueTourShots(false);
}
function finishHole(limit=false){
  if(finished)return;recordShotStats(false);sealReplay(!limit);if(practice){practiceRest(!limit);return;}finished=true;phase='complete';power=0;scores[holeIndex]=strokes;pendingScore={roundId,hole:holeIndex,strokes,metrics:{...holeMetrics}};saveHoleResult();const n=strokes-hole.par;
  $('resultTitle').textContent=limit?'Stroke limit.':strokes===1?'Hole in one!':n<=-3?'Albatross!':n===-2?'Eagle!':n===-1?'Birdie.':n===0?'Par.':n===1?'Bogey.':n===2?'Double bogey.':'In the cup.';
  $('resultEyebrow').textContent=finalHole()?'ROUND COMPLETE':holeIndex===8?'FRONT NINE COMPLETE':'HOLE '+String(holeIndex+1).padStart(2,'0')+' COMPLETE';
  $('resultCopy').textContent=finalHole()?(roundEnd-roundStart+1)+' holes complete. You finished '+scoreText(totalScore())+' at '+course.name+'.':limit?'12 strokes reached. Pick up and start fresh on the next hole.':n<0?'A well-earned score on a demanding course.':n===0?'Right on the number. Keep it going.':'A new hole is a fresh start.';
  $('resultStrokes').textContent=strokes;$('resultPar').textContent=scoreText(n);$('resultRound').textContent=scoreText(totalScore());$('nextHole').textContent=finalHole()?'Back to the clubhouse ↗':holeIndex===8?'Start the back nine ↗':'Next hole ↗';playTone('cup');updateUI();drawMap();
  const showResult=()=>{if(finished&&!homeOpen&&!$('holeDialog').open)$('holeDialog').showModal();};
  if(roundMode==='tour')queueTourShots(true,showResult);else setTimeout(showResult,700);
}
function showScore(){
  if(roundMode==='tour'&&!practice){showTourLeaderboard();return;}
  cancelSetup();let body='';for(let i=0;i<HOLES.length;i++){if(i<roundStart||i>roundEnd)continue;if(i===roundStart||i===9)body+='<tr class="nine-heading"><td colspan="4">'+(roundMode==='daily'?'DAILY THREE':i===0?'FRONT NINE':'BACK NINE')+'</td></tr>';const h=HOLES[i];body+='<tr class="'+(i===holeIndex?'current-row':'')+'"><td>'+String(i+1).padStart(2,'0')+'</td><td>'+h.name+'</td><td>'+h.par+'</td><td>'+(scores[i]??(i===holeIndex&&strokes?strokes+'*':'—'))+'</td></tr>';if(roundMode!=='daily'&&(i===8||i===17)){const from=i-8,part=scores.slice(from,i+1),total=part.reduce((s,n)=>s+(n??0),0);body+='<tr class="nine-total"><td colspan="2">'+(i===8?'OUT':'IN')+'</td><td>36</td><td>'+(part.every(n=>n===null)?'—':total)+'</td></tr>';}}
  $('scoreTable').innerHTML='<table><thead><tr><th>HOLE</th><th>NAME</th><th>PAR</th><th>SCORE</th></tr></thead><tbody>'+body+'</tbody><tfoot><tr><td colspan="2">ROUND · '+scoreText(totalScore())+'</td><td>'+HOLES.slice(roundStart,roundEnd+1).reduce((s,h)=>s+h.par,0)+'</td><td>'+scores.reduce((s,n)=>s+(n??0),0)+'</td></tr></tfoot></table><p>* Hole in progress. Round score includes completed holes.</p>';$('scoreDialog').showModal();
}
function toggleView(){if(replay)return;cancelSetup();view=view==='overview'?'follow':'overview';$('cameraText').textContent=view==='overview'?'Golfer view':'Course view';}
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
function setHomeTab(tab){homeTab=tab;$('homeScreen').classList.toggle('character-view',tab==='character');for(const [id,name]of[['homePlay','play'],['homeEquipment','equipment'],['homeCharacter','character'],['homeRecords','records'],['homeStats','stats'],['homeGreenskeeper','greenskeeper'],['homeImpossible','impossible']])$(id).hidden=tab!==name;for(const [id,name]of[['playTab','play'],['equipmentTab','equipment'],['characterTab','character'],['recordsTab','records'],['statsTab','stats'],['greenskeeperTab','greenskeeper'],['impossibleTab','impossible']]){$(id).classList.toggle('selected',tab===name);$(id).setAttribute('aria-pressed',String(tab===name));}renderEquipment();if(tab==='character'){appearanceDraft={...DEFAULT_LOOK,...career.appearance};renderCharacter();}if(tab==='records')loadRecords();if(tab==='stats')loadStats();}
function showCourses(){
 if(savePending||pendingScore){toast('Save this hole before returning to the clubhouse.');return;}if(replay)stopReplay();cancelSetup();if(practice)leavePractice();pendingCourse=courseIndex;pendingRound=roundMode;skipTourShots(false);for(const d of document.querySelectorAll('dialog[open]'))d.close();homeOpen=true;$('homeScreen').hidden=false;$('game').classList.add('at-home');renderer?.loadHole(COURSES[pendingCourse].holes[0]);setHomeTab('play');renderHome();
}
function closeHome(){homeOpen=false;$('homeScreen').hidden=true;$('game').classList.remove('at-home');}
function renderHome(){
 const levels=CLUBS.map(c=>clubLevel(career,c.id)),upgrades=levels.reduce((a,b)=>a+b,0),costs=levels.filter(l=>l<4).map(l=>UPGRADE_COSTS[l]),next=costs.length?Math.min(...costs):null;
 $('careerLevel').textContent=career.tokens+' TOKENS';$('careerTier').textContent='14 clubs · Individual upgrades';$('homeLevel').textContent=career.tokens+' tokens';$('careerFill').style.width=(next?Math.min(1,career.tokens/next)*100:100)+'%';$('careerXP').textContent=profileLoaded?career.holes+' holes completed · '+upgrades+' club upgrades':'Loading progress…';$('careerNext').textContent=next?(career.tokens>=next?'Upgrade a club in My equipment':'Next upgrade starts at '+next+' tokens'):'Every club at maximum level';
 const canResume=hasRound&&!(finished&&finalHole())||savedRound;$('resumeRound').hidden=!canResume;$('resumeRound').textContent='Continue '+(hasRound?course.name:COURSES[savedRound?.course||0].name)+' · Hole '+(hasRound?holeIndex%18+1:(savedRound?.next_hole||0)%18+1)+' ↗';renderCourseChoices();renderEquipment();loadDaily();
}
function renderCourseChoices(){
 $('courseChoices').innerHTML=COURSES.map((c,i)=>'<button class="course-choice '+(i===pendingCourse?'chosen':'')+'" data-course="'+i+'" aria-pressed="'+(i===pendingCourse)+'"><span class="course-art '+c.biome+'"><span>'+String(i+1).padStart(2,'0')+'</span><span class="course-selected-mark">'+(i===pendingCourse?'SELECTED':'AVAILABLE')+'</span></span><span class="course-choice-body"><span class="course-choice-top"><span>'+c.tag+'</span><b>'+c.difficulty+'</b></span><strong>'+c.name+'</strong><span>'+c.description+'</span><small>'+(career.courseMedals?.[i]?career.courseMedals[i].toUpperCase()+' MEDAL · ':'')+'18 HOLES · PAR '+c.par+'</small></span></button>').join('');
 for(const b of document.querySelectorAll('[data-course]'))b.onclick=()=>{pendingCourse=Number(b.dataset.course);renderer?.loadHole(COURSES[pendingCourse].holes[0]);renderCourseChoices();};
 for(const b of document.querySelectorAll('[data-round]')){b.setAttribute('aria-pressed',String(b.dataset.round===pendingRound));b.classList.toggle('selected',b.dataset.round===pendingRound);b.onclick=()=>{pendingRound=b.dataset.round;renderCourseChoices();};}
 $('tourFormat').hidden=pendingRound!=='tour';
 $('startRound').disabled=!profileLoaded||profileBusy||savePending;$('startRound').textContent=profileBusy?'Loading…':pendingRound==='tour'?'Go on tour · 3 rounds':'Play '+(pendingRound==='full'?'18 holes':pendingRound==='front'?'the front nine':'the back nine')+' ↗';$('roundResetNote').hidden=!(hasRound||savedRound);
}
function renderEquipment(){
 $('equipmentLevel').textContent=career.tokens+' TOKENS';
 $('equipmentChoices').innerHTML=CLUBS.map(c=>{const level=clubLevel(career,c.id),t=TIERS[level],club=upgradeClub(c,level),cost=UPGRADE_COSTS[level],next=level<4?upgradeClub(c,level+1):null,afford=career.tokens>=cost;
 return '<article class="equipment-card '+(level?'equipped':'')+'" style="--tier-color:rgb('+t.color.map(v=>Math.round(v*255)).join(',')+')"><div class="club-number">'+c.label+'</div><span class="small-label">LEVEL '+(level+1)+' / 5 · '+t.name+'</span><h2>'+c.name+'</h2><p>'+t.finish+'</p><dl><div><dt>'+ (c.type==='putter'?'Putt scale':'Carry')+'</dt><dd>'+club.range+' yd'+(next&&c.type!=='putter'?' → '+next.range:'')+'</dd></div><div><dt>Forgiveness</dt><dd>+'+Math.round((t.forgiveness-1)*100)+'%'+(next?' → +'+Math.round((next.forgiveness-1)*100)+'%':'')+'</dd></div><div><dt>Spin response</dt><dd>'+(c.type==='putter'?'Straight roll':Math.round(t.spin*100)+'%'+(next?' → '+Math.round(next.spinControl*100)+'%':''))+'</dd></div></dl><p class="upgrade-preview">'+(next?(c.type==='putter'?'Putt distance stays the same.':(next.range-club.range)+' yd more carry.')+' Timing window grows '+Math.round((next.forgiveness/club.forgiveness-1)*100)+'%.'+(c.type==='putter'?' No spin on putts.':' Spin response rises '+Math.round((next.spinControl-club.spinControl)*100)+' percentage points.'):'Maximum club level.')+'</p><button data-upgrade="'+c.id+'" '+(!profileLoaded||!next||!afford?'disabled':'')+'>'+(!next?'Maximum level':afford?'Upgrade · '+cost+' tokens':'Need '+(cost-career.tokens)+' more tokens')+'</button><small>'+(next?'Next level costs '+cost+' tokens':'Fully upgraded')+'</small></article>';}).join('');
 for(const b of document.querySelectorAll('[data-upgrade]'))b.onclick=async()=>{const id=b.dataset.upgrade,expectedLevel=clubLevel(career,id);for(const button of document.querySelectorAll('[data-upgrade]'))button.disabled=true;try{const data=await api('/api/upgrade',{clubId:id,expectedLevel});career=data.profile;updateSuggestion();renderHome();homeMessage(CLUBS.find(c=>c.id===id).name+' upgraded to level '+(expectedLevel+2)+'. Spent '+data.spent+' tokens.');}catch(error){await loadCareer();homeMessage(error.message,true);renderEquipment();}};
 $('bagTitle').textContent='Your 14 clubs';$('bagDescription').textContent='Earn tokens on the course. Choose which club to improve. Upgrades cost 150, 400, 900 and 1,800 tokens.';$('bagClubs').innerHTML=CLUBS.map(c=>'<div><b>'+c.label+'</b><span>'+c.name+'</span><strong>Level '+(clubLevel(career,c.id)+1)+'</strong></div>').join('');
}
function showRoundNotice(){if(roundMode==='tour')toast('Pinecrest Tour · Round '+(Math.floor(holeIndex/18)+1)+' of 3 · Your group: '+tourGroup.map(g=>g.player.name).join(' and ')+(courseIndex>=3?' · Range Guide is off.':''),6500);else if(courseIndex>=3)toast('Range Guide is off on this course. Choose your own power for every shot, including putts.',6500);else toast(course.name+' · '+course.difficulty+' · '+(roundEnd-roundStart+1)+' holes');}
function applyRound(r){dailyConfig=r.daily||null;roundId=r.id;courseIndex=r.course;course=COURSES[courseIndex];roundMode=r.mode;HOLES=roundMode==='tour'?Array.from({length:54},(_,i)=>course.holes[i%18]):dailyConfig?course.holes.map(h=>dailyHole(h,dailyConfig)):course.holes;tourField=roundMode==='tour'?createTourField(r.id,course.holes,course.level):[];roundStart=dailyConfig?dailyConfig.start:roundMode==='back'?9:0;roundEnd=r.end_hole;scores=Array(HOLES.length).fill(null);for(const s of r.scores||[])scores[s.hole]=s.strokes;hasRound=true;closeHome();startHole(r.next_hole);showRoundNotice();}
async function startSelectedRound(){
 if(!profileLoaded||profileBusy||pendingScore)return;profileBusy=true;renderCourseChoices();
 try{const data=await api('/api/rounds',{course:pendingCourse,mode:pendingRound});career=data.profile;savedRound=data.round;applyRound(data.round);}catch(error){homeMessage(error.message,true);}finally{profileBusy=false;renderCourseChoices();}
}
function resumeSavedRound(){if(hasRound&&finished&&savedRound){applyRound(savedRound);return;}if(hasRound&&!(finished&&finalHole())){closeHome();renderer?.loadHole(hole);updateUI();showRoundNotice();}else if(savedRound)applyRound(savedRound);}
async function saveHoleResult(){
 if(!pendingScore||savePending)return;savePending=true;$('nextHole').disabled=true;$('retryScore').hidden=true;$('resultXP').textContent='Saving your score…';const payload={...pendingScore};
 try{const data=await api('/api/rounds/'+payload.roundId+'/holes',{hole:payload.hole,strokes:payload.strokes,metrics:payload.metrics});career=data.profile;savedRound=data.round;pendingScore=null;$('resultXP').textContent='+'+data.earned+' tokens'+(data.roundBonus?' · Round bonus included':'');$('resultUnlock').textContent=(roundMode==='daily'?(data.dailyReward?'Daily reward earned. ':'Daily reward already claimed, or finish all three holes. '):finalHole()&&roundMode==='full'?(medal(scores.reduce((a,b)=>a+(b||0),0))||'No')+' medal. ':'')+career.tokens+' tokens available.';$('nextHole').disabled=false;homeMessage(guestCareer?'Guest career saved for this browser.':'Career saved to your account.');}
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
function setAuthMode(mode){$('passwordHelp').hidden=true;$('forgotPassword').hidden=mode!=='login';authMode=mode;renderAccount();$('accountStatus').textContent='';$('loginPassword').autocomplete=mode==='login'?'current-password':'new-password';$('passwordLabel').textContent='Password';$('accountSubmit').textContent=mode==='register'?'Create account':'Sign in';$('registerMode').hidden=mode!=='login';$('loginMode').hidden=mode==='login';$('accountHint').textContent=mode==='register'?'Your current career will move into this account. Use a password with 12 or more characters.':'Sign in to resume your saved golfer, tokens and equipment.';}
function openAccount(mode){setAuthMode(mode);$('accountDialog').showModal();}
$('accountButton').onclick=()=>openAccount(account?'login':'register');$('createAccountCTA').onclick=()=>openAccount('register');$('signInCTA').onclick=()=>openAccount('login');$('registerMode').onclick=()=>setAuthMode('register');$('loginMode').onclick=()=>setAuthMode('login');
$('forgotPassword').onclick=()=>{$('accountForm').hidden=true;$('passwordHelp').hidden=false;$('accountTitle').textContent='Sign in help';$('accountStatus').textContent='';$('loginPassword').value='';$('passwordSupport').focus();};
$('passwordHelpBack').onclick=()=>{setAuthMode('login');$('loginEmail').focus();};
$('accountForm').onsubmit=async e=>{e.preventDefault();$('accountSubmit').disabled=true;$('accountStatus').textContent='Please wait…';try{const data=await api('/api/auth/'+authMode,{email:$('loginEmail').value,password:$('loginPassword').value});$('loginPassword').value='';$('accountDialog').close();hasRound=false;await loadCareer();}catch(error){$('accountStatus').textContent=error.message;}finally{$('accountSubmit').disabled=false;}};
$('signOut').onclick=async()=>{try{await api('/api/auth/logout',{});hasRound=false;account=null;$('accountDialog').close();await loadCareer();}catch(error){$('accountStatus').textContent=error.message;}};
$('deleteAccountButton').onclick=()=>{if(!account)return;$('accountDialog').close();$('deleteAccountEmail').textContent=account.email;$('deleteAccountPassword').value='';$('deleteAccountStatus').textContent='';$('deleteAccountDialog').showModal();};
$('cancelDeleteAccount').onclick=()=>$('deleteAccountDialog').close();
$('deleteAccountForm').onsubmit=async e=>{e.preventDefault();if(!account)return;$('confirmDeleteAccount').disabled=true;$('deleteAccountStatus').textContent='Deleting account…';try{await api('/api/auth/delete',{email:account.email,password:$('deleteAccountPassword').value});$('deleteAccountPassword').value='';$('deleteAccountDialog').close();account=null;hasRound=false;profileLoaded=false;recordData=[];await loadCareer();}catch(error){$('deleteAccountStatus').textContent=error.message;}finally{$('confirmDeleteAccount').disabled=false;}};
const TUTORIAL=[
 {chapter:'Getting started',title:'Your first round starts here',copy:'Learn the controls, then work through shot decisions before you play. These practice decisions do not spend tokens or affect your score. You can skip or replay this guide from the clubhouse.',cue:'12 LESSONS · CONTROLS + COURSE STRATEGY',tip:'Your goal: finish each hole in as few strokes as possible.'},
 {chapter:'Getting started',title:'Choose your challenge',copy:'All eight courses and 144 holes are available from the start, including the four challenge courses. Earn Bronze with 90 or lower over 18 holes, Silver with 81, and Gold with 72. Choose front nine, back nine, or a full round. Willow Park has wider fairways and slower greens; Pinecrest adds tighter lines, Granite Highlands adds elevation, and Atlantic Links has strong wind and fast greens.',cue:'RELAXED → CLUB → TOUR → CHAMPIONSHIP',tip:'Create your look in My golfer. Start with nine holes while learning.',question:'Which course gives you the most forgiving first round?',options:['Atlantic Links','Willow Park','Granite Highlands'],answer:1,feedback:'Willow Park offers the widest timing window and more forgiving conditions.'},
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

function recordShotStats(penalty){
 const lie=surface(hole,ball.x,ball.z);
 if(hole.par>3&&strokes===1)holeMetrics.fairway=!penalty&&['fairway','green'].includes(lie)?1:0;
 if(!penalty&&(lie==='green'||ball.holed)&&strokes<=hole.par-2)holeMetrics.gir=1;
}
async function loadDaily(){
 if(!profileLoaded)return;try{const data=await api('/api/daily');$('dailyDescription').textContent=COURSES[data.daily.course].name+' · Holes '+(data.daily.start+1)+'–'+(data.daily.end+1)+' · '+data.daily.day+'. '+data.daily.label;$('startDaily').disabled=profileBusy;$('startDaily').textContent=data.reward===null?'Play daily challenge':'Play again · '+data.reward+' tokens already earned';}catch(e){$('dailyDescription').textContent=e.message;$('startDaily').disabled=true;}
}
$('startDaily').onclick=async()=>{if(profileBusy||pendingScore)return;profileBusy=true;$('startDaily').disabled=true;try{const data=await api('/api/daily',{});career=data.profile;savedRound=data.round;applyRound(data.round);}catch(e){homeMessage(e.message,true);}finally{profileBusy=false;loadDaily();}};
async function loadStats(){
 $('personalStats').textContent='Loading stats…';try{const data=await api('/api/stats'),v=data.stats,percent=(n,d)=>d?Math.round((n||0)/d*100)+'%':'—';
 $('personalStats').innerHTML='<div class="stats-grid">'+[['Fairways hit',percent(v.fairways,v.fairwayAttempts),(v.fairways||0)+' of '+v.fairwayAttempts+' tee shots'],['Greens in regulation',percent(v.greens,v.greenAttempts),(v.greens||0)+' of '+v.greenAttempts+' holes'],['Putts per hole',v.trackedHoles?((v.putts||0)/v.trackedHoles).toFixed(2):'—',v.trackedHoles+' tracked holes']].map(([label,value,note])=>'<article><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>').join('')+'</div><p>Shot statistics begin with this update. Earlier scores still count toward your best rounds. Practice and daily challenges are excluded.</p><h2>Best full rounds</h2><div class="record-cards">'+COURSES.map((c,i)=>'<article class="record-card"><h2>'+c.name+'</h2><p>'+(data.courseBest[i]===undefined?'No completed 18 hole round':data.courseBest[i]+' strokes · '+scoreText(data.courseBest[i]-c.par)+' · '+(data.courseMedals[i]||'No medal'))+'</p></article>').join('')+'</div>';
 }catch(e){$('personalStats').textContent=e.message;}
}
$('statsTab').onclick=()=>setHomeTab('stats');$('refreshStats').onclick=loadStats;
function practiceState(){return {courseIndex,course,HOLES,roundMode,roundStart,roundEnd,holeIndex,hole,ball,clubIndex,angle,view,strokes,scores,phase,power,actor,trail,lastLie,shotStart,shotDistance,shotCarry,shotInFlight,finished,greenGrid,aimTarget,hasRound,roundId,dailyConfig,holeMetrics,lastReplay,tourField,tourGroup,puttScaleFeet};}
function startPractice(kind){
 if(savePending||pendingScore)return;practiceSnapshot=practiceState();practice=kind;hasRound=false;courseIndex=0;course=COURSES[0];roundMode='practice';roundId=null;roundStart=0;roundEnd=0;dailyConfig=null;
 $('practiceControls').hidden=false;$('game').classList.add('practicing');$('practiceLabel').textContent=kind==='range'?'Driving range':'Putting green';$('practiceDistance').innerHTML=(kind==='range'?[50,100,150,200,250]:[5,10,20,30]).map(n=>'<option value="'+n+'">'+n+(kind==='range'?' yd':' ft')+'</option>').join('');$('practiceDistance').value=kind==='range'?'150':'10';closeHome();resetPractice();
}
function resetPractice(){
 if(practice==='impossible'){resetImpossible();return;}
 if(!practice)return;const d=Number($('practiceDistance').value)/(practice==='range'?YD:YD*3),h={...structuredClone(COURSES[0].holes[0]),id:'practice',practice:practice,name:'Practice',pin:[0,practice==='range'?-d:-80],path:[[0,0],[0,-d]],centerline:[[0,0],[0,-d]],water:[],sand:[],wind:[0,0],gust:0,elevation:0,width:40,greenRadius:practice==='range'?9:18,slope:practice==='range'?[0,0]:[.014,.01],contour:practice==='range'?0:.045};
 HOLES=[h];scores=[null];startHole(0);if(practice==='putting'){ball=makeBall(h,0,h.pin[1]+d);clubIndex=PUTTER_INDEX;angle=0;aimTarget=[...h.pin];greenGrid=true;view='putting';updateSuggestion();}else{view='follow';clubIndex=recommendedClub(h,ball);updateSuggestion();}
 $('practiceFeedback').textContent='No scores saved. Reset the ball to repeat this shot.';drawMap();
}
function practiceRest(holed){
 if(practice==='impossible'){impossibleRest(holed);return;}
 phase='ready';finished=false;power=0;ball.moving=false;trail=[];aimTarget=[...hole.pin];angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z));
 $('practiceFeedback').textContent=holed?'Holed! Reset the ball for another attempt.':Math.round(shotCarry*YD)+' yd carry · '+Math.round(shotDistance*YD)+' yd total · '+(Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD*(practice==='putting'?3:1)).toFixed(1)+(practice==='putting'?' ft':' yd')+' from target.';
 updateSuggestion();$('swingButton').disabled=holed;drawMap();
}
function leavePractice(){
 const v=practiceSnapshot;if(!v)return;({courseIndex,course,HOLES,roundMode,roundStart,roundEnd,holeIndex,hole,ball,clubIndex,angle,view,strokes,scores,phase,power,actor,trail,lastLie,shotStart,shotDistance,shotCarry,shotInFlight,finished,greenGrid,aimTarget,hasRound,roundId,dailyConfig,holeMetrics,lastReplay,tourField,tourGroup,puttScaleFeet}=v);practice=null;practiceSnapshot=null;recording=null;$('lengthValue').textContent=Math.round(hole.path.reduce((s,p,i)=>i?s+Math.hypot(p[0]-hole.path[i-1][0],p[1]-hole.path[i-1][1]):0,0)*YD);$('practiceControls').hidden=true;$('game').classList.remove('practicing');$('replayShot').hidden=$('replayHole').hidden=!lastReplay;
}
function renderImpossibleSession(){
 $('impossibleSession').textContent=impossibleAttempts?impossibleAttempts+' attempts · '+impossibleClears+' completed · Session best: '+(impossibleBest===null?'not finished':impossibleBest+' strokes'):'No attempts this session.';
}
function startImpossible(){
 if(impossibleAward?.strokes&&!impossibleAward.done){$('impossibleDialog').showModal();return;}
 if(savePending||pendingScore)return;if(replay)stopReplay();if(practice)leavePractice();skipTourShots(false);cancelSetup();
 practiceSnapshot=practiceState();practice='impossible';hasRound=false;roundId=null;roundMode='impossible';roundStart=roundEnd=0;dailyConfig=null;
 courseIndex=7;course={...COURSES[7],name:'The Gauntlet',difficulty:'Virtually impossible',level:10};
 for(const d of document.querySelectorAll('dialog[open]'))d.close();$('practiceControls').hidden=true;closeHome();resetImpossible(true);
 toast('The Gauntlet · Range Guide off · 20-stroke limit · Every water penalty counts.',6000);
}
function resetImpossible(initial=false){
 if(impossibleAward?.strokes&&!impossibleAward.done){toast('Save your challenge reward before starting again.');$('impossibleDialog').showModal();return;}
 if(practice!=='impossible'||(initial!==true&&(ball.moving||['power','accuracy','downswing'].includes(phase))))return;
 if(replay)stopReplay();$('impossibleDialog').close();impossibleAward={start:api('/api/impossible/start',{}).catch(()=>null),strokes:null,busy:false,done:false};$('impossibleReward').textContent='';$('claimImpossible').hidden=true;impossibleAttempts++;HOLES=[impossibleHole()];scores=[null];view='follow';startHole(0);renderImpossibleSession();
}
function updateImpossibleUI(){
 const active=practice==='impossible';$('impossibleBar').hidden=!active||homeOpen;if(!active)return;
 const busy=ball.moving||['power','accuracy','downswing'].includes(phase)||!!replay;
 $('retryImpossible').disabled=busy;$('exitImpossible').disabled=busy;$('swingButton').disabled=ball.moving||['downswing','complete'].includes(phase)||!!replay||finished;
 $('courseTitle').textContent='THE GAUNTLET · EXTREME';$('roundProgress').textContent='STANDALONE CHALLENGE · PAR 5';$('holeName').textContent='The Gauntlet';$('mobileHole').textContent='Gauntlet · Par 5';
 $('impossibleStatus').textContent='Attempt '+impossibleAttempts+' · '+strokes+'/20 strokes'+(impossibleBest===null?'':' · Best '+impossibleBest);
 $('statusLine').textContent=finished?'ATTEMPT FINISHED · RETRY OR LEAVE':ball.moving?'THE GAUNTLET · BALL IN PLAY':'NO RANGE GUIDE · EVERY PENALTY COUNTS';
}
function impossibleRest(holed){
 if(finished)return;
 phase='ready';power=0;ball.moving=false;trail=[];aimTarget=[...hole.pin];angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z));clubIndex=recommendedClub(hole,ball);
 greenGrid=['green','fringe'].includes(surface(hole,ball.x,ball.z));
 if(holed||strokes>=20){
  finished=true;phase='complete';if(holed){impossibleClears++;impossibleBest=Math.min(impossibleBest??Infinity,strokes);}
  $('impossibleResultTitle').textContent=holed?'You beat The Gauntlet.':'The Gauntlet wins.';
  $('impossibleResultCopy').textContent=holed?'Holed in '+strokes+' strokes ('+scoreText(strokes-5)+'). Session best: '+impossibleBest+'.':'20 strokes reached, including penalties. Try a different landing spot, club or spin setting.';
  renderImpossibleSession();$('impossibleDialog').showModal();if(holed){impossibleAward.strokes=strokes;impossibleAward.saving=claimImpossibleReward();}
 }
 updateSuggestion();drawMap();
}
async function claimImpossibleReward(){
 const award=impossibleAward;if(!award||award.busy||award.done||!award.strokes)return;award.busy=true;
 $('impossibleReward').textContent='Saving your 1,000-credit reward…';$('claimImpossible').hidden=true;
 try{let started=await award.start;if(!started){award.start=api('/api/impossible/start',{}).catch(()=>null);started=await award.start;}if(!started)throw Error('Unable to save reward. Please retry.');
 const data=await api('/api/impossible/reward',{id:started.id,strokes:award.strokes});career=data.profile;award.done=true;renderHome();
 if(impossibleAward===award)$('impossibleReward').textContent='+1,000 credits added to your upgrade tokens.';
 }catch(e){if(impossibleAward===award){$('impossibleReward').textContent=e.message;$('claimImpossible').hidden=false;}}
 finally{award.busy=false;}
}
$('claimImpossible').onclick=claimImpossibleReward;
function exitImpossible(){
 if(practice!=='impossible'||ball.moving||['power','accuracy','downswing'].includes(phase))return;
 $('impossibleDialog').close();showCourses();setHomeTab('impossible');renderImpossibleSession();
}
$('impossibleTab').onclick=()=>{setHomeTab('impossible');renderImpossibleSession();};
$('startImpossible').onclick=startImpossible;$('retryImpossible').onclick=$('impossibleAgain').onclick=resetImpossible;$('exitImpossible').onclick=$('impossibleDone').onclick=exitImpossible;
$('practiceRange').onclick=()=>startPractice('range');$('practicePutting').onclick=()=>startPractice('putting');$('practiceReset').onclick=resetPractice;$('practiceDistance').onchange=resetPractice;
$('puttingCamera').onclick=()=>{if(ball.moving)return;$('mobileDetailsDialog').close();cancelSetup();view=view==='putting'?'follow':'putting';if(view==='putting')greenGrid=true;updateUI();};
function captureReplay(dt){if(!recording||recording.frames.length>=2500)return;recording.time+=dt;recording.frames.push({t:recording.time,ball:{...ball},actor:structuredClone(actor),angle,view});}
function sealReplay(holed){
 if(!recording)return;captureReplay(1/120);recording.label=holed?(recording.putt&&recording.distance>=15?'Long putt holed':'Hole out'):recording.label;lastReplay=recording;recording=null;$('replayShot').hidden=$('replayHole').hidden=false;
}
function startReplay(){
 if(!lastReplay||ball.moving||!['ready','complete'].includes(phase))return;const modal=$('holeDialog').open;if(modal)$('holeDialog').close();replay={clip:lastReplay,time:0,index:0,modal,eye:[...renderer.eye],center:[...renderer.center],bag:renderer.bagAnchor?{...renderer.bagAnchor}:null};$('replayControls').hidden=false;$('replayLabel').textContent=lastReplay.label+' · Replay';$('game').classList.add('replaying');$('mobileReplayStop').hidden=false;
}
function stopReplay(){if(!replay)return;const r=replay;replay=null;renderer.eye=r.eye;renderer.center=r.center;renderer.bagAnchor=r.bag;$('replayControls').hidden=true;$('game').classList.remove('replaying');$('mobileReplayStop').hidden=true;if(r.modal)$('holeDialog').showModal();}
function playReplay(dt){
 replay.time+=dt;const frames=replay.clip.frames;while(replay.index<frames.length-1&&frames[replay.index+1].t<=replay.time)replay.index++;const frame=frames[replay.index];renderer.render({...frame,hole:replay.clip.hole,moving:frame.ball.moving,trail:[],greenGrid:false},dt);if(replay.time>frames.at(-1).t+1)stopReplay();
}
$('replayShot').onclick=$('replayHole').onclick=()=>{$('mobileDetailsDialog').close();startReplay();};$('stopReplay').onclick=stopReplay;

function openMobileTools(mapOnly=false){
 cancelSetup();const dialog=$('mobileDetailsDialog');dialog.classList.toggle('map-mode',mapOnly);
 $('mobileDetailsTitle').textContent=mapOnly?'Aim with the map':'Shot tools & details';
 $('mobileDetailsContent').textContent=mapOnly?'Tap a landing spot to aim and return to the course.':$('toast').textContent;
 $('mobileToolsContent').appendChild($('hudLeft'));$('mobileToolsContent').appendChild($('hudRight'));
 $('mobileSound').textContent=sound?'Turn sound off':'Turn sound on';$('mobileSpin').disabled=clubIndex===PUTTER_INDEX||phase!=='ready';$('mobileMapButton').setAttribute('aria-expanded',String(mapOnly));
 dialog.showModal();drawMap();
}
function restoreMobileTools(){
 $('hudMiddle').insertBefore($('hudLeft'),$('hudCenter'));$('hudMiddle').appendChild($('hudRight'));$('mobileMapButton').setAttribute('aria-expanded','false');
}
$('mobileDetailsDialog').addEventListener('close',restoreMobileTools);
$('mobileMapButton').onclick=()=>openMobileTools(true);
$('mobileDetailsButton').onclick=()=>openMobileTools();
$('mobileReplayStop').onclick=stopReplay;
$('mobileSpin').onclick=()=>{$('mobileDetailsDialog').close();$('spinButton').click();};
$('mobileScore').onclick=()=>{$('mobileDetailsDialog').close();showScore();};
$('mobileHelp').onclick=()=>{$('mobileDetailsDialog').close();$('helpDialog').showModal();};
$('mobileSound').onclick=()=>{$('soundButton').click();$('mobileSound').textContent=sound?'Turn sound off':'Turn sound on';};
$('characterTab').onclick=()=>setHomeTab('character');$('recordsTab').onclick=()=>setHomeTab('records');
$('puttScale').onchange=()=>{
 const selected=Number($('puttScale').value);if(!ready()||clubIndex!==PUTTER_INDEX||!PUTT_SCALES.includes(selected)){updateUI();return;}
 puttScaleFeet=selected;updateSuggestion();drawMap();
};
for(const event of ['keydown','keyup'])$('puttScale').addEventListener(event,e=>e.stopPropagation());
$('spinButton').onclick=()=>{if(!ready()||clubIndex===PUTTER_INDEX)return;syncSpin();$('spinDialog').showModal();};
$('backSpin').oninput=e=>{if(phase==='ready'){spinBack=Number(e.target.value)/100;syncSpin();}};$('sideSpin').oninput=e=>{if(phase==='ready'){spinShape=Number(e.target.value)/100;syncSpin();}};$('resetSpin').onclick=()=>{spinBack=0;spinShape=0;syncSpin();};
function playKeeperSound(tool){
 if(!sound)return;if(tool==='hose'){playTone('water');return;}
 try{
 audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();
 const now=audioContext.currentTime,squeak=tool==='squeaky'||tool==='plunger',spin=tool==='broom'||tool==='shovel',count=squeak||spin?2:1;
 for(let i=0;i<count;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=now+i*.13;osc.type=squeak?'sine':'triangle';osc.frequency.setValueAtTime(squeak?700+i*250:spin?240+i*100:180,t);osc.frequency.exponentialRampToValueAtTime(squeak?160:55,t+.28);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.065,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.30);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.32);}
 }catch{sound=false;}
}
function renderKeeperUI(){
 if($('keeperQuip').textContent!==keeper.spokenLine)$('keeperQuip').textContent=keeper.spokenLine;
 $('keeperSound').textContent=sound?'Sound on':'Sound off';$('keeperSound').setAttribute('aria-pressed',String(sound));
 $('keeperScore').textContent=keeper.score;$('keeperTime').textContent=Math.ceil(keeper.time)+'s';$('keeperBest').textContent=keeper.best;$('keeperNeedle').style.left=(keeper.marker*100)+'%';
 if($('keeperFeedback').textContent!==keeper.message)$('keeperFeedback').textContent=keeper.message;
 $('keeperDifficulty').disabled=keeper.running;$('keeperDifficultyHint').textContent=keeper.settings.description;$('keeperSelectedTool').textContent=KEEPER_TOOLS[keeper.tool].name;
 $('keeperToolInfo').textContent=KEEPER_TOOLS[keeper.tool].name+' · '+KEEPER_TOOLS[keeper.tool].points+' points · '+Math.max(.6,KEEPER_TOOLS[keeper.tool].cooldown)+'s recovery';
 $('keeperAccuracy').textContent=keeper.accuracy+'%';$('keeperPerfects').textContent=keeper.perfects;$('keeperCombo').textContent=(1+keeper.combo)+'×';
 $('keeperTarget').style.left=(50-keeper.settings.window*100)+'%';$('keeperTarget').style.width=keeper.settings.window*200+'%';$('keeperPerfectZone').style.left=(50-keeper.settings.perfect*100)+'%';$('keeperPerfectZone').style.width=keeper.settings.perfect*200+'%';$('keeperHit').disabled=!keeper.running||keeper.cooldown>0||keeperRenderFailed;$('keeperHit').textContent=keeper.cooldown>0?'Ready in '+keeper.cooldown.toFixed(1)+'s':KEEPER_TOOLS[keeper.tool].verb;$('keeperStart').textContent=keeper.running?'Restart round':'Start 30 second round';
 for(let i=0;i<KEEPER_TOOLS.length;i++)$('keeperTool'+i).setAttribute('aria-pressed',String(keeper.tool===i));
}
function updateKeeper(dt){
 if(!keeperRenderer&&!keeperRenderFailed)try{keeperRenderer=new GolfRenderer($('keeperCanvas'));}catch(e){keeperRenderFailed=true;$('keeperRenderError').hidden=false;$('keeperStart').disabled=true;}
 const before=keeper.effect;keeper.update(dt);
 if(before<.18&&keeper.effect>=.18&&keeper.quality!=='idle'&&keeper.quality!=='miss'){playKeeperSound(keeper.effectTool);window.golfHaptic?.(keeper.quality==='perfect'?'perfect':'hit');}
 renderKeeperUI();if(!keeperRenderer)return;
 const h=COURSES[0].holes[0];keeperRenderer.render({hole:h,ball:makeBall(h),angle:0,view:'greenskeeper',moving:false,trail:[],power:0,clubIndex:PUTTER_INDEX,keeper:{elapsed:keeper.effect,tool:keeper.effectTool,quality:keeper.quality,variant:keeper.variant,closeView:keeper.closeView,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches},actor:{x:0,z:0,angle:0,club:CLUBS[PUTTER_INDEX],appearance:{skin:1,shirt:5,pants:2,cap:3,hat:true},phase:'follow',progress:1,power:.4}},dt);
}
$('greenskeeperTab').onclick=()=>{setHomeTab('greenskeeper');renderKeeperUI();};
for(let i=0;i<KEEPER_TOOLS.length;i++)$('keeperTool'+i).onclick=()=>{keeper.tool=i;if(keeper.cooldown===0){keeper.effectTool=KEEPER_TOOLS[i].id;keeper.effect=2;keeper.quality='idle';}renderKeeperUI();};
$('keeperStart').onclick=()=>{keeper.start();renderKeeperUI();};
$('keeperHit').onclick=()=>{keeper.strike();renderKeeperUI();};
$('keeperDifficulty').onchange=e=>{keeper.setDifficulty(e.target.value);renderKeeperUI();};
$('keeperSound').onclick=()=>{$('soundButton').click();renderKeeperUI();};
$('keeperCamera').onclick=()=>{keeper.closeView=!keeper.closeView;$('keeperCamera').setAttribute('aria-pressed',String(keeper.closeView));$('keeperCamera').textContent=keeper.closeView?'Office view':'Close-up view';};
$('playTab').onclick=()=>setHomeTab('play');$('equipmentTab').onclick=()=>setHomeTab('equipment');$('homeRetry').onclick=loadCareer;$('resumeRound').onclick=resumeSavedRound;$('retryScore').onclick=saveHoleResult;
$('courseButton').onclick=showCourses;$('startRound').onclick=startSelectedRound;
function resetTourGroup(){
 tourQueue=[];tourTurn=null;tourAfterTurns=null;$('game').classList.remove('npc-playing');
 tourGroup=roundMode==='tour'&&!practice?tourPartners(tourField,scores,course.holes,Math.floor(holeIndex/18)).map(player=>({player,strokes:0})):[];
}
function updateTourUI(){
 const active=roundMode==='tour'&&!practice,button=$('tourBar');button.hidden=!active||homeOpen;$('resultTourLeaderboard').hidden=!active;
 if(!active)return;
 const round=Math.floor(holeIndex/18)+1,board=tourStandings(tourField,scores,course.holes,career.displayName||'You'),own=board.find(p=>p.id==='you');
 $('holeCount').textContent=String(holeIndex%18+1).padStart(2,'0')+' / 18';$('mobileHole').textContent='R'+round+' · H'+(holeIndex%18+1);
 $('roundProgress').textContent='TOUR · ROUND '+round+' / 3 · HOLE '+(holeIndex%18+1)+' / 18';
 $('tourStatus').textContent=tourTurn?tourTurn.player.name+(tourTurn.penalty?' · '+tourTurn.reason+' penalty +1 · Drop at previous lie':' · Shot '+tourTurn.shot):'Round '+round+'/3 · '+own.place+' · '+scoreText(own.toPar);
 $('skipTourShot').hidden=!tourTurn;
 if(finished){
  const boundary=holeIndex%18===17;
  $('resultEyebrow').textContent=finalHole()?'TOURNAMENT COMPLETE':boundary?'ROUND '+round+' COMPLETE':'ROUND '+round+' · HOLE '+(holeIndex%18+1);
  $('resultCopy').textContent=(finalHole()?(own.rank===1?'First place':'Finished '+own.place)+' · '+own.total+' strokes across 54 holes.':boundary?'Round '+round+' complete. Next: round '+(round+1)+' on '+course.name+'.':'Your group: '+tourGroup.map(g=>g.player.name+' '+g.player.scores[holeIndex]).join(' · '))+ ' Tour total '+scoreText(own.toPar)+'.';
  $('nextHole').textContent=finalHole()?'Back to the clubhouse':boundary?'Start round '+(round+1):'Next hole';
 }
}
function showTourLeaderboard(){
 if(roundMode!=='tour'||practice)return;cancelSetup();
 const board=tourStandings(tourField,scores,course.holes,career.displayName||'You'),own=board.find(p=>p.id==='you');
 $('tourTitle').textContent=course.name+' Open';$('tourSummary').textContent=(own.through===54?'Final results':'Round '+(Math.floor(holeIndex/18)+1)+' of 3')+' · '+own.through+'/54 holes complete · Your position: '+own.place+'. Playing partners: '+tourGroup.map(g=>g.player.name).join(' and ')+'.';
 $('tourTable').innerHTML='<table><thead><tr><th>POS</th><th>PLAYER</th><th>R1</th><th>R2</th><th>R3</th><th>TOTAL</th><th>TO PAR</th></tr></thead><tbody>'+board.map(p=>'<tr class="'+(p.id==='you'?'tour-you':'')+'"><td>'+p.place+'</td><td>'+escapeHTML(p.name)+(p.id==='you'?' (you)':'')+'</td>'+p.rounds.map((r,i)=>'<td>'+(r===null?'—':r+(p.through<(i+1)*18?'*':''))+'</td>').join('')+'<td>'+(p.through?p.total:'—')+'</td><td>'+scoreText(p.toPar)+'</td></tr>').join('')+'</tbody></table><p>* Round in progress. All totals include completed holes only.</p>';
 $('tourDialog').showModal();
}
function queueTourShots(finish=false,after=null){
 if(roundMode!=='tour'||practice||homeOpen)return;
 for(const group of tourGroup){const target=finish?group.player.scores[holeIndex]:Math.min(strokes,group.player.scores[holeIndex]);while(group.strokes<target||group.player.shots?.[holeIndex]?.[group.strokes]?.penalty){group.strokes++;tourQueue.push({player:group.player,shot:group.strokes,...tourShot(hole,group.player,holeIndex,group.strokes),elapsed:0});}}
 tourAfterTurns=after;nextTourTurn();
}
function nextTourTurn(){
 tourTurn=tourQueue.shift()||null;if(tourTurn&&!tourTurn.putt&&!tourTurn.penalty)tourTurn.flight=prepareNPCFlight(hole,tourTurn);$('game').classList.toggle('npc-playing',Boolean(tourTurn));
 updateUI();if(!tourTurn){const done=tourAfterTurns;tourAfterTurns=null;done?.();}
}
function skipTourShots(showResult=true){
 tourQueue=[];tourTurn=null;$('game').classList.remove('npc-playing');const done=tourAfterTurns;tourAfterTurns=null;
 if(showResult){updateUI();done?.();}
}
function playTourTurn(dt){
 const t=tourTurn;if(!t)return;t.elapsed+=dt;
 if(t.penalty){
  const b=makeBall(hole,...t.to);renderer?.render({hole,ball:b,angle:0,view:'follow',moving:false,actor:null,trail:[],power:0,greenGrid:false},dt);
  if(t.elapsed>1.3)nextTourTurn();return;
 }
 const swing=t.putt?.55:.75,flight=t.putt?t.duration:t.flight.duration;
 const club=CLUBS[t.clubIndex],angle=t.putt?t.angle:Math.atan2(t.to[0]-t.from[0],-(t.to[1]-t.from[1]));
 const b=t.putt?{...makeBall(hole,...t.from),...tourPuttFrame(t,t.elapsed-swing),moving:t.elapsed>=swing&&t.elapsed<swing+flight,airborne:false,holed:t.holed&&t.elapsed>=swing+flight}:npcFlightFrame(t,t.flight,t.elapsed-swing);

 const back=t.putt?.36:.5;
 const actor={x:t.from[0],z:t.from[1],angle,club,appearance:t.player.appearance,phase:t.elapsed<back?'backswing':t.elapsed<swing?'downswing':'follow',progress:t.elapsed<back?t.elapsed/back:t.elapsed<swing?(t.elapsed-back)/(swing-back):clamp((t.elapsed-swing)/.6,0,1),power:t.putt?clamp(t.power,.08,.5):t.power};
 renderer?.render({hole,ball:b,angle,view:t.putt?'putting':'follow',shotCamera:{angle,distance:t.putt?6:clamp(t.distance*.04+7,8,18),height:t.putt?3:8},moving:b.moving,actor,trail:[],power:0,greenGrid:false},dt);
 if(t.elapsed>swing+flight+.35)nextTourTurn();
}
$('tourLeaderboard').onclick=$('resultTourLeaderboard').onclick=showTourLeaderboard;
$('skipTourShot').onclick=()=>skipTourShots();
$('swingButton').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();$('swingButton').setPointerCapture(e.pointerId);beginCharge();});
$('swingButton').addEventListener('pointerup',e=>{e.preventDefault();releasePower();});
$('swingButton').addEventListener('pointercancel',cancelSetup);$('swingButton').addEventListener('lostpointercapture',()=>{if(phase==='power')cancelSetup();});
$('swingButton').addEventListener('keydown',e=>{if(e.code==='Enter'&&!e.repeat){e.preventDefault();beginCharge();}});$('swingButton').addEventListener('keyup',e=>{if(e.code==='Enter'){e.preventDefault();releasePower();}});
$('clubPrev').onclick=()=>changeClub(-1);$('clubNext').onclick=()=>changeClub(1);$('cameraButton').onclick=()=>{$('mobileDetailsDialog').close();toggleView();};$('gridButton').onclick=()=>{$('mobileDetailsDialog').close();greenGrid=!greenGrid;updateUI();};
$('helpButton').onclick=()=>{cancelSetup();$('helpDialog').showModal();};$('scoreButton').onclick=showScore;$('resultScorecard').onclick=showScore;
function renderMusicControls(){
 for(const id of ['homeMusic','mobileMusic']){$(id).textContent=music.enabled?'Music on':'Music off';$(id).setAttribute('aria-pressed',String(music.enabled));}
 for(const id of ['homeMusicVolume','mobileMusicVolume']){$(id).value=Math.round(music.volume*100);$(id+'Value').textContent=Math.round(music.volume*100)+'%';}
}
for(const id of ['homeMusic','mobileMusic'])$(id).onclick=()=>{music.setEnabled(!music.enabled);renderMusicControls();};
for(const id of ['homeMusicVolume','mobileMusicVolume'])$(id).oninput=()=>{music.setVolume(Number($(id).value)/100);renderMusicControls();};
renderMusicControls();
$('soundButton').onclick=()=>{sound=!sound;$('soundButton').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('soundButton').querySelector('.off-mark').hidden=sound;if(sound)playTone('bounce');};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
for(const d of document.querySelectorAll('dialog')){d.addEventListener('click',e=>{if(e.target===d&&d.id!=='holeDialog'){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});if(d.id==='holeDialog')d.addEventListener('cancel',e=>e.preventDefault());}
function canFastForwardShot(){return !tourTurn&&(phase==='downswing'||ball.moving)&&!homeOpen&&!replay;}
function updateFastForwardControl(){
 const button=$('fastForwardShot'),label=fastForward?'Fast-forwarding 4×':'Fast-forward 4×';
 button.hidden=!canFastForwardShot();button.disabled=fastForward;button.setAttribute('aria-pressed',String(fastForward));
 if(button.textContent!==label)button.textContent=label;
}
function fastForwardCurrentShot(){
 if(!canFastForwardShot()||isModal()||document.hidden||fastForward)return;
 fastForward=true;updateFastForwardControl();
}
$('fastForwardShot').addEventListener('pointerdown',e=>{
 if(e.button!==0||e.isPrimary===false)return;
 e.preventDefault();fastForwardCurrentShot();
});
// Keyboard/assistive clicks also work; a synthesized click cannot undo a pointer press.
$('fastForwardShot').onclick=fastForwardCurrentShot;
$('nextHole').onclick=()=>{if(savePending||pendingScore||tourTurn)return;$('holeDialog').close();if(finalHole()){showCourses();}else{startHole(holeIndex+1);toast((roundMode==='tour'?'Round '+(Math.floor(holeIndex/18)+1)+' · ':'')+hole.name+' · Par '+hole.par);}};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=renderer?.pointOnCourse(e.clientX,e.clientY);if(p)aimAt(...p);});
map.addEventListener('pointerdown',e=>{if(!mapTransform)return;const r=map.getBoundingClientRect(),x=(e.clientX-r.left)*map.width/r.width,y=(e.clientY-r.top)*map.height/r.height;$('mobileDetailsDialog').close();aimAt((x-mapTransform.cx)/mapTransform.scale,(mapTransform.cz-y)/mapTransform.scale);});
for(const [id,dir]of[['aimLeft',-1],['aimRight',1]]){const btn=$(id);btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);pointerAim=dir;aimDelta(dir*.008);});for(const event of['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(event,()=>{pointerAim=0;});}
window.addEventListener('keydown',e=>{if(replay){if(e.code==='Escape')stopReplay();return;}if(isModal()||homeOpen)return;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)beginCharge();if(e.code==='ArrowLeft')aimKey=-1;if(e.code==='ArrowRight')aimKey=1;if(e.code==='KeyC'&&!e.repeat)toggleView();if(e.code==='KeyG'&&!e.repeat){greenGrid=!greenGrid;updateUI();}if(e.code==='ArrowUp'&&!e.repeat)changeClub(-1);if(e.code==='ArrowDown'&&!e.repeat)changeClub(1);if(e.code==='Escape')cancelSetup();if(/^Digit[1-8]$/.test(e.code)&&ready()){clubIndex=Number(e.code.slice(-1))-1;updateSuggestion();}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();releasePower();}if(e.code==='ArrowLeft'||e.code==='ArrowRight')aimKey=0;});window.addEventListener('blur',cancelSetup);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSetup();});
let last=performance.now(),accum=0,uiClock=0,aimClock=0;
function animate(now){
 music.setQuiet(['power','accuracy','downswing'].includes(phase));
  const dt=Math.min((now-last)/1000,.05);last=now;if(replay){if(!document.hidden)playReplay(dt);requestAnimationFrame(animate);return;}const paused=isModal()||document.hidden||homeOpen;if(tourTurn){if(!paused)playTourTurn(dt);requestAnimationFrame(animate);return;}const flightRate=(phase==='downswing'||ball.moving)&&fastForward?4:1;
  if(!paused){
    if((aimKey||pointerAim)&&ready()){aimClock+=dt;if(aimClock>.035){aimDelta((aimKey||pointerAim)*aimClock*(clubIndex===PUTTER_INDEX?.15:.32));aimClock=0;}}
    if(phase==='power'){chargeTime+=dt;const t=(chargeTime/(clubIndex===PUTTER_INDEX?1.25:1.05))%2;power=clamp(t<=1?t:2-t,.008,1);actor.progress=Math.min(1,chargeTime/.2);actor.power=power;}
    if(phase==='accuracy'){timingTime+=dt;const speed=clubIndex===PUTTER_INDEX?hole.timingSpeed*.66:hole.timingSpeed,t=(timingTime*speed)%2;timingNeedle=-1+2*(t<=1?t:2-t);if(timingTime>3){timingNeedle=1;commitStrike();}}
    if(phase==='downswing'){downswingTime+=dt*flightRate;const duration=actor.cinematic?(actor.club.type==='putter'?.42:.70):(actor.club.type==='putter'?.16:.20),t=clamp(downswingTime/duration,0,1);actor.progress=actor.cinematic?(t<.8?t*.45:.36+(t-.8)*3.2):t;if(downswingTime>=duration)impact();}
    if(actor?.phase==='follow'){followTime+=dt*flightRate;actor.progress=clamp(followTime/.60,0,1);}
    if(ball.moving){accum+=dt*flightRate;for(let i=0;i<32&&accum>=1/120&&ball.moving;i++){
      accum-=1/120;const previous={x:ball.x,z:ball.z},event=stepBall(ball,hole,1/120);shotDistance=Math.hypot(ball.x-shotStart.x,ball.z-shotStart.z);collisionCooldown-=1/120;
      if(collisionCooldown<=0&&ball.moving)for(const t of renderer.trees){const distance=Math.hypot(ball.x-t.x,ball.z-t.z),trunk=distance<(t.r||.5)+.08&&ball.y<t.y+t.h*.68,canopy=distance<t.canopy*.8&&ball.y>t.y+t.h*.48&&ball.y<t.y+t.h;if(trunk||canopy){ball.vx*=trunk?-.32:.46;ball.vz*=trunk?-.32:.46;ball.vy*=.65;if(trunk){ball.x=previous.x;ball.z=previous.z;}collisionCooldown=.7;toast(trunk?'Caught the trunk.':'Clipped the canopy.');break;}}
      if(event==='bounce'){if(shotInFlight){shotCarry=shotDistance;shotInFlight=false;}playTone('bounce');}
      if(event==='water'||event==='out'){strokes++;ball=makeBall(hole,lastLie.x,lastLie.z);restAfterShot(true);toast((event==='water'?'In the water.':'Out of bounds.')+' +1 penalty · replay from your last lie.',3800);playTone('water');break;}
      if(event==='cup'){finishHole();break;}if(event==='rest'){restAfterShot();break;}
    }
    if(ball.moving){trail.push({x:ball.x,y:ball.y,z:ball.z});if(trail.length>95)trail.shift();$('flightDistance').innerHTML=Math.round(shotDistance*YD)+' <small>yd</small>';$('flightPhase').textContent=ball.airborne?'IN FLIGHT':'ROLLING';}}
    else accum=0;
  }
  if(recording&&!paused)captureReplay(dt*flightRate);
  uiClock+=dt;if(uiClock>.035){updateUI();uiClock=0;}if(now%150<20)drawMap();
  if(homeOpen&&homeTab==='greenskeeper'){updateKeeper(isModal()||document.hidden?0:dt);requestAnimationFrame(animate);return;}
  if(homeOpen){const h=COURSES[pendingCourse].holes[0],hb=makeBall(h);renderer?.render({ball:hb,hole:h,angle:0,view:homeTab==='character'?'character':homeTab==='equipment'?'equipment':'home',moving:false,trail:[],power:0,clubIndex:0,actor:{x:0,z:0,angle:0,club:upgradeClub(CLUBS[0],clubLevel(career,CLUBS[0].id)),appearance:homeTab==='character'?appearanceDraft:career.appearance,phase:'address',progress:0,power:.7}},dt);}else renderer?.render({ball,hole,angle,view,moving:ball.moving,trail,power,clubIndex,actor,greenGrid},paused?0:dt);requestAnimationFrame(animate);
}
if(renderer){startHole(roundStart);renderHome();requestAnimationFrame(animate);}loadCareer();
if(document.modelContext?.registerTool){
  const life=new AbortController(),register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}};
  register({name:'get_golf_state',description:'Read the current championship golf hole, lie, club, score, and swing phase.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({hole:holeIndex+1,totalHoles:HOLES.length,availableHoles:TOTAL_HOLES,course:course.name,difficulty:course.difficulty,round:roundMode,name:hole.name,par:hole.par,strokes,club:CLUBS[clubIndex].name,lie:surface(hole,ball.x,ball.z),yardsToPin:Math.round(Math.hypot(ball.x-hole.pin[0],ball.z-hole.pin[1])*YD),tokens:career.tokens,clubLevel:clubLevel(career,CLUBS[clubIndex].id)+1,clubTier:TIERS[clubLevel(career,CLUBS[clubIndex].id)].name,spin:{back:spinBack,shape:spinShape},homeOpen,rangeGuidePercent:courseIndex<3?Math.round(suggested*100):null,phase,moving:ball.moving,finished,roundScore:scoreText(totalScore())})});
  register({name:'configure_golf_shot',description:'Choose the selected club and aim offset from the pin, without swinging.',inputSchema:{type:'object',properties:{club:{type:'integer',minimum:1,maximum:14},aimOffsetDegrees:{type:'number',minimum:-180,maximum:180}},required:['club','aimOffsetDegrees'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!Number.isInteger(input.club)||input.club<1||input.club>14||!Number.isFinite(input.aimOffsetDegrees)||Math.abs(input.aimOffsetDegrees)>180)throw Error('Use a club from 1–14 and an aim offset from -180 to 180 degrees.');if(!ready())throw Error('Wait until the course is ready for a shot.');clubIndex=input.club-1;angle=Math.atan2(hole.pin[0]-ball.x,-(hole.pin[1]-ball.z))+input.aimOffsetDegrees*Math.PI/180;const d=Math.hypot(hole.pin[0]-ball.x,hole.pin[1]-ball.z);aimTarget=[ball.x+Math.sin(angle)*d,ball.z-Math.cos(angle)*d];updateSuggestion();drawMap();return {club:CLUBS[clubIndex].name,rangeGuidePercent:courseIndex<3?Math.round(suggested*100):null};}});
  window.addEventListener('pagehide',()=>life.abort(),{once:true});
}
