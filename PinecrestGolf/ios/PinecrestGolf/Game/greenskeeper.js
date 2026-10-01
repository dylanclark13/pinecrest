export const KEEPER_TOOLS=[
 {id:'fist',name:'Fist',verb:'Punch',points:10,cooldown:.45,caption:'Quick punch · 10 points'},
 {id:'hand',name:'Open hand',verb:'Slap',points:14,cooldown:.65,caption:'Sideways slap · 14 points'},
 {id:'rake',name:'Rake',verb:'Swing rake',points:12,cooldown:.55,caption:'Quick swings · 12 points'},
 {id:'mallet',name:'Rubber mallet',verb:'Bonk',points:25,cooldown:1.2,caption:'Big bounce · 25 points'},
 {id:'shovel',name:'Shovel',verb:'Swing shovel',points:18,cooldown:.85,caption:'Spinning reaction · 18 points'},
 {id:'hose',name:'Water hose',verb:'Spray',points:8,cooldown:.35,caption:'Splash attack · 8 points'},
 {id:'plunger',name:'Plunger',verb:'Plunge',points:22,cooldown:1.1,caption:'Suction surprise · 22 points'},
 {id:'broom',name:'Broom',verb:'Sweep',points:16,cooldown:.8,caption:'Chair swivel · 16 points'},
 {id:'glove',name:'Boxing glove',verb:'Box',points:28,cooldown:1.25,caption:'Big recoil · 28 points'},
 {id:'squeaky',name:'Squeaky hammer',verb:'Boop',points:20,cooldown:1,caption:'Hat pop · 20 points'}
];
const QUIPS={
 fist:['We have a complaints box!','That is not a handshake.','I preferred the paperwork.'],
 hand:['My hat felt that.','Five fingers. One complaint.','Was that your formal greeting?'],
 rake:['The leaves are OUTSIDE.','This meeting has too many points.','I said rake the bunker!'],
 mallet:['I am not a tent peg.','Who ordered the percussion section?','That is going in the incident log.'],
 shovel:['Digging yourself a penalty there.','Wrong kind of groundbreaking.','Please stop landscaping my office.'],
 hose:['The plants! Water the PLANTS!','Indoor plumbing was a mistake.','This shirt was dry-clean only.'],
 plunger:['I am not the blocked drain!','That is not a thinking cap.','This meeting has really sucked.'],
 broom:['I said sweep the floor!','Why is my office rotating?','Excellent. Now I am the dust.'],
 glove:['I thought this was a GOLF club.','That is a very aggressive fist bump.','I demand a smaller opponent.'],
 squeaky:['My dignity made that noise.','That was my last serious meeting.','Even my hat wants to leave.']
};
const MISS_QUIPS=['You missed. I am adding a stroke.','The air would like to file a complaint.','Nice practice swing. Very threatening.'];
const DIFFICULTIES={
 casual:{name:'Casual',speed:2.5,window:.28,perfect:.09,description:'Slower marker · wider hit zone'},
 standard:{name:'Standard',speed:3.4,window:.20,perfect:.065,description:'Balanced timing · build a streak'},
 expert:{name:'Expert',speed:4.8,window:.13,perfect:.035,description:'Fast marker · precision required'}
};
// Session scores remain separate from golf careers, scores, and tokens.
export class GreenskeeperGame{
 constructor(){this.difficulty='standard';this.bests={casual:0,standard:0,expert:0};this.tool=0;this.running=false;this.time=30;this.clock=0;this.cooldown=0;this.score=0;this.hits=0;this.attempts=0;this.perfects=0;this.combo=0;this.maxCombo=0;this.effect=2;this.effectTool='fist';this.quality='idle';this.closeView=false;this.quip='';this.toolUses={};this.variant=0;this.message='Choose your difficulty and tool, then start a 30 second round.';}
 get spokenLine(){return this.effect>=.32&&this.effect<2.8?this.quip:'Please keep all complaints in writing.';}
 get settings(){return DIFFICULTIES[this.difficulty];}
 get best(){return this.bests[this.difficulty];}
 get accuracy(){return this.attempts?Math.round(this.hits/this.attempts*100):0;}
 setDifficulty(value){if(this.running||!DIFFICULTIES[value])return false;this.difficulty=value;this.score=0;this.hits=0;this.attempts=0;this.perfects=0;this.combo=0;this.maxCombo=0;this.time=30;this.message=this.settings.description;return true;}
 start(){this.running=true;this.time=30;this.clock=0;this.cooldown=0;this.score=0;this.hits=0;this.attempts=0;this.perfects=0;this.combo=0;this.maxCombo=0;this.effect=2;this.effectTool=KEEPER_TOOLS[this.tool].id;this.quality='idle';this.message='Hit inside the green. Center hits build your multiplier; outside the zone misses.';}
 get marker(){return .5+.5*Math.sin(this.clock*this.settings.speed);}
 strike(){
 if(!this.running||this.cooldown>0)return false;
 const tool=KEEPER_TOOLS[this.tool],distance=Math.abs(this.marker-.5),perfect=distance<=this.settings.perfect,hit=distance<=this.settings.window;
 this.attempts++;this.quality=perfect?'perfect':hit?'solid':'miss';this.combo=perfect?Math.min(5,this.combo+1):0;this.maxCombo=Math.max(this.maxCombo,this.combo);
 const points=hit?tool.points*(1+this.combo):0;this.score+=points;this.bests[this.difficulty]=Math.max(this.best,this.score);if(hit)this.hits++;if(perfect)this.perfects++;
 this.variant=this.toolUses[tool.id]||0;this.toolUses[tool.id]=this.variant+1;
 this.quip=hit?QUIPS[tool.id][this.variant%QUIPS[tool.id].length]:MISS_QUIPS[(this.attempts-1)%MISS_QUIPS.length];
 // Perfect hits get enough recovery time to finish their full comic payoff.
 this.cooldown=Math.max(perfect?1.65:.6,tool.cooldown);this.effect=0;this.effectTool=tool.id;
 this.message=hit?(perfect?'Perfect timing':'Solid hit')+' · +'+points+(this.combo?' · '+(1+this.combo)+'× combo':''):'Miss · Aim for the green zone';return true;
 }
 update(dt){
 dt=Number.isFinite(dt)?Math.max(0,dt):0;this.effect+=dt;if(!this.running)return;
 this.clock+=dt;this.time=Math.max(0,this.time-dt);this.cooldown=Math.max(0,this.cooldown-dt);
 if(this.time===0){this.running=false;const rank=this.attempts===0?'No shots taken':this.accuracy>=90&&this.perfects>=5?'Precision master':this.accuracy>=70?'Sharp shooter':'Keep practicing';this.message=rank+' · '+this.score+' points · '+this.accuracy+'% accuracy · '+this.perfects+' perfect hits · Best combo '+(1+this.maxCombo)+'×';}
 }
}
