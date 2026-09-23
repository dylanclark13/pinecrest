import {height,surface,fairDistance,fairwayWidth,ellipse,seeded,clamp,CLUBS,BALL_RADIUS,CUP_RADIUS,waterLevel,inWater,greenGradient} from './physics.js';
import {addGolfer} from './golfer.js';
const TAU=Math.PI*2;
export const V={sub:(a,b)=>a.map((n,i)=>n-b[i]),dot:(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(...a)||1;return a.map(n=>n/l);}};
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,center){const z=V.norm(V.sub(eye,center)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);}
function mult(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let i=0;i<4;i++)o[c*4+r]+=a[i*4+r]*b[c*4+i];return o;}
export class MeshBuilder{
  constructor(){this.a=[];}
  tri(a,b,c,color){const n=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));for(const p of[a,b,c])this.a.push(...p,...n,...color);}
  quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
  sphere(x,y,z,rx,ry,rz,color,rows=6,cols=9){for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const p=(a,b)=>[x+rx*Math.sin(a)*Math.cos(b),y+ry*Math.cos(a),z+rz*Math.sin(a)*Math.sin(b)],a=j/rows*Math.PI,b=(j+1)/rows*Math.PI,c=i/cols*TAU,d=(i+1)/cols*TAU;this.quad(p(a,d),p(b,d),p(b,c),p(a,c),color);}}
  cone(x,y,z,r,h,color,sides=9,rTop=0){for(let i=0;i<sides;i++){const a=i/sides*TAU,b=(i+1)/sides*TAU;this.quad([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(a)*rTop,y+h,z+Math.sin(a)*rTop],[x+Math.cos(b)*rTop,y+h,z+Math.sin(b)*rTop],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],color);}}
  tube(a,b,r1,r2,col,sides=8){const axis=V.norm(V.sub(b,a)),u=V.norm(V.cross(axis,Math.abs(axis[1])>.95?[1,0,0]:[0,1,0])),v=V.cross(axis,u);for(let i=0;i<sides;i++){const t=i/sides*TAU,n=(i+1)/sides*TAU,p=(c,r,s)=>c.map((q,k)=>q+r*(Math.cos(s)*u[k]+Math.sin(s)*v[k]));this.quad(p(a,r1,n),p(b,r2,n),p(b,r2,t),p(a,r1,t),col);}}
  box(c,size,col){const p=(x,y,z)=>[c[0]+x*size[0]/2,c[1]+y*size[1]/2,c[2]+z*size[2]/2];this.quad(p(-1,-1,1),p(1,-1,1),p(1,1,1),p(-1,1,1),col);this.quad(p(1,-1,-1),p(-1,-1,-1),p(-1,1,-1),p(1,1,-1),col);this.quad(p(1,-1,1),p(1,-1,-1),p(1,1,-1),p(1,1,1),col);this.quad(p(-1,-1,-1),p(-1,-1,1),p(-1,1,1),p(-1,1,-1),col);this.quad(p(-1,1,1),p(1,1,1),p(1,1,-1),p(-1,1,-1),col);this.quad(p(-1,-1,-1),p(1,-1,-1),p(1,-1,1),p(-1,-1,1),col);}
  ellipsoidBetween(a,b,rx,rz,col,sides=12){for(let j=0;j<5;j++){const t=j/5,u=(j+1)/5,p1=lerp(a,b,t),p2=lerp(a,b,u),r1=.84+.16*Math.sin(t*Math.PI),r2=.84+.16*Math.sin(u*Math.PI);for(let i=0;i<sides;i++){const aa=i/sides*TAU,bb=(i+1)/sides*TAU,p=(c,r,v)=>[c[0]+Math.cos(v)*rx*r,c[1],c[2]+Math.sin(v)*rz*r];this.quad(p(p1,r1,aa),p(p2,r2,aa),p(p2,r2,bb),p(p1,r1,bb),col);}}}
  addTransformed(mesh,fn){for(let i=0;i<mesh.a.length;i+=27){this.tri(fn(mesh.a.slice(i,i+3)),fn(mesh.a.slice(i+9,i+12)),fn(mesh.a.slice(i+18,i+21)),mesh.a.slice(i+6,i+9));}}
}
export class GolfRenderer{
  constructor(canvas){
    this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:true,alpha:true});if(!gl)throw Error('WebGL unavailable');this.gl=gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vert=shader(gl.VERTEX_SHADER,`attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uMatrix;uniform vec3 uEye;varying vec3 vColor;varying vec3 vWorld;varying vec3 vNormal;varying float vFog;void main(){gl_Position=uMatrix*vec4(aPos,1.);vColor=aColor;vWorld=aPos;vNormal=aNormal;vFog=1.-exp(-pow(distance(aPos,uEye)*.0015,1.65));}`);
    const frag=shader(gl.FRAGMENT_SHADER,`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vColor;varying vec3 vWorld;varying vec3 vNormal;varying float vFog;uniform float uTime;float hash(vec2 p){return fract(sin(dot(mod(p,vec2(64.)),vec2(127.1,311.7)))*43758.5453);}void main(){vec3 n=normalize(vNormal);float light=.56+.44*max(0.,dot(n,normalize(vec3(-.5,1.,.35))));vec3 color=vColor*light;if(vColor.g>vColor.r*1.20&&vColor.g>vColor.b*1.3&&n.y>.7){float grain=sin(vWorld.x*2.1)*sin(vWorld.z*1.7);color*=.985+grain*.015;}if(vColor.b>vColor.r*1.35&&vColor.g>vColor.r*1.3&&n.y>.8){float ripple=sin(vWorld.x*2.+vWorld.z*.8+uTime*1.7)*sin(vWorld.z*3.-uTime);color+=vec3(.05,.08,.075)*ripple;color+=vec3(.15)*pow(max(0.,ripple),16.);}gl_FragColor=vec4(mix(color,vec3(.73,.83,.81),vFog),1.);}`);
    this.program=gl.createProgram();gl.attachShader(this.program,vert);gl.attachShader(this.program,frag);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Shader linking failed');gl.useProgram(this.program);
    this.loc={pos:gl.getAttribLocation(this.program,'aPos'),normal:gl.getAttribLocation(this.program,'aNormal'),color:gl.getAttribLocation(this.program,'aColor'),matrix:gl.getUniformLocation(this.program,'uMatrix'),eye:gl.getUniformLocation(this.program,'uEye'),time:gl.getUniformLocation(this.program,'uTime')};gl.enable(gl.DEPTH_TEST);
    this.eye=[2,3.1,6];this.center=[0,1,-20];this.dynamic=this.buffer([]);this.time=0;this.trees=[];
  }
  buffer(data){const b=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(data),this.gl.STATIC_DRAW);return {buffer:b,count:data.length/9};}
  setData(mesh,data){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,mesh.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(data),this.gl.DYNAMIC_DRAW);mesh.count=data.length/9;}
  loadHole(h){
    this.h=h;this.trees=[];const m=new MeshBuilder(),rand=seeded(h.seed),d=3,minZ=h.pin[1]-95;const biome=h.biome||'woodland',links=biome==='links',park=biome==='park',ridge=biome==='ridge';const colors=links?{rough:[.47,.46,.26],fair1:[.38,.48,.22],fair2:[.43,.52,.25]}:park?{rough:[.26,.43,.18],fair1:[.31,.53,.20],fair2:[.35,.57,.22]}:{rough:[.22,.38,.155],fair1:[.27,.48,.17],fair2:[.32,.54,.19]};
    const land=(x,z)=>height(h,x,z)+Math.max(Math.abs(x)-108,0)**1.3*(links?.014:ridge?.04:.028);
    // One continuous surface: refine aligned grid lines around the green instead of layering patches.
    const grid=(lo,hi,pin,r)=>{const a=[];for(let v=lo;v<hi;v+=d){const steps=Math.abs(v+d/2-pin)<r+9?6:1;for(let i=0;i<steps;i++)a.push(v+Math.min(d,hi-v)*i/steps);}a.push(hi);return a;};
    const xs=grid(-165,165,h.pin[0],h.greenRadius),zs=grid(minZ,90,h.pin[1],h.greenRadius);
    for(let iz=0;iz<zs.length-1;iz++)for(let ix=0;ix<xs.length-1;ix++){
      const x=xs[ix],z=zs[iz],xx=xs[ix+1],zz=zs[iz+1];if(links&&x>=138)continue;
      const cx=(x+xx)/2,cz=(z+zz)/2,lie=surface(h,cx,cz),fd=fairDistance(h,cx,cz);
      let col=lie==='green'?[.44,.66,.245]:lie==='fringe'?[.35,.55,.18]:lie==='fairway'||lie==='tee'?(Math.floor((cz+cx*.32)/9)%2===0?colors.fair1:colors.fair2):lie==='sand'?[.82,.77,.57]:colors.rough;
      if(lie==='rough'&&fd<fairwayWidth(h,cz)+3)col=[.28,.45,.17];
      const n=lie==='green'||lie==='fringe'?0:(rand()-.5)*.025;col=col.map(v=>v+n);const p=(a,b)=>[a,land(a,b),b];m.quad(p(x,z),p(x,zz),p(xx,zz),p(xx,z),col);
    }
    const ring=(e,width,col,lift=.05)=>{for(let i=0;i<110;i++){const a=i/110*TAU,b=(i+1)/110*TAU,p=(t,ex)=>{const x=e[0]+Math.cos(t)*(e[2]+ex),z=e[1]+Math.sin(t)*(e[3]+ex);return [x,height(h,x,z)+lift,z];};m.quad(p(a,0),p(b,0),p(b,width),p(a,width),col);}};
    for(const s of h.sand){ring(s,.55,[.51,.49,.30]);for(let i=0;i<11;i++){const z=s[1]+(i-5)*s[3]*.12,len=s[2]*Math.sqrt(Math.max(0,1-((z-s[1])/s[3])**2))*.8;for(let x=s[0]-len;x<s[0]+len;x+=1){const p=(a,b)=>[a,height(h,a,b)+.035,b];m.quad(p(x,z),p(x+1,z),p(x+1,z+.035),p(x,z+.035),[.72,.66,.48]);}}
      const ry=height(h,s[0]+s[2]+1,s[1]);m.tube([s[0]+s[2]+1,ry+.1,s[1]-1],[s[0]+s[2]+1,ry+.1,s[1]+1.2],.035,.025,[.46,.34,.20],6);m.box([s[0]+s[2]+1,ry+.12,s[1]-1],[.8,.06,.10],[.19,.27,.22]);}
    for(const w of h.water){const wy=waterLevel(h,w);for(let z=w[1]-w[3];z<w[1]+w[3];z+=1.5)for(let x=w[0]-w[2];x<w[0]+w[2];x+=1.5){if(ellipse(x+.75,z+.75,w)>=1||![[x,z],[x,z+1.5],[x+1.5,z+1.5],[x+1.5,z]].every(([a,b])=>inWater(h,a,b)))continue;m.quad([x,wy,z],[x,wy,z+1.5],[x+1.5,wy,z+1.5],[x+1.5,wy,z],[.18,.42,.45]);}
      for(let i=0;i<40;i++){const a=rand()*TAU,x=w[0]+Math.cos(a)*(w[2]+.8),z=w[1]+Math.sin(a)*(w[3]+.8),y=height(h,x,z);if(rand()<.3)m.sphere(x,y+.23,z,.4+rand()*.4,.3,.5,[.45,.48,.40],4,7);else for(let j=0;j<3;j++)m.tube([x+j*.08,y,z],[x+j*.08+.1,y+.8+rand()*.4,z+.1],.018,.008,[.37,.39,.19],4);}}
    // A cart path follows the outside of the fairway.
    const path=h.centerline||h.path;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let j=0;j<len;j+=3){const p=lerp(a,b,j/len),q=lerp(a,b,Math.min(1,(j+3)/len)),off=h.width+9;const v=(r,o)=>[r[0]+off+o,height(h,r[0]+off+o,r[1])+.045,r[1]];if(!inWater(h,p[0]+off,p[1]))m.quad(v(p,0),v(q,0),v(q,2),v(p,2),[.52,.51,.43]);}}
    // Mixed trees have trunks, branches, canopies, and grounded shadows.
    for(let i=0;i<(links?85:park?460:ridge?450:650);i++){const x=(rand()-.5)*294,z=45-rand()*(60-minZ),fd=fairDistance(h,x,z);if(fd<fairwayWidth(h,z)+7||Math.hypot(x-h.pin[0],z-h.pin[1])<h.greenRadius+10||h.water.some(w=>ellipse(x,z,w,7)<1)||h.sand.some(s=>ellipse(x,z,s,4)<1))continue;
      const y=land(x,z),ht=8+rand()*12,rr=2.5+rand()*2.2;this.trees.push({x,z,r:.5,h:ht,y,canopy:rr});m.cone(x,y,z,.32,ht*.7,[.28,.23,.16],7,.17);
      if(rand()<(park?.86:links?.1:ridge?.15:.30)){for(let k=0;k<4;k++){const a=k*TAU/4,bx=x+Math.cos(a)*rr*.7,bz=z+Math.sin(a)*rr*.7;m.tube([x,y+ht*.42,z],[bx,y+ht*.72,bz],.14,.055,[.28,.23,.16],5);m.sphere(bx,y+ht*(.70+rand()*.08),bz,rr,ht*.19,rr,[.22+rand()*.05,.36+rand()*.07,.15],5,8);}m.sphere(x,y+ht*.91,z,rr*.8,ht*.14,rr*.8,[.25,.41,.17],5,8);}
      else{const green=[.10+rand()*.025,.26+rand()*.055,.17+rand()*.035];for(let k=0;k<5;k++)m.cone(x,y+ht*(.2+k*.13),z,rr*(1-k*.15),ht*.4,green.map(c=>c*(1+k*.035)),10);}
      for(let k=0;k<14;k++){const a=k/14*TAU,b=(k+1)/14*TAU,p=t=>{const xx=x+Math.cos(t)*rr*1.05+ht*.15,zz=z+Math.sin(t)*rr;return [xx,land(xx,zz)+.025,zz];};m.tri([x+ht*.15,land(x+ht*.15,z)+.025,z],p(b),p(a),[.16,.29,.12]);}}
    // Distant ridges and soft banks of clouds stay beyond the playable course.
    const ridgePoint=(x,z)=>{const edge=Math.max(Math.abs(x)-145,minZ-z,z-80,0),ramp=clamp(edge/140,0,1),waves=.5+.24*Math.sin(x*.011+z*.008+h.seed)+.18*Math.sin(z*.017-x*.006);return [x,-6+ramp*(ridge?115:park?40:links?24:65)*waves,z];};
    for(let x=-670;x<670;x+=22)for(let z=minZ-440;z<390;z+=22){if(Math.abs(x)<155&&z>minZ&&z<85||links&&x>120)continue;m.quad(ridgePoint(x,z),ridgePoint(x,z+22),ridgePoint(x+22,z+22),ridgePoint(x+22,z),links?[.49,.48,.32]:[.33,.45,.32]);}
    if(links){for(let x=139;x<1100;x+=32)for(let z=minZ-500;z<500;z+=32)m.quad([x,-2,z],[x,-2,z+32],[x+32,-2,z+32],[x+32,-2,z],[.13,.36,.42]);for(let z=minZ;z<80;z+=9){const x=135+Math.sin(z*.08)*3,y=land(x,z);m.sphere(x,y+.15,z,2.8,.6,2.2,[.58,.55,.39],5,8);}}
    if(ridge)for(let i=0;i<75;i++){const x=(rand()-.5)*220,z=20-rand()*(30-minZ);if(fairDistance(h,x,z)<h.width+8||Math.hypot(x-h.pin[0],z-h.pin[1])<h.greenRadius+8||inWater(h,x,z))continue;const y=height(h,x,z),r=1+rand()*2;m.sphere(x,y+r*.35,z,r,r*.65,r*.8,[.45,.47,.41],5,8);this.trees.push({x,z,y,r:r*.7,h:r*1.1,canopy:0});}
    for(let i=0;i<12;i++){const x=(rand()-.5)*1200,z=minZ-150-rand()*450,y=100+rand()*95;for(let j=0;j<4;j++)m.sphere(x+j*24,y+(j%2)*7,z,35,12+rand()*8,18,[.92,.94,.89],5,9);}
    // Tee platform, yardage stakes, bench, and out-of-bounds posts.
    for(const x of[-3.2,3.2]){m.box([x,height(h,x,0)+.16,0],[.34,.3,.25],[.10,.24,.34]);m.box([x,height(h,x,0)+.32,0],[.25,.035,.2],[.81,.85,.77]);}
    for(let z=-70;z>h.pin[1]+60;z-=70){let p=h.path.reduce((a,b)=>Math.abs(b[1]-z)<Math.abs(a[1]-z)?b:a);const x=p[0]-h.width-2,y=height(h,x,z);m.cone(x,y,z,.07,.7,[.93,.94,.83],6,.055);m.cone(x,y+.45,z,.073,.12,[.53,.18,.13],6,.073);}
    for(const x of[-112,112])for(let z=20;z>h.pin[1]-55;z-=34){const y=land(x,z);m.cone(x,y,z,.06,.8,[.93,.94,.84],5,.045);}
    const benchX=9,benchZ=4,by=height(h,benchX,benchZ);for(const z of[benchZ-.8,benchZ+.8]){m.box([benchX,by+.24,z],[.07,.48,.09],[.16,.20,.17]);m.box([benchX+.6,by+.24,z],[.07,.48,.09],[.16,.20,.17]);}for(let j=0;j<3;j++)m.box([benchX+j*.24,by+.52,benchZ],[.20,.065,2.0],[.49,.37,.23]);m.box([benchX-.06,by+.83,benchZ],[.06,.38,2.0],[.49,.37,.23]);
    // A detailed cart sits beside each first tee, off the playing line.
    const cx=14,cz=4,cy=height(h,cx,cz);m.box([cx,cy+.65,cz],[1.45,.4,2.45],[.89,.88,.75]);m.box([cx,cy+.98,cz-.47],[1.28,.45,.58],[.14,.21,.18]);m.box([cx,cy+.91,cz+.35],[1.22,.2,.64],[.74,.70,.57]);
    for(const sx of[-.74,.74])for(const sz of[-.72,.72]){m.sphere(cx+sx,cy+.32,cz+sz,.16,.30,.30,[.10,.12,.115],7,10);m.sphere(cx+sx*1.08,cy+.32,cz+sz,.045,.13,.13,[.52,.57,.53],5,8);}
    for(const sx of[-.62,.62])for(const sz of[-.83,.83])m.tube([cx+sx,cy+.7,cz+sz],[cx+sx,cy+1.97,cz+sz],.027,.026,[.33,.40,.34],6);
    m.box([cx,cy+2,cz],[1.6,.10,2.50],[.88,.89,.78]);m.box([cx,cy+1.44,cz-.84],[1.18,.46,.028],[.46,.63,.61]);m.tube([cx+.31,cy+.8,cz-.53],[cx+.31,cy+1.19,cz-.3],.035,.035,[.16,.19,.16],7);m.sphere(cx+.31,cy+1.2,cz-.30,.17,.026,.17,[.13,.17,.14],5,10);
    // A stone clubhouse gives the opening holes a fixed landmark.
    if(h.id?.endsWith('-1')){const x=-59,z=21,y=height(h,x,z);m.box([x,y+3,z],[17,6,10],[.64,.61,.48]);m.box([x,y+6.2,z],[19,.45,12],[.19,.27,.23]);m.tri([x-10,y+6.4,z-6],[x,y+9.3,z-6],[x+10,y+6.4,z-6],[.21,.29,.25]);m.quad([x-10,y+6.4,z-6],[x-10,y+6.4,z+6],[x,y+9.3,z+6],[x,y+9.3,z-6],[.23,.30,.26]);m.quad([x,y+9.3,z-6],[x,y+9.3,z+6],[x+10,y+6.4,z+6],[x+10,y+6.4,z-6],[.20,.27,.24]);for(let j=-3;j<=3;j++){m.box([x+j*2.3,y+3.2,z-5.02],[1.3,2.0,.04],[.27,.43,.42]);m.box([x+j*2.3,y+3.2,z-5.06],[.07,2.05,.05],[.77,.76,.63]);}m.box([x,y+1.6,z-5.08],[1.9,3.2,.09],[.27,.30,.22]);for(const dx of[-9,9])m.cone(x+dx,y,z-7,.18,3.3,[.68,.66,.53],9,.18);m.box([x,y+3.4,z-7],[19,.25,4],[.62,.62,.49]);}
    // Cup and flagstick use the same location as collision detection.
    const px=h.pin[0],pz=h.pin[1],py=height(h,px,pz);for(let i=0;i<32;i++){const a=i/32*TAU,b=(i+1)/32*TAU;m.tri([px,py+.035,pz],[px+Math.cos(b)*CUP_RADIUS,py+.035,pz+Math.sin(b)*CUP_RADIUS],[px+Math.cos(a)*CUP_RADIUS,py+.035,pz+Math.sin(a)*CUP_RADIUS],[.045,.07,.035]);}
    m.cone(px,py,pz,.022,2.7,[.93,.93,.83],8,.018);m.sphere(px,py+2.72,pz,.04,.04,.04,[.94,.85,.53],5,8);
    if(this.world)this.gl.deleteBuffer(this.world.buffer);this.world=this.buffer(m.a);this.eye=[2,3.3,6];this.center=[0,1,-20];this.grassKey='';if(this.grass){this.gl.deleteBuffer(this.grass.buffer);this.grass=null;}
  }
  draw(mesh){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);for(const [k,offset]of[['pos',0],['normal',12],['color',24]]){gl.enableVertexAttribArray(this.loc[k]);gl.vertexAttribPointer(this.loc[k],3,gl.FLOAT,false,36,offset);}gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
  render(state,dt){
    this.time+=dt;const {ball:b,hole:h,angle,view,moving,trajectory}=state,w=this.canvas.clientWidth,hg=this.canvas.clientHeight,dpr=Math.min(globalThis.devicePixelRatio||1,1.6);
    if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(hg*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(hg*dpr);}
    const actor=state.actor||{x:b.x,z:b.z,angle,club:CLUBS[state.clubIndex||0],phase:'address',progress:0,power:.7};
    const dir=[Math.sin(actor.angle),0,-Math.cos(actor.angle)],right=[Math.cos(actor.angle),0,Math.sin(actor.angle)],near=Math.hypot(b.x-h.pin[0],b.z-h.pin[1])<25,watchingSwing=actor.phase==='downswing'||actor.phase==='follow'&&actor.progress<.7;let eye,center;
    if(view==='home'){const t=this.time*.035,cz=h.pin[1]*.33;eye=[45+Math.sin(t)*21,38+Math.sin(t*.8)*3,cz+70];center=[-4,5,cz-45];}
    else if(view==='equipment'){eye=[3.0,2.7,4.2];center=[-.8,1.35,0];}
    else if(view==='overview'&&!watchingSwing){const cz=h.pin[1]*.48;eye=[100,Math.abs(h.pin[1])*.85+65,cz+120];center=[0,0,cz];}
    else if(moving&&!watchingSwing){const speed=Math.hypot(b.vx,b.vz),vx=speed>1?b.vx/speed:dir[0],vz=speed>1?b.vz/speed:dir[2];eye=[b.x-vx*(near?9:19),b.y+(near?5:10),b.z-vz*(near?9:19)];center=[b.x+vx*9,b.y-.2,b.z+vz*9];}
    else {const gy=height(h,actor.x,actor.z),mobile=w<760;const side=mobile?-.55:1.8,back=mobile?5.0:5.5;eye=[actor.x-dir[0]*back+right[0]*side,gy+(mobile?2.65:2.65),actor.z-dir[2]*back+right[2]*side];center=[actor.x+dir[0]*(near?4:8)-right[0]*(mobile?.55:.2),gy+(near?-.1:mobile?-.8:-.45),actor.z+dir[2]*(near?4:8)-right[2]*(mobile?.55:.2)];}
    const sm=1-Math.exp(-dt*(moving?3.2:5));this.eye=lerp(this.eye,eye,sm);this.center=lerp(this.center,center,sm);this.eye[1]=Math.max(this.eye[1],height(h,this.eye[0],this.eye[2])+1.35);
    this.fov=55*Math.PI/180;this.aspect=w/hg;this.matrix=mult(perspective(this.fov,this.aspect,.25,2100),lookAt(this.eye,this.center));
    const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.matrix,false,this.matrix);gl.uniform3fv(this.loc.eye,this.eye);gl.uniform1f(this.loc.time,this.time);this.draw(this.world);
    const m=new MeshBuilder(),px=h.pin[0],pz=h.pin[1],py=height(h,px,pz);
    // The flag moves in the current wind.
    for(let i=0;i<8;i++){const x=i*.095,q=(i+1)*.095,wave=t=>Math.sin(this.time*4-t*5)*.06*t;
      m.quad([px+x,py+2.64-x*.15,pz+wave(x)],[px+q,py+2.64-q*.15,pz+wave(q)],[px+q,py+2.13-q*.06,pz+wave(q)],[px+x,py+2.13-x*.06,pz+wave(x)],[.94,.76,.28]);}
    // The golfer is rendered in world space, with every club and limb articulated.
    if(Math.hypot(this.eye[0]-actor.x,this.eye[2]-actor.z)<85){const human=new MeshBuilder();addGolfer(human,actor.club,actor.phase,actor.progress,actor.power,this.time);const ay=height(h,actor.x,actor.z);m.addTransformed(human,p=>[actor.x+right[0]*p[0]+dir[0]*p[2],ay+p[1],actor.z+right[2]*p[0]+dir[2]*p[2]]);
      for(let i=0;i<24;i++){const a=i/24*TAU,q=(i+1)/24*TAU,p=t=>{const x=actor.x+right[0]*(-.8+Math.cos(t)*.48)+dir[0]*Math.sin(t)*.8,z=actor.z+right[2]*(-.8+Math.cos(t)*.48)+dir[2]*Math.sin(t)*.8;return [x,height(h,x,z)+.04,z];};m.tri([actor.x-right[0]*.8,height(h,actor.x-right[0]*.8,actor.z-right[2]*.8)+.04,actor.z-right[2]*.8],p(q),p(a),[.13,.24,.105]);}}
    const by=height(h,b.x,b.z)+.028,shadowR=clamp(.08+(b.y-by)*.017,.08,.6);
    for(let i=0;i<18;i++){const a=i/18*TAU,c=(i+1)/18*TAU,p=t=>{const x=b.x+Math.cos(t)*shadowR,z=b.z+Math.sin(t)*shadowR;return [x,height(h,x,z)+.04,z];};m.tri([b.x,height(h,b.x,b.z)+.04,b.z],p(c),p(a),[.13,.22,.10]);}
    if(!b.holed){const eyeDist=Math.hypot(...V.sub(this.eye,[b.x,b.y,b.z])),rad=view==='overview'?.65:Math.max(BALL_RADIUS,Math.min(.18,eyeDist*.003));m.sphere(b.x,b.y+.005,b.z,rad,rad,rad,[1,1,.96],8,12);}
    // Short sightline replaces the old exact flight predictor in the harder game.
    if(!moving&&!b.holed&&actor.phase==='address'){const ad=[Math.sin(angle),-Math.cos(angle)],len=near?Math.min(6,Math.hypot(px-b.x,pz-b.z)):13;for(let t=.7;t<len;t+=.7){const x=b.x+ad[0]*t,z=b.z+ad[1]*t,xx=b.x+ad[0]*(t+.38),zz=b.z+ad[1]*(t+.38);m.tube([x,height(h,x,z)+.07,z],[xx,height(h,xx,zz)+.07,zz],.015,.015,[.84,.94,.59],4);}}
    // Stable slope arrows avoid the old dots snapping back every animation cycle.
    if(state.greenGrid&&!moving){const r=h.greenRadius;for(let x=px-r+1;x<px+r-1;x+=2.4)for(let z=pz-r+1;z<pz+r-1;z+=2.4){if(Math.hypot(x-px,z-pz)>r-1.3||surface(h,x,z)!=='green')continue;const [gx,gz]=greenGradient(h,x,z),l=Math.hypot(gx,gz);if(l<.002)continue;const dx=-gx/l,dz=-gz/l,len=.55,p=(a,b)=>[a,height(h,a,b)+.09,b],end=[x+dx*len,z+dz*len];m.tube(p(x,z),p(...end),.012,.012,[.66,.80,.42],5);for(const side of[-1,1])m.tube(p(...end),p(end[0]-dx*.19+dz*side*.13,end[1]-dz*.19-dx*side*.13),.012,.010,[.66,.80,.42],5);}}
    if(state.trail?.length>1)for(let i=1;i<state.trail.length;i++){const a=state.trail[i-1],c=state.trail[i];m.tube([a.x,a.y,a.z],[c.x,c.y,c.z],.018,.014,[.90,.95,.77],4);}
    // Small pieces of turf follow the club at contact.
    if(actor.phase==='follow'&&actor.club.type!=='putter'&&actor.progress<.8){for(let i=0;i<12;i++){const t=actor.progress,dx=(i%3-1)*.14*t,dz=(.7+i*.12)*t,x=actor.x+right[0]*dx+dir[0]*dz,z=actor.z+right[2]*dx+dir[2]*dz;const y=height(h,actor.x,actor.z)+Math.max(.04,(.8+i*.06)*t-1.8*t*t);m.sphere(x,y,z,.027,.016,.04,surface(h,actor.x,actor.z)==='sand'?[.79,.71,.51]:[.31,.40,.15],3,4);}}
    if(!moving&&this.grassKey!==Math.round(actor.x)+','+Math.round(actor.z)){
      this.grassKey=Math.round(actor.x)+','+Math.round(actor.z);const grass=new MeshBuilder(),rand=seeded(h.seed+Math.round(actor.x)*91+Math.round(actor.z)*53);
      for(let i=0;i<1400;i++){const x=actor.x+(rand()-.5)*24,z=actor.z+(rand()-.5)*24,lie=surface(h,x,z);if(lie!=='rough'&&lie!=='fringe')continue;const y=height(h,x,z),ht=(lie==='rough'?.12:.045)+rand()*(lie==='rough'?.18:.025),color=h.biome==='links'?[.51,.50,.28]:[.27+rand()*.07,.43+rand()*.10,.16];for(let j=0;j<3;j++){const a=j*2.1,xx=Math.cos(a)*.025,zz=Math.sin(a)*.025;grass.tri([x-xx,y,z-zz],[x+xx,y,z+zz],[x+.045,y+ht,z+.03],color);}}
      if(this.grass)this.gl.deleteBuffer(this.grass.buffer);this.grass=this.buffer(grass.a);
    }
    if(this.grass)this.draw(this.grass);
    this.setData(this.dynamic,m.a);this.draw(this.dynamic);
  }
  pointOnCourse(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),nx=(clientX-rect.left)/rect.width*2-1,ny=1-(clientY-rect.top)/rect.height*2,forward=V.norm(V.sub(this.center,this.eye)),right=V.norm(V.cross(forward,[0,1,0])),up=V.cross(right,forward),t=Math.tan(this.fov/2),ray=V.norm(forward.map((v,i)=>v+right[i]*nx*t*this.aspect+up[i]*ny*t));for(let d=.5;d<1100;d+=.5){const p=this.eye.map((v,i)=>v+ray[i]*d);if(p[1]<=height(this.h,p[0],p[2]))return [p[0],p[2]];}return null;}
}
