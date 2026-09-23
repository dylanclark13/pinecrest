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
export function addGolfer(m,club,phase,progress,power,time){
  const p=golferPose(club,phase,progress,power),skin=[.68,.44,.29],shirt=[.89,.91,.82],pants=[.12,.19,.24],shoes=[.87,.88,.80],cap=club.tier?club.finish:[.52,.16,.13],dark=[.09,.12,.13],steel=club.finish||[.68,.73,.74];
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
  sphere(body([-.88,1.774,0]),.13,.067,.122,cap,8,12);
  sphere(body([-.762,1.766,0]),.13,.013,.112,cap,5,10);
  m.box(body([-.753,1.793,0]),[.009,.035,.032],shirt);
  const shaftDir=p.head.map((v,i)=>v-p.grip[i]);const glove=p.grip,hand=p.grip.map((v,i)=>v+shaftDir[i]*.074);
  for(const side of[-1,1]){
    const shoulder=body([-.97,1.386,side*.23]),wrist=side===1?glove:hand;
    const elbow=mix(shoulder,wrist,.51);const trail=side===-1&&!p.putt?Math.min(1,Math.abs(p.theta)):0;elbow[0]-=.035+trail*.07;elbow[1]-=.045+trail*.10;elbow[2]+=side*(.055+trail*.11);
    const sleeve=mix(shoulder,elbow,.49);tube(shoulder,sleeve,.103,.093,shirt);tube(sleeve,elbow,.074,.056,skin);sphere(elbow,.057,.06,.058,skin);tube(elbow,wrist,.056,.039,skin);sphere(wrist,.053,.053,.043,side===1?shoes:skin,6,8);
  }
  const shaftColor=club.type==='wood'?[.12,.15,.17]:steel;
  m.tube(p.grip,p.head,.010,.006,shaftColor,8);m.tube(p.grip,mix(p.grip,p.head,.23),.017,.014,dark,8);
  // Distinct silhouettes: hollow wood, lofted iron, broad wedge, and mallet putter.
  const faceDir=[0,Math.sin(club.loft*Math.PI/180),Math.cos(club.loft*Math.PI/180)];
  const clubHead=new m.constructor();
  if(club.type==='wood'){
    clubHead.sphere(-.025,.025,-.025,club.label==='D'?.105:.083,.06,club.label==='D'?.115:.089,[.10,.13,.17],8,12);
    clubHead.box([0,.02,.079],[.15,.067,.015],steel);clubHead.box([0,.077,-.02],[.025,.007,.08],cap);
  }else if(club.type==='putter'){
    clubHead.box([0,.006,-.025],[.19,.041,.084],steel);clubHead.box([0,.03,-.029],[.012,.005,.056],shirt);
    clubHead.box([0,.006,.021],[.18,.031,.014],dark);
  }else{
    const broad=club.type==='wedge';clubHead.box([.027,.018,-.006],[broad?.155:.135,broad?.09:.065,.025],steel);
    for(let j=0;j<4;j++)clubHead.box([.031,-.004+j*.013,.009],[.10,.003,.002],dark);
    clubHead.sphere(.027,-.015,-.009,broad?.085:.07,.018,.027,steel,5,9);
  }
  const axis=[.857493,.514496,0];m.addTransformed(clubHead,q=>{const lofted=rotate(q,[1,0,0],-club.loft*Math.PI/180);const rotated=rotate(lofted,axis,p.theta);return rotated.map((v,i)=>v+p.head[i]);});
  // Clubhouse set colors carry through the polo trim and stand bag.
  m.box(body([-.781,1.24,-.105]),[.018,.105,.10],shirt.map(v=>v*.92));
  m.box(body([-.77,1.275,-.105]),[.02,.018,.10],steel);
  // A stand bag remains beside the player with visible spare clubs.
  const bag=[-2.25,0,-.45];m.ellipsoidBetween([bag[0],.13,bag[2]],[bag[0]+.14,.98,bag[2]],.16,.18,[.20,.29,.23],12);
  m.ellipsoidBetween([bag[0]+.14,.91,bag[2]],[bag[0]+.15,1.01,bag[2]],.17,.19,dark,12);
  m.box([bag[0]-.15,.5,bag[2]],[.10,.33,.20],cap);
  for(const side of[-1,1])m.tube([bag[0]+.07,.79,bag[2]+side*.1],[bag[0]+.45,.05,bag[2]+side*.27],.015,.012,steel,6);
  for(let i=0;i<5;i++){const a=[bag[0]+.08+(i%2)*.1,.9,bag[2]+(i-2)*.055],b=[a[0]-.08,1.13+(i%3)*.09,a[2]];m.tube(a,b,.007,.007,steel,5);m.box(b,[.07,.035,.027],steel);}
  return p;
}
