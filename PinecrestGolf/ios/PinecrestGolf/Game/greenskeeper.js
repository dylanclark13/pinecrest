export const KEEPER_TOOLS=[
 {id:'fist',name:'Fist',verb:'Punch',points:10,cooldown:.45,caption:'Quick punch · 10 points'},
 {id:'hand',name:'Open hand',verb:'Slap',points:14,cooldown:.65,caption:'Sideways slap · 14 points'},
 {id:'rake',name:'Rake',verb:'Swing rake',points:12,cooldown:.55,caption:'Quick swings · 12 points'},
 {id:'mallet',name:'Rubber mallet',verb:'Bonk',points:25,cooldown:1.2,caption:'Big bounce · 25 points'},
 {id:'shovel',name:'Shovel',verb:'Swing shovel',points:18,cooldown:.85,caption:'Spinning reaction · 18 points'},
 {id:'hose',name:'Water hose',verb:'Spray',points:8,cooldown:.35,caption:'Splash attack · 8 points'}
];
// This arcade state never reads or writes golf careers, scores, or tokens.
export class GreenskeeperGame{
 constructor(){this.best=0;this.tool=0;this.running=false;this.time=30;this.clock=0;this.cooldown=0;this.score=0;this.hits=0;this.combo=0;this.effect=2;this.effectTool='fist';this.message='Choose a tool, then start a 30 second round.';}
 start(){this.running=true;this.time=30;this.clock=0;this.cooldown=0;this.score=0;this.hits=0;this.combo=0;this.effect=2;this.message='Hit when the marker is in the green for a combo bonus.';}
 get marker(){return .5+.5*Math.sin(this.clock*3.4);}
 strike(){if(!this.running||this.cooldown>0)return false;const t=KEEPER_TOOLS[this.tool],perfect=Math.abs(this.marker-.5)<=.09;this.combo=perfect?Math.min(5,this.combo+1):0;const points=t.points*(1+this.combo);this.score+=points;this.best=Math.max(this.best,this.score);this.hits++;this.cooldown=t.cooldown;this.effect=0;this.effectTool=t.id;this.message=(perfect?'Perfect bonk!':'Got him!')+' +'+points+(this.combo?' · '+(1+this.combo)+'× combo':'');return true;}
 update(dt){this.effect+=dt;if(!this.running)return;this.clock+=dt;this.time=Math.max(0,this.time-dt);this.cooldown=Math.max(0,this.cooldown-dt);if(this.time===0){this.running=false;this.message='Round complete! '+this.score+' points from '+this.hits+' hits. The greenskeeper is back on his feet.';}}
}
