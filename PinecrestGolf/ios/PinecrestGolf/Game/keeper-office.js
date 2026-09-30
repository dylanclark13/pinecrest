// Dedicated office scene, in metres. The greenskeeper faces +Z toward the player.
const skin=[.73,.49,.32],wood=[.40,.25,.13],steel=[.62,.67,.69],rubber=[.075,.085,.09],shirt=[.15,.29,.21],tau=Math.PI*2;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function addOffice(m){
 m.box([0,-.08,0],[7,.16,7],[.37,.31,.23]);
 for(let x=-3.4;x<3.5;x+=.28)m.box([x,.004,0],[.007,.007,7],[.25,.21,.17]);
 m.box([0,1.7,-2.3],[7,3.4,.14],[.65,.69,.59]);m.box([-3.1,1.7,0],[.14,3.4,4.6],[.50,.57,.46]);
 m.box([0,.12,-2.2],[6.2,.24,.06],wood);m.box([-3,.12,0],[.06,.24,4.5],wood);
 // Window with sill, sky, distant fairway and timber mullions.
 m.box([-1.65,1.95,-2.20],[1.65,1.55,.07],wood);m.box([-1.65,1.95,-2.15],[1.47,1.37,.04],[.48,.72,.81]);
 m.box([-1.65,1.46,-2.11],[1.47,.36,.025],[.29,.48,.22]);
 for(const x of[-2.42,-1.65,-.88])m.box([x,1.95,-2.08],[.055,1.48,.06],[.84,.83,.72]);
 m.box([-1.65,1.94,-2.06],[1.58,.055,.07],[.84,.83,.72]);m.box([-1.65,1.19,-2],[1.8,.075,.3],wood);
 // Pinboard: maintenance sheets, colored pushpins and a course diagram.
 m.box([.70,2.05,-2.17],[1.55,1.1,.10],wood);m.box([.70,2.05,-2.10],[1.43,.98,.04],[.55,.40,.24]);
 for(let i=0;i<3;i++){const x=.22+i*.47;m.box([x,2.08,-2.06],[.36,.64,.02],[.89,.87,.74]);m.sphere(x,2.36,-2.03,.018,.018,.014,[.65,.18,.12],5,8);for(let j=0;j<6;j++)m.box([x,2.24-j*.065,-2.043],[.24,.012,.008],[.42,.45,.37]);}
 // Filing cabinet and folders.
 m.box([2, .67,-1.68],[.85,1.34,.60],[.31,.39,.35]);
 for(let j=0;j<3;j++){m.box([2,.26+j*.41,-1.365],[.78,.37,.03],[.37,.44,.39]);m.tube([1.90,.33+j*.41,-1.31],[2.10,.33+j*.41,-1.31],.02,.02,steel,10);m.box([2,.18+j*.41,-1.34],[.2,.07,.016],[.88,.88,.79]);}
 for(let i=0;i<5;i++)m.box([1.7+i*.12,1.51,-1.68],[.09,.34,.4],i%2?[.40,.29,.18]:[.28,.40,.27]);
 // Desk, drawers, wood grain and modest office clutter.
 m.box([0,.78,.52],[2.18,.10,.85],wood);m.box([0,.837,.52],[2.10,.014,.80],[.51,.34,.19]);
 for(let j=0;j<14;j++)m.tube([-1.03,.847,.15+j*.057],[1.03,.847,.15+j*.057],.002,.002,[.42,.28,.16],4);
 for(const x of[-.94,.94])for(const z of[.20,.82])m.box([x,.37,z],[.09,.74,.09],wood);
 m.box([.74,.57,.54],[.48,.30,.69],wood);m.box([.74,.57,.90],[.43,.24,.025],[.48,.31,.16]);m.tube([.65,.57,.925],[.83,.57,.925],.012,.012,steel,8);
 m.box([-.3,.856,.5],[.57,.013,.38],[.87,.86,.75]);for(let j=0;j<6;j++)m.box([-.3,.865,.38+j*.039],[.42,.003,.006],[.31,.34,.29]);
 m.tube([-.56,.875,.55],[-.25,.875,.63],.009,.009,[.12,.19,.16],8);
 m.cone(.64,.85,.31,.073,.13,[.79,.78,.65],16,.073);m.sphere(.64,.979,.31,.066,.003,.066,[.15,.095,.06],5,14);
 for(let i=0;i<14;i++){const a=i/14*tau,b=(i+1)/14*tau;m.tube([.72+Math.cos(a)*.035,.916+Math.sin(a)*.044,.31],[.72+Math.cos(b)*.035,.916+Math.sin(b)*.044,.31],.009,.009,[.79,.78,.65],6);}
 // Desk lamp and wall clock.
 m.sphere(-.83,.87,.25,.13,.025,.11,rubber,6,14);m.tube([-.83,.89,.25],[-.83,1.18,.20],.018,.018,steel,10);m.tube([-.83,1.18,.2],[-.65,1.30,.26],.018,.018,steel,10);m.cone(-.65,1.20,.26,.12,.12,[.17,.24,.20],14,.055);
 m.sphere(2.04,2.35,-2.13,.25,.25,.035,wood,12,24);m.sphere(2.04,2.35,-2.085,.219,.219,.012,[.88,.87,.77],12,24);
 for(let i=0;i<12;i++){const a=i/12*tau;m.sphere(2.04+Math.sin(a)*.185,2.35+Math.cos(a)*.185,-2.065,.008,.008,.008,rubber,4,6);}
 m.tube([2.04,2.35,-2.045],[2.04,2.49,-2.045],.008,.008,rubber,6);m.tube([2.04,2.35,-2.045],[2.14,2.30,-2.045],.009,.009,rubber,6);
}
export function keeperReaction(k){
 const t=k.elapsed-.16;
 if(k.reduced||t<=0||t>=1.45)return {amount:0,swivel:0,rock:0,hat:0};
 const amount=t<.14?Math.sin(t/.14*Math.PI/2):Math.pow(1-(t-.14)/1.31,2);
 const side=['hand','broom','shovel'].includes(k.tool),big=k.tool==='glove'||k.tool==='mallet';
 return {amount,swivel:side?amount*(k.tool==='broom'?1.4:.85):Math.sin(t*16)*amount*.13,rock:amount*(big?.28:.13),hat:amount*(k.tool==='squeaky'?.52:.23)};
}
export function addSeatedKeeper(scene,time,k){
 const m=new scene.constructor(),r=keeperReaction(k),reaction=r.amount,sway=reaction*(k.tool==='hand'?.28:.07),lean=reaction*(k.tool==='glove'?.32:.22);
 // Upholstered swivel chair, five feet and casters.
 m.tube([0,.12,-.40],[0,.48,-.40],.045,.045,steel,12);
 for(let i=0;i<5;i++){const a=i/5*tau,x=Math.cos(a)*.34,z=-.4+Math.sin(a)*.34;m.tube([0,.15,-.4],[x,.09,z],.027,.022,rubber,9);m.sphere(x,.055,z,.055,.05,.037,rubber,7,10);}
 m.box([0,.52,-.40],[.56,.11,.53],rubber);m.box([0,.96,-.67],[.53,.78,.10],[.13,.17,.15]);
 for(const side of[-1,1]){m.tube([side*.29,.54,-.49],[side*.29,.76,-.41],.025,.025,steel,9);m.box([side*.29,.78,-.28],[.07,.05,.34],rubber);}
 const body=new m.constructor();
 // Bent knees and planted boots make the seated posture explicit.
 for(const side of[-1,1]){const hip=[side*.14,.59,-.40],knee=[side*.18,.52,-.02],ankle=[side*.18,.14,.05];body.tube(hip,knee,.10,.085,[.29,.25,.18],14);body.sphere(...knee,.088,.082,.089,[.29,.25,.18],8,12);body.tube(knee,ankle,.079,.063,[.29,.25,.18],14);body.sphere(side*.18,.083,.14,.089,.075,.17,[.19,.14,.10],9,14);body.box([side*.18,.029,.14],[.17,.035,.30],rubber);}
 body.ellipsoidBetween([0,.58,-.40],[0,1.09,-.43],.22,.14,shirt,20);body.sphere(0,1.08,-.43,.23,.07,.15,shirt,10,16);
 body.tube([0,1.09,-.42],[0,1.20,-.42],.065,.06,skin,12);
 for(const s of[-1,1]){
 body.tube([s*.02,1.12,-.28],[s*.1,1.035,-.28],.023,.012,[.10,.21,.14],10);
 const elbow=[s*(.30+reaction*.15),.84+reaction*.24,-.22-reaction*.16],wrist=[s*(.25+reaction*(k.tool==='hose'?.02:.28)),.90+reaction*(.58+Math.sin(k.elapsed*20+s)*.10),.28-reaction*.53];
 body.tube([s*.20,1.055,-.42],elbow,.082,.065,shirt,14);body.sphere(...elbow,.066,.066,.066,shirt,8,12);body.tube(elbow,wrist,.052,.036,skin,14);body.sphere(...wrist,.056,.04,.07,skin,8,12);
 for(let i=0;i<4;i++){const x=wrist[0]+(i-1.5)*.022;body.tube([x,wrist[1],wrist[2]+.02],[x+(i-1.5)*reaction*.014,wrist[1]+reaction*.09,wrist[2]+.09],.009,.008,skin,7);}
 }
 body.box([.11,1.005,-.273],[.10,.075,.015],[.76,.75,.56]);for(let i=0;i<3;i++)body.sphere(0,1.01-i*.085,-.275,.008,.008,.008,[.79,.79,.70],4,6);
 const blink=!k.reduced&&Math.sin(time*.8)> .998;
 body.sphere(0,1.32,-.42,.113,.155,.104,skin,16,24);body.sphere(0,1.245,-.386,.09,.065,.079,skin,10,16);
 body.sphere(0,1.428,-.439,.117,.057,.10,[.28,.23,.18],10,18);
 for(const s of[-1,1]){body.sphere(s*.114,1.325,-.42,.023,.038,.017,skin,7,10);body.sphere(s*.043,1.345,-.320,.022,blink?.003:.009+reaction*.009,.008,[.86,.84,.73],6,10);body.sphere(s*.043,1.345,-.311,.007,blink?.002:.007,.003,[.14,.19,.15],6,8);body.tube([s*.025,1.372,-.318],[s*.065,1.377,-.32],.005,.005,[.28,.23,.18],7);}
 body.sphere(0,1.315,-.302,.020,.033,.027,skin,8,12);body.sphere(0,1.267,-.308,.030,.004+reaction*.025,.005,[.28,.14,.09],8,12);
 // Separate cap crown, visor, seams and badge.
 body.sphere(0,1.457+r.hat,-.43,.127,.057,.116,shirt,12,20);body.sphere(0,1.451+r.hat,-.308,.14,.012,.10,shirt,7,18);body.box([0,1.48+r.hat,-.324],[.05,.029,.01],[.80,.77,.52]);
 m.addTransformed(body,p=>[p[0]+sway*Math.max(0,p[1]-.55),p[1],p[2]-lean*Math.max(0,p[1]-.55)]);
 if(reaction>0)for(let i=0;i<8;i++){const a=i/8*tau+time*4;m.sphere(Math.cos(a)*(.24+reaction*.1),1.61+Math.sin(a)*.07,-.42+Math.sin(a)*.2,.027,.027,.027,k.tool==='hose'?[.42,.77,.89]:[.98,.82,.34],5,7);}
 // Chair and occupant recoil together, then recover to the seated pose.
 scene.addTransformed(m,p=>{const y=p[1]-.12,z=p[2]+.4,yy=y*Math.cos(r.rock)+z*Math.sin(r.rock),zz=-y*Math.sin(r.rock)+z*Math.cos(r.rock);return [p[0]*Math.cos(r.swivel)+zz*Math.sin(r.swivel),yy+.12+reaction*.07,-p[0]*Math.sin(r.swivel)+zz*Math.cos(r.swivel)-.4-reaction*.24];});
 if(reaction>0){
 // A few loose sheets flutter above the desk while the furniture stays put.
 for(let i=0;i<3;i++){const f=reaction,xx=-.30+(i-1)*f*.24,y=.87+f*(.22+i*.10),z=.52-f*.17;scene.quad([xx-.12,y,z-.09],[xx+.12,y+f*.04,z-.09],[xx+.12,y,z+.09],[xx-.12,y-f*.04,z+.09],[.87,.86,.75]);}
 }

}
function hand(m,open){
 // Anatomical palm, wrist, four articulated fingers and opposed thumb.
 m.tube([0,-.30,.04],[0,-.07,0],.066,.049,skin,16);m.sphere(0,.015,0,.085,.11,.035,skin,12,20);
 for(let i=0;i<4;i++){const x=(i-1.5)*.042,len=[.15,.18,.17,.13][i],a=[x,.078,0],b=open?[x*1.19,.078+len*.55,-.004]:[x,.12,-.055],c=open?[x*1.29,.078+len,-.007]:[x,.065,-.074];m.tube(a,b,.019,.017,skin,12);m.sphere(...b,.018,.020,.018,skin,8,12);m.tube(b,c,.017,.013,skin,12);m.sphere(...c,.013,.016,.013,skin,8,12);m.sphere(c[0],c[1]-.008,c[2]+.012,.010,.017,.003,[.79,.60,.45],5,8);}
 m.tube([.063,-.024,0],[.106,.027,-.02],.023,.020,skin,12);m.tube([.106,.027,-.02],open?[.139,.067,-.025]:[.025,.055,-.103],.020,.016,skin,12);
}
export function addKeeperTool(m,time,k){
 const tool=new m.constructor(),t=k.elapsed;
 // A brief windup, contact at 0.18 seconds, and a slower return.
 const attack=t<.18?Math.sin(t/.18*Math.PI/2):t<.60?Math.cos((t-.18)/.42*Math.PI/2):0,a=k.reduced?0:attack;
 if(k.tool==='fist'||k.tool==='hand')hand(tool,k.tool==='hand');
 else if(k.tool==='glove'){
 tool.tube([0,-.32,.04],[0,-.06,0],.065,.061,skin,16);tool.tube([0,-.11,0],[0,-.01,0],.083,.082,[.30,.055,.04],18);
 tool.sphere(0,.065,-.025,.115,.14,.11,[.66,.10,.07],16,24);tool.sphere(.10,.02,-.01,.041,.073,.055,[.58,.07,.045],10,16);
 tool.tube([-.075,-.062,.074],[.075,-.062,.074],.008,.008,[.86,.81,.66],10);for(let j=0;j<4;j++)tool.tube([-.023,-.09+j*.021,.084],[.023,-.08+j*.021,.084],.003,.003,[.88,.85,.73],7);
 }
 else if(k.tool==='hose'){
 tool.tube([0,-.5,0],[0,-.06,0],.045,.045,[.13,.25,.15],16);for(let j=0;j<14;j++)tool.tube([0,-.5+j*.029,0],[0,-.49+j*.029,0],.048,.048,[.20,.33,.19],12);
 tool.tube([0,-.06,0],[0,.12,-.12],.065,.049,steel,16);tool.tube([0,.12,-.12],[0,.15,-.20],.05,.044,[.62,.47,.20],16);tool.tube([0,.15,-.20],[0,.15,-.23],.031,.031,rubber,16);
 tool.tube([.03,-.08,-.04],[.03,-.26,-.08],.015,.015,rubber,10);
 for(let j=0;j<18;j++){const f=j/18,g=(j+1)/18;tool.tube([Math.sin(f*3)*.15,-.5-f*.6,f*.3],[Math.sin(g*3)*.15,-.5-g*.6,g*.3],.025,.025,[.14,.29,.16],10);}
 }else{
 const top=k.tool==='shovel'?.62:.72;
 tool.tube([0,-.5,0],[0,top,0],.023,.019,[.55,.36,.17],16);
 for(let j=0;j<5;j++){const x=(j-2)*.007;tool.tube([x,-.25,.022],[x,top-.1,.018],.0013,.0013,[.36,.23,.12],4);}
 // Rubber handle, ribbing and metal shaft socket.
 tool.tube([0,-.5,0],[0,-.21,0],.032,.029,rubber,16);for(let j=0;j<12;j++)tool.tube([0,-.48+j*.022,0],[0,-.474+j*.022,0],.033,.032,[.17,.18,.17],12);
 tool.tube([0,top-.13,0],[0,top+.025,0],.025,.028,steel,14);
 if(k.tool==='plunger'){
 tool.cone(0,top-.015,0,.15,.15,[.49,.15,.085],24,.041);tool.cone(0,top-.04,0,.16,.032,[.32,.075,.043],24,.16);tool.sphere(0,top-.043,0,.125,.01,.125,[.13,.055,.035],8,20);
 }else if(k.tool==='broom'){
 tool.box([0,top,0],[.44,.085,.11],[.46,.29,.13]);
 for(let i=0;i<28;i++)for(let j=0;j<3;j++){const x=(i-13.5)*.016,z=(j-1)*.033;tool.tube([x,top-.03,z],[x*1.16,top-.25-(i%3)*.01,z*1.5],.004,.003,[.70+(i%3)*.025,.59,.32],5);}
 }else if(k.tool==='squeaky'){
 tool.tube([-.20,top+.04,0],[.20,top+.04,0],.11,.11,[.83,.42,.12],20);
 for(const side of[-1,1]){tool.cone(side*.21,top-.07,0,.07,.22,[.87,.63,.20],16,.07);tool.sphere(side*.25,top+.04,0,.025,.10,.10,[.84,.23,.12],10,16);}
 tool.sphere(0,top+.04,.108,.025,.025,.008,[.98,.84,.31],7,10);
 }else if(k.tool==='mallet'){
 tool.tube([-.19,top+.08,0],[.19,top+.08,0],.093,.093,rubber,24);for(const x of[-.20,.20]){tool.sphere(x,top+.08,0,.017,.093,.093,[.12,.13,.13],10,20);tool.tube([x*.85,top+.08,0],[x*.95,top+.08,0],.097,.097,[.19,.20,.19],24);}
 }else if(k.tool==='rake'){
 tool.tube([-.29,top+.02,0],[.29,top+.02,0],.023,.023,steel,16);
 for(let i=0;i<12;i++){const x=-.275+i*.05;tool.tube([x,top+.02,0],[x,top-.07,-.04],.010,.009,steel,10);tool.tube([x,top-.07,-.04],[x,top-.13,-.13],.009,.006,steel,10);}
 tool.tube([0,top-.14,0],[-.18,top+.02,0],.012,.012,steel,10);tool.tube([0,top-.14,0],[.18,top+.02,0],.012,.012,steel,10);
 }else{
 // Curved spade blade with a pointed cutting edge and pressed center ridge.
 const rows=[[top-.02,.06],[top+.09,.145],[top+.27,.14],[top+.40,.025]];
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<8;i++){const u=-1+i/4,v=u+.25,p=(r,s)=>[s*r[1],r[0],.035*(1-s*s)];tool.quad(p(rows[j],u),p(rows[j],v),p(rows[j+1],v),p(rows[j+1],u),i%2?steel:[.69,.72,.72]);}
 for(const s of[-1,1])tool.tube([s*.06,top-.02,0],[s*.145,top+.09,0],.008,.008,[.77,.79,.77],10);
 tool.tube([-.06,-.5,0],[-.09,-.65,0],.019,.019,steel,12);tool.tube([.06,-.5,0],[.09,-.65,0],.019,.019,steel,12);tool.tube([-.06,-.5,0],[0,-.44,0],.019,.019,steel,12);tool.tube([.06,-.5,0],[0,-.44,0],.019,.019,steel,12);tool.tube([-.09,-.65,0],[.09,-.65,0],.025,.025,rubber,14);
 }
 }
 const bare=k.tool==='fist'||k.tool==='hand'||k.tool==='glove',angle=bare?(k.tool==='hand'?-.45+a*1.1:0):-.28+a*.48;
 const target=bare?(k.tool==='hand'?[.54-a*.62,1.30,.57-a*.83]:[.20-a*.17,1.25,.63-a*.88]):[.56-a*.52,.78,.62-a*.87];
 m.addTransformed(tool,p=>[target[0]+p[0]*Math.cos(angle)-p[1]*Math.sin(angle),target[1]+p[0]*Math.sin(angle)+p[1]*Math.cos(angle),target[2]+p[2]]);
 if(k.tool==='hose'&&t<.55)for(let i=0;i<22;i++){const f=((i/22+time*2)%1),q=mix([target[0],target[1]+.15,target[2]-.23],[0,1.29,-.31],f);m.sphere(q[0]+Math.sin(i*3)*f*.06,q[1]-Math.sin(f*Math.PI)*.045,q[2],.012,.018,.025,[.51,.80,.93],5,8);}
}
