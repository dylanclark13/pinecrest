export const YD = 1.0936133;
export const BALL_RADIUS = .042;
export const CUP_RADIUS = .095;
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export const CLUBS = [
 {id:'driver',name:'Driver',label:'D',range:250,loft:15,length:1.16,type:'wood'},
 {id:'3wood',name:'3 Wood',label:'3W',range:215,loft:20,length:1.1,type:'wood'},
 {id:'5wood',name:'5 Wood',label:'5W',range:200,loft:23,length:1.07,type:'wood'},
 {id:'hybrid',name:'4 Hybrid',label:'4H',range:187,loft:26,length:1.02,type:'wood'},
 {id:'5iron',name:'5 Iron',label:'5I',range:175,loft:29,length:1,type:'iron'},
 {id:'6iron',name:'6 Iron',label:'6I',range:160,loft:32,length:0.98,type:'iron'},
 {id:'7iron',name:'7 Iron',label:'7I',range:145,loft:36,length:0.96,type:'iron'},
 {id:'8iron',name:'8 Iron',label:'8I',range:130,loft:40,length:0.94,type:'iron'},
 {id:'9iron',name:'9 Iron',label:'9I',range:115,loft:43,length:0.92,type:'iron'},
 {id:'pw',name:'Pitching wedge',label:'PW',range:85,loft:49,length:0.9,type:'wedge'},
 {id:'gw',name:'Gap wedge',label:'GW',range:68,loft:52,length:0.89,type:'wedge'},
 {id:'sw',name:'Sand wedge',label:'SW',range:50,loft:56,length:0.88,type:'wedge'},
 {id:'lw',name:'Lob wedge',label:'LW',range:35,loft:60,length:0.87,type:'wedge'},
 {id:'putter',name:'Putter',label:'P',range:30,loft:0,length:0.86,type:'putter'},
];
export const PUTTER_INDEX=CLUBS.findIndex(c=>c.type==='putter');
export const HOLES = [
  {name:'The Opening',par:4,pin:[20,-313],path:[[0,0],[0,-80],[17,-155],[-14,-230],[20,-313]],width:19,wind:[2.6,.9],sand:[[-4,-294,12,17],[39,-325,11,16],[30,-203,10,20]],water:[],seed:11,elevation:3,greenRadius:14,slope:[.012,.009],tip:'The left side of the fairway opens up the green.'},
  {name:'Across the Blue',par:3,pin:[-20,-158],path:[[0,0],[-3,-42],[-20,-158]],width:18,wind:[3.1,-1.2],sand:[[-42,-159,11,16],[1,-170,10,12]],water:[[1,-90,62,28]],seed:25,elevation:5,greenRadius:13,slope:[-.018,.012],tip:'Carry the lake. The uphill approach needs extra club.'},
  {name:'The Long Way',par:5,pin:[-20,-449],path:[[0,0],[16,-95],[45,-210],[20,-340],[-20,-449]],width:20,wind:[-3.5,1.7],sand:[[27,-221,13,23],[-41,-431,12,18],[1,-464,11,16]],water:[[-51,-303,32,56]],seed:38,elevation:7,greenRadius:14,slope:[.016,-.014],tip:'A three-shot route keeps the lake out of play.'},
  {name:'Pine Needle',par:4,pin:[-48,-295],path:[[0,0],[-4,-80],[-40,-170],[-48,-295]],width:15,wind:[2.3,2.8],sand:[[-19,-191,13,22],[-28,-294,11,18],[-66,-311,11,14]],water:[],seed:52,elevation:-4,greenRadius:12,slope:[-.015,.017],tip:'Favor accuracy over distance through the narrow pines.'},
  {name:'Stillwater',par:3,pin:[15,-184],path:[[0,0],[-10,-56],[5,-126],[15,-184]],width:17,wind:[-3.2,-2.1],sand:[[-7,-196,11,14]],water:[[46,-153,22,45]],seed:74,elevation:-6,greenRadius:12,slope:[.02,.008],tip:'The downhill shot releases toward the water on the right.'},
  {name:'South Meadow',par:5,pin:[35,-440],path:[[0,0],[-13,-90],[-25,-211],[20,-332],[35,-440]],width:21,wind:[1.7,-4.2],sand:[[-45,-230,14,24],[54,-422,12,19],[12,-455,11,16]],water:[[48,-255,26,43]],seed:91,elevation:4,greenRadius:14,slope:[-.012,-.018],tip:'A helping wind adds carry. Leave room for the bounce.'},
  {name:'Ridgeway',par:4,pin:[48,-353],path:[[0,0],[8,-95],[45,-202],[48,-353]],width:17,wind:[-4.8,.8],sand:[[26,-217,12,24],[68,-349,10,19],[28,-370,12,15]],water:[],seed:104,elevation:14,greenRadius:13,slope:[.018,-.015],tip:'An elevated green and crosswind reward a committed approach.'},
  {name:'Crooked Creek',par:4,pin:[-40,-363],path:[[0,0],[22,-105],[-18,-235],[-40,-363]],width:18,wind:[2.9,2.7],sand:[[40,-147,13,22],[-62,-353,12,19],[-20,-380,11,13]],water:[[-20,-192,55,19],[57,-287,21,45]],seed:119,elevation:2,greenRadius:13,slope:[-.019,-.01],tip:'Lay up short of the creek or commit to carrying it.'},
  {name:'The Turn',par:4,pin:[12,-330],path:[[0,0],[-24,-100],[-16,-226],[12,-330]],width:19,wind:[-2.3,3.8],sand:[[-37,-239,13,21],[34,-319,11,18],[-9,-343,12,17]],water:[[62,-176,23,45]],seed:132,elevation:6,greenRadius:14,slope:[.014,.022],tip:'Keep the approach below the pin on this fast green.'},
  {name:'Highlands',par:4,pin:[-32,-390],path:[[0,0],[12,-103],[-8,-246],[-32,-390]],width:18,wind:[4.6,2.2],sand:[[16,-251,13,24],[-52,-377,11,21],[-11,-407,12,14]],water:[],seed:146,elevation:17,greenRadius:13,slope:[-.017,.016],tip:'Play for the climb. A low shot loses distance into the hillside.'},
  {name:'Devil’s Bowl',par:3,pin:[30,-180],path:[[0,0],[8,-68],[30,-180]],width:16,wind:[-4.1,-2.5],sand:[[6,-177,12,20],[52,-177,12,21],[29,-202,17,10]],water:[],seed:159,elevation:-12,greenRadius:12,slope:[.022,-.016],tip:'A ring of deep bunkers guards a small, sloping green.'},
  {name:'Serpent’s Run',par:5,pin:[-30,-493],path:[[0,0],[-22,-111],[31,-243],[19,-365],[-30,-493]],width:18,wind:[3.8,3.2],sand:[[-45,-154,13,24],[10,-265,12,20],[-54,-481,12,21],[-7,-504,11,16]],water:[[59,-337,24,47],[-59,-343,25,45]],seed:173,elevation:10,greenRadius:14,slope:[-.021,.008],tip:'Two doglegs make positioning more valuable than raw power.'},
  {name:'The Quarry',par:4,pin:[49,-353],path:[[0,0],[27,-102],[4,-227],[49,-353]],width:17,wind:[-3.9,1.7],sand:[[26,-344,13,21],[64,-373,14,14],[23,-242,11,23]],water:[[-42,-228,34,53]],seed:186,elevation:-2,greenRadius:12,slope:[.019,.019],tip:'The second shot must clear the bunker on the inside corner.'},
  {name:'Split Decision',par:4,pin:[-10,-370],path:[[0,0],[-24,-112],[-31,-245],[-10,-370]],width:18,wind:[4.4,-2.2],sand:[[-9,-176,18,29],[-33,-364,12,20],[10,-385,11,16]],water:[[45,-216,27,62]],seed:198,elevation:5,greenRadius:13,slope:[-.018,-.017],tip:'Take the safe left route past the center bunker.'},
  {name:'Island Green',par:3,pin:[7,-151],path:[[0,0],[0,-35],[7,-151]],width:15,wind:[-4.4,2.2],sand:[[23,-157,5,9]],water:[[7,-132,48,54]],island:true,seed:213,elevation:1,greenRadius:12,slope:[.02,-.01],tip:'Carry is everything. The island leaves little room for error.'},
  {name:'North Wind',par:5,pin:[-21,-501],path:[[0,0],[18,-116],[34,-255],[-12,-383],[-21,-501]],width:19,wind:[-1.3,6.2],sand:[[13,-274,14,24],[-46,-487,13,21],[1,-514,11,17]],water:[[-52,-333,27,50]],seed:227,elevation:8,greenRadius:13,slope:[-.019,.016],tip:'The strongest headwind on the course. Build a three-shot plan.'},
  {name:'Needle’s Eye',par:4,pin:[-53,-326],path:[[0,0],[-9,-101],[-52,-206],[-53,-326]],width:14,wind:[3.3,3.6],sand:[[-33,-192,13,23],[-72,-323,10,18],[-33,-342,10,14]],water:[[27,-242,29,44]],seed:241,elevation:11,greenRadius:11.5,slope:[.022,.014],tip:'A tight landing area and raised green demand a clean strike.'},
  {name:'Pinecrest Signature',par:4,pin:[22,-408],path:[[0,0],[-13,-116],[2,-243],[22,-408]],width:17,wind:[-4.3,-3.2],sand:[[-21,-264,13,24],[44,-394,12,20],[1,-422,12,16]],water:[[21,-332,43,26]],seed:259,elevation:4,greenRadius:13,slope:[-.019,.02],tip:'One final lake to carry. Finish on the correct tier of the green.'}
];
export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function lineDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;const t=den?clamp(((x-a[0])*dx+(z-a[1])*dz)/den,0,1):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function fairDistance(h,x,z){let d=Infinity;const path=h.centerline||h.path;for(let i=1;i<path.length;i++)d=Math.min(d,lineDistance(x,z,path[i-1],path[i]));return d;}
export function ellipse(x,z,e,extra=0){return ((x-e[0])/(e[2]+extra))**2+((z-e[1])/(e[3]+extra))**2;}
export function inWater(h,x,z){return h.water.some(e=>ellipse(x,z,e)<1)&&!(h.island&&Math.hypot(x-h.pin[0],z-h.pin[1])<h.greenRadius+5);}
export function fairwayWidth(h,z){return h.width*(1+.105*Math.sin(z*.028+h.seed*.12)+.045*Math.sin(z*.071));}
export function surface(h,x,z){
  if(Math.abs(x)>113||z>43||z<h.pin[1]-62)return 'out';
  if(Math.abs(x)<4&&Math.abs(z)<6)return 'tee';
  if(inWater(h,x,z))return 'water';
  if(h.sand.some(e=>ellipse(x,z,e)<1))return 'sand';
  const g=Math.hypot(x-h.pin[0],z-h.pin[1]);
  if(g<(h.greenRadius||14))return 'green';
  if(g<(h.greenRadius||14)+2)return 'fringe';
  if(fairDistance(h,x,z)<fairwayWidth(h,z))return 'fairway';
  return 'rough';
}
function rawHeight(h,x,z){const t=clamp(-z/Math.abs(h.pin[1]),0,1.2);return (h.elevation||0)*t+1.8*Math.sin(z*.026+h.seed*.016)+1.15*Math.sin(x*.045+z*.013+h.seed*.031)+.6*Math.cos(z*.067+x*.023);}
export function waterLevel(h,w){return rawHeight(h,w[0],w[1])-.45;}
export function height(h,x,z){
  const base=rawHeight(h,x,z),g=Math.hypot(x-h.pin[0],z-h.pin[1]),r=h.greenRadius||14,gy=rawHeight(h,...h.pin),s=h.slope||[.012,.008];
  const dx=x-h.pin[0],dz=z-h.pin[1],green=gy+dx*s[0]+dz*s[1]+(h.contour??.10)*(Math.sin(dx*.23)+Math.sin(dz*.2));
  const blend=clamp((g-r)/8,0,1);let y=green*(1-blend)+base*blend;
  const tee=clamp((Math.hypot(x,z)-5)/9,0,1);y=y*tee+.6*(1-tee);
  for(const w of h.water){const e=ellipse(x,z,w);if(e<1.12&&!(h.island&&g<r+5)){const level=waterLevel(h,w);const blend=clamp((1.12-e)/.12,0,1);y=y*(1-blend)+(level-.12-.6*Math.max(0,1-e))*blend;}}
  for(const s of h.sand){const e=ellipse(x,z,s);if(e<1)y-=.6*(1-e);}
  return y;
}
export function greenGradient(h,x,z){return [(height(h,x+.1,z)-height(h,x-.1,z))/.2,(height(h,x,z+.1)-height(h,x,z-.1))/.2];}
export function makeBall(h,x=0,z=0){return {x,z,y:height(h,x,z)+BALL_RADIUS,vx:0,vy:0,vz:0,moving:false,airborne:false,holed:false,time:0,spin:0};}
export function lieFactor(lie,club,h){return lie==='sand'?(club.loft>=49?.79:.42):lie==='rough'?(h?.roughFactor??.68):lie==='fringe'?.95:1;}
export function effectiveWind(h,time=0){const gust=h.gust===0?1:1+.23*Math.sin(time*1.6+h.seed)+.12*Math.sin(time*3.1);return h.wind.map(v=>v*gust);}
export function launch(b,h,club,power,angle,accuracy=0,shotSpin={}){
  const p=clamp(power,.008,1),lie=surface(h,b.x,b.z),factor=lieFactor(lie,club,h),err=clamp(accuracy,-1,1);
  const back=club.loft?clamp(Number(shotSpin.back)||0,-1,1)*(club.spinControl??1)*Math.min(1,factor):0,shape=club.loft?clamp(Number(shotSpin.shape)||0,-1,1)*(club.spinControl??1)*Math.min(1,factor):0;const dist=club.range/YD*p*factor*(1-Math.abs(err)*.14),a=angle+err*(club.loft?(.06+p*.065):.028);b.backSpin=back;b.shotShape=shape;b.landed=false;
  if(!club.loft){const v=Math.sqrt(2*(h.greenFriction??.52)*dist);b.vx=Math.sin(a)*v;b.vz=-Math.cos(a)*v;b.vy=0;b.airborne=false;}
  else {const loft=(club.loft+back*3)*Math.PI/180,speed=Math.sqrt(dist*9.81/Math.sin(2*loft))*(1+dist*.0007);b.vx=Math.sin(a)*Math.cos(loft)*speed;b.vz=-Math.cos(a)*Math.cos(loft)*speed;b.vy=Math.sin(loft)*speed;b.airborne=true;}
  b.spin=club.loft?err*.10+shape*.037:0;b.loft=club.loft;b.moving=true;b.time=0;
}
export function stepBall(b,h,dt){
  if(!b.moving)return null;b.time+=dt;const oldX=b.x,oldZ=b.z;let event=null;
  if(b.airborne){
    const wind=effectiveWind(h,b.time),rx=b.vx-wind[0],rz=b.vz-wind[1],sp=Math.hypot(rx,rz,b.vy),vx=b.vx;
    b.vx-=rx*sp*.0018*dt;b.vz-=rz*sp*.0018*dt;b.vx+=-b.vz*b.spin*dt;b.vz+=vx*b.spin*dt;b.spin*=Math.exp(-dt*.28);
    b.vy-=(9.81+b.vy*sp*.0018)*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;
    const g=height(h,b.x,b.z)+BALL_RADIUS;
    if(b.y<=g){b.y=g;const lie=surface(h,b.x,b.z);if(lie==='water'||lie==='out'){b.moving=false;return lie;}
      const back=b.backSpin||0,bounce=(lie==='sand'?.065:lie==='rough'?.10:.23)*(1-Math.max(0,back)*.35);b.vy=-b.vy*bounce;const speed=Math.hypot(b.vx,b.vz)||1,dx=b.vx/speed,dz=b.vz/speed;const retention=(lie==='sand'?.25:lie==='rough'?.30:Math.max(.25,.46-(b.loft||0)*.003))*(1-back*.60);b.vx*=retention;b.vz*=retention;if(!b.landed&&b.loft>=36&&back>.5&&(lie==='green'||lie==='fairway')){const check=back*(lie==='green'?3.3:1.3);b.vx-=dx*check;b.vz-=dz*check;}b.backSpin=back*.2;b.landed=true;if(b.vy<.8){b.vy=0;b.airborne=false;}event='bounce';}
  } else {
    const lie=surface(h,b.x,b.z);if(lie==='water'||lie==='out'){b.moving=false;return lie;}
    const friction=lie==='green'?(h.greenFriction??.52):lie==='fringe'?.95:lie==='rough'?3.2:lie==='sand'?5:1.35;
    const [gx,gz]=greenGradient(h,b.x,b.z);b.vx-=gx*9.81*dt;b.vz-=gz*9.81*dt;
    const sp=Math.hypot(b.vx,b.vz),v=Math.max(0,sp-friction*dt);if(sp>0){b.vx*=v/sp;b.vz*=v/sp;}
    b.x+=b.vx*dt;b.z+=b.vz*dt;b.y=height(h,b.x,b.z)+BALL_RADIUS;
    const cupDist=lineDistance(h.pin[0],h.pin[1],[oldX,oldZ],[b.x,b.z]);
    if(cupDist<CUP_RADIUS&&sp<1.85){b.x=h.pin[0];b.z=h.pin[1];b.y=height(h,b.x,b.z)-.13;b.vx=b.vy=b.vz=0;b.moving=false;b.holed=true;return 'cup';}
    if(v<.035){b.vx=b.vy=b.vz=0;b.moving=false;return 'rest';}
  }
  if(b.time>40){b.y=height(h,b.x,b.z)+BALL_RADIUS;b.vx=b.vy=b.vz=0;b.moving=false;const lie=surface(h,b.x,b.z);return lie==='water'||lie==='out'?lie:'rest';}
  return event;
}
export function recommendedClub(h,b){const d=Math.hypot(b.x-h.pin[0],b.z-h.pin[1])*YD,lie=surface(h,b.x,b.z);if(lie==='green'||lie==='fringe'&&d<15)return PUTTER_INDEX;if(lie==='sand')return CLUBS.findIndex(c=>c.id==='sw');for(let i=PUTTER_INDEX-1;i>=0;i--)if(CLUBS[i].range*lieFactor(lie,CLUBS[i],h)>=d*.9)return i;return 0;}
