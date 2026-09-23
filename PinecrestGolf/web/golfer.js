import {lookColors} from './character.js';
import {clamp} from './physics.js';
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function rotate(p,axis,angle,pivot=[0,0,0]){const v=p.map((n,i)=>n-pivot[i]),c=Math.cos(angle),s=Math.sin(angle),dot=v.reduce((sum,n,i)=>sum+n*axis[i],0),cross=[axis[1]*v[2]-axis[2]*v[1],axis[2]*v[0]-axis[0]*v[2],axis[0]*v[1]-axis[1]*v[0]];return v.map((n,i)=>pivot[i]+n*c+cross[i]*s+axis[i]*dot*(1-c));}
export function golferPose(club,phase='address',progress=0,power=.7){
  const putt=club.type==='putter',back=(putt?.30:1.85)*(.38+.62*power);let theta=0;
  if(phase==='backswing')theta=back*clamp(progress,0,1);
  if(phase==='set')theta=back;
  if(phase==='downswing')theta=back*(1-clamp(progress,0,1)**2);
  if(phase==='follow')theta=-(putt?.28:1.95)*(1-(1-clamp(progress,0,1))**3)*(.5+.5*power);
  const axis=[.857493,.514496,0],pivot=[-.8,1.26,0],length=club.length;
  const head=rotate([0,.045,0],axis,theta,pivot);
  const grip=rotate([-.47,Math.sqrt(length*length-.47*.47)+.045,0],axis,theta,pivot);
  const t=clamp(progress,0,1),turn=theta*(putt?.08:.32),hipLead=!putt&&phase==='downswing'?.22*Math.sin(t*Math.PI):0,hipTurn=turn*.45-hipLead;
  const weight=putt?0:phase==='downswing'?.07*t*t:phase==='follow'?.07+.06*Math.sin(t*Math.PI/2):0;
  const body=p=>{const q=rotate(p,[0,1,0],turn,[-1,1.15,0]);q[2]+=weight;return q;};
  const hips=p=>{const q=rotate(p,[0,1,0],hipTurn,[-1.08,.86,0]);q[2]+=weight;return q;};
  return {head,grip,theta,turn,body,hips,putt,weight,follow:phase==='follow',progress};
}
// Rounded, lofted faces keep the silhouette continuous instead of using a front box.
export function addClubHead(m,club){
 const steel=[.68,.72,.74],face=[.79,.82,.83],dark=[.08,.10,.115],accent=club.finish||steel;
 const plate=(cx,cy,z,rx,ry,depth,col)=>{
  const count=24,point=(i,d)=>{const t=i/count*Math.PI*2;return [cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,d];};
  for(let i=0;i<count;i++){const a=point(i,z),b=point(i+1,z),c=point(i+1,z-depth),d=point(i,z-depth);m.tri([cx,cy,z],a,b,col);m.quad(a,d,c,b,steel);m.tri([cx,cy,z-depth],c,d,steel);}
 };
 if(club.type==='wood'){
  const driver=club.id==='driver',hybrid=club.id==='hybrid',w=driver?.104:hybrid?.073:.085,d=driver?.107:hybrid?.064:.086;
  m.sphere(.015,.028,-.028,w,.052,d,dark,12,20);
  m.sphere(.015,-.003,-.028,w*.94,.017,d*.93,steel,6,16);
  plate(.015,.027,d*.63,w*.86,.038,.006,face);
  for(let j=-2;j<=2;j++)m.tube([-.045,.027+j*.01,d*.63+.001],[.07,.027+j*.01,d*.63+.001],.0009,.0009,dark,4);
  m.tube([.015,.079,-.037],[.015,.079,-.009],.0016,.0016,[.86,.88,.87],5);
  m.tube([-.067,.027,-.011],[-.052,.088,-.022],.009,.007,steel,10);
  m.tube([-.05,.09,-.022],[-.048,.105,-.023],.008,.007,dark,8);
 }else if(club.type==='putter'){
  plate(.028,.018,.037,.10,.025,.052,steel);
  plate(.028,.018,.038,.078,.014,.002,dark);
  for(const x of[-.052,.108])m.sphere(x,.012,-.037,.02,.021,.05,steel,6,10);
  m.tube([.028,.043,-.05],[.028,.043,.018],.002,.002,[.93,.94,.93],6);
  m.tube([-.043,.025,-.006],[-.025,.088,-.018],.007,.006,steel,8);
 }else{
  const wedge=club.type==='wedge',w=wedge?.079:.072,h=wedge?.047:.035;
  plate(.035,.018,.011,w,h,.014,face);
  m.sphere(.037,.018-h*.77,-.008,w*.94,.014,.021,steel,6,16);
  // Cavity perimeter and small finish accent stay behind the striking face.
  m.tube([-.017,.032,-.008],[.077,.038,-.008],.006,.006,steel,8);
  m.tube([.009,.006,-.018],[.063,.009,-.018],.003,.003,accent,6);
  for(let j=0;j<(wedge?7:5);j++){const y=.018-h*.62+j*(h*1.24/(wedge?6:4));const half=w*Math.sqrt(1-((y-.018)/h)**2)*.78;m.tube([.035-half,y,.012],[.035+half,y,.012],.00085,.00085,dark,4);}
  m.tube([-.029,.004,-.003],[-.047,.078,-.017],.009,.007,steel,10);
  m.tube([-.047,.078,-.017],[-.05,.098,-.02],.008,.007,dark,8);
 }
}
export function addGolfer(m,club,phase,progress,power,time,appearance={}){
  const colors=lookColors(appearance),p=golferPose(club,phase,progress,power),skin=colors.skin,shirt=colors.shirt,pants=colors.pants,shoes=[.87,.88,.80],cap=colors.cap,dark=[.09,.12,.13],steel=club.finish||[.68,.73,.74];
  const sphere=(pos,rx,ry,rz,col,rows=7,cols=10)=>m.sphere(...pos,rx,ry,rz,col,rows,cols);
  const tube=(a,b,r1,r2,col)=>m.tube(a,b,r1,r2,col,9);
  const body=p.body;
  // Weight shift, planted lead foot, and a lifting heel in the follow-through.
  const shift=p.weight;
  for(const side of[-1,1]){
    const hip=p.hips([-1.09,.87,side*.15]),knee=[-1.0,.49,side*.23+shift],ankle=[-1.18,.13,side*.29];
    if(side===-1&&p.follow&&!p.putt)ankle[1]+=.08*clamp(progress,0,1);
    tube(hip,knee,.105,.083,pants);tube(knee,ankle,.083,.063,pants);sphere(knee,.084,.09,.086,pants);
    sphere([ankle[0]+.085,ankle[1]-.055,ankle[2]],.19,.075,.102,shoes);m.box([ankle[0]+.09,ankle[1]-.103,ankle[2]],[.33,.035,.17],dark);
    m.box([ankle[0]+.08,ankle[1]+.008,ankle[2]],[.09,.015,.12],dark);
  }
  // A tailored polo, collar, belt, and articulated shoulders.
  m.ellipsoidBetween(p.hips([-1.09,.86,0]),body([-.97,1.4,0]),.19,.255,shirt,12);
  m.ellipsoidBetween(p.hips([-1.09,.865,0]),p.hips([-1.08,.905,0]),.196,.21,dark,12);
  m.box(p.hips([-.885,.89,0]),[.035,.042,.06],steel);
  tube(body([-.96,1.42,0]),body([-.89,1.56,0]),.075,.071,skin);
  sphere(body([-.94,1.47,0]),.115,.037,.105,shirt);
  const head=body([-.87,1.665,0]);sphere(head,.115,.155,.108,skin,10,14);
  sphere(body([-.748,1.655,0]),.035,.034,.027,skin,5,7);
  for(const z of[-.105,.105])sphere(body([-.876,1.661,z]),.026,.042,.018,skin,5,7);
  for(const z of[-.043,.043])sphere(body([-.762,1.69,z]),.006,.009,.009,dark,4,5);
  if(colors.hat){sphere(body([-.88,1.774,0]),.13,.067,.122,cap,8,12);
  sphere(body([-.762,1.766,0]),.13,.013,.112,cap,5,10);
  m.box(body([-.753,1.793,0]),[.009,.035,.032],shirt);}
  const shaftDir=p.head.map((v,i)=>v-p.grip[i]);const glove=p.grip,hand=p.grip.map((v,i)=>v+shaftDir[i]*.074);
  for(const side of[-1,1]){
    const shoulder=body([-.97,1.386,side*.23]),wrist=side===1?glove:hand;
    const elbow=mix(shoulder,wrist,.51);const trail=side===-1&&!p.putt?Math.min(1,Math.abs(p.theta)):0;elbow[0]-=.035+trail*.07;elbow[1]-=.045+trail*.10;elbow[2]+=side*(.055+trail*.11);
    const sleeve=mix(shoulder,elbow,.49);tube(shoulder,sleeve,.103,.093,shirt);tube(sleeve,elbow,.074,.056,skin);sphere(elbow,.057,.06,.058,skin);tube(elbow,wrist,.056,.039,skin);sphere(wrist,.053,.053,.043,side===1?shoes:skin,6,8);
  }
  const shaftColor=club.type==='wood'?[.15,.17,.18]:[.66,.70,.72];
  m.tube(p.grip,p.head,.0065,.004,shaftColor,10);
  m.tube(p.grip,mix(p.grip,p.head,.23),.013,.0105,dark,10);
  for(let j=1;j<12;j++){const t=j*.018;m.tube(mix(p.grip,p.head,t),mix(p.grip,p.head,t+.0025),.0132-j*.00016,.0132-j*.00016,[.22,.24,.24],8);}
  m.tube(mix(p.grip,p.head,.235),mix(p.grip,p.head,.245),.010,.009,steel,8);
  if(club.type!=='wood')for(let j=0;j<5;j++){const t=.36+j*.10;m.tube(mix(p.grip,p.head,t),mix(p.grip,p.head,t+.004),.006,.0058,[.82,.85,.86],8);}
  const clubHead=new m.constructor();addClubHead(clubHead,club);
  const axis=[.857493,.514496,0];m.addTransformed(clubHead,q=>{const lofted=rotate(q,[1,0,0],-club.loft*Math.PI/180);const rotated=rotate(lofted,axis,p.theta);return rotated.map((v,i)=>v+p.head[i]);});
  // Clubhouse set colors carry through the polo trim and stand bag.
  m.box(body([-.781,1.24,-.105]),[.018,.105,.10],shirt.map(v=>v*.92));
  m.box(body([-.77,1.275,-.105]),[.02,.018,.10],steel);
  // A stand bag remains beside the player with visible spare clubs.
  const bag=[-2.25,0,-.45];m.ellipsoidBetween([bag[0],.13,bag[2]],[bag[0]+.14,.98,bag[2]],.16,.18,[.20,.29,.23],12);
  m.ellipsoidBetween([bag[0]+.14,.91,bag[2]],[bag[0]+.15,1.01,bag[2]],.17,.19,dark,12);
  // Keep the bag front clear of the former colored rectangular pocket.
  for(const side of[-1,1])m.tube([bag[0]+.07,.79,bag[2]+side*.1],[bag[0]+.45,.05,bag[2]+side*.27],.015,.012,steel,6);
  for(let i=0;i<5;i++){const a=[bag[0]+.08+(i%2)*.1,.9,bag[2]+(i-2)*.055],b=[a[0]-.08,1.13+(i%3)*.09,a[2]];m.tube(a,b,.005,.004,[.65,.69,.71],8);const spare=new m.constructor();addClubHead(spare,{type:i===0?'wood':'iron',id:i===0?'3wood':'7iron',finish:steel});m.addTransformed(spare,q=>[b[0]+q[0]*.8,b[1]-q[1]*.8,b[2]+q[2]*.8]);}
  return p;
}
