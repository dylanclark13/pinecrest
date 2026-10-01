import assert from 'node:assert/strict';
import {GolfRenderer} from '../web/renderer.js';
import {COURSES} from '../web/courses.js';
import {makeBall,CLUBS} from '../web/physics.js';
import {keeperReaction} from '../web/keeper-office.js';
import {KEEPER_TOOLS} from '../web/greenskeeper.js';
const gl=new Proxy({}, {get:()=>()=>{}});
const renderer=Object.assign(Object.create(GolfRenderer.prototype),{canvas:{clientWidth:640,clientHeight:440,width:640,height:440},gl,loc:{},time:0,eye:[2,3,6],center:[0,1,0],world:{},dynamic:{},draw(){},buffer(data){assert(data.every(Number.isFinite),'office geometry must be finite');return {count:data.length/9};},setData(mesh,data){assert(data.length>0);assert(data.every(Number.isFinite),'rendered geometry must be finite');}});
const hole=COURSES[0].holes[0],ball=makeBall(hole);
const state={hole,ball,angle:0,view:'home',moving:false,actor:{x:0,z:0,angle:0,club:CLUBS[0],phase:'address',progress:0,power:.4}};
renderer.render(state,1/60);
for(const tool of KEEPER_TOOLS)for(const elapsed of[0,.15,.3,.7,1.3,2])renderer.render({...state,view:'greenskeeper',keeper:{tool:tool.id,elapsed,reduced:false}},1/60);
assert(renderer.office.count>1000,'office contains furnished room geometry');
const office=renderer.office;
renderer.canvas.clientWidth=320;renderer.canvas.clientHeight=300;
renderer.render({view:'greenskeeper',keeper:{tool:'hand',elapsed:.18,reduced:true}},1/60);
assert.equal(renderer.office,office,'static office geometry is reused');
assert([...renderer.matrix].every(Number.isFinite),'mobile office camera is valid');
renderer.render({...state,view:'putting'},1/60);
console.log('PASS: home, all Greenskeeper animations, and return to golf render without exceptions or invalid geometry');

for(const tool of KEEPER_TOOLS){
 assert.equal(keeperReaction({tool:tool.id,elapsed:.1}).amount,0,'reaction waits for contact');
 assert(keeperReaction({tool:tool.id,elapsed:.3}).amount>.9,'reaction peaks after contact');
 assert.equal(keeperReaction({tool:tool.id,elapsed:2}).amount,0,'reaction fully recovers');
 assert.equal(keeperReaction({tool:tool.id,elapsed:.3,reduced:true}).amount,0,'reduced motion suppresses recoil');
}
assert(keeperReaction({tool:'broom',elapsed:.3}).swivel>1);
console.log('PASS contact timing, dramatic recoil, recovery and reduced motion for all tools');
for(const quality of ['idle','miss','solid','perfect'])for(const tool of KEEPER_TOOLS){
 renderer.render({view:'greenskeeper',keeper:{tool:tool.id,elapsed:.3,quality,closeView:true,reduced:false}},1/60);
 if(quality==='miss')assert.equal(keeperReaction({tool:tool.id,elapsed:.3,quality}).amount,0,'miss does not produce a contact reaction');
}
assert(keeperReaction({tool:'fist',elapsed:.3,quality:'perfect'}).amount>keeperReaction({tool:'fist',elapsed:.3,quality:'solid'}).amount);
console.log('PASS close-up camera and distinct miss, solid, and perfect reaction geometry');
