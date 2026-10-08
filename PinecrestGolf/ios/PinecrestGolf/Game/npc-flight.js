import {height,BALL_RADIUS,clamp} from './physics.js';
// Airborne motion is defined in world space, not offset from the terrain below each frame.
export function prepareNPCFlight(hole,shot){
 const startY=height(hole,...shot.from)+BALL_RADIUS,endY=height(hole,...shot.to)+BALL_RADIUS;
 let arc=Math.max(.35,Math.min(28,shot.distance*.13));
 for(let i=1;i<256;i++){
  const u=i/256,x=shot.from[0]+(shot.to[0]-shot.from[0])*u,z=shot.from[1]+(shot.to[1]-shot.from[1])*u;
  arc=Math.max(arc,(height(hole,x,z)+BALL_RADIUS+.02-(startY+(endY-startY)*u))/(4*u*(1-u)));
 }
 return {startY,endY,arc,duration:clamp(Math.sqrt(8*arc/9.81),.55,6)};
}
export function npcFlightFrame(shot,flight,time){
 const u=clamp(time/flight.duration,0,1),dx=shot.to[0]-shot.from[0],dz=shot.to[1]-shot.from[1];
 const moving=time>=0&&u<1;
 return {x:u===1?shot.to[0]:shot.from[0]+dx*u,z:u===1?shot.to[1]:shot.from[1]+dz*u,y:u===1?flight.endY:flight.startY+(flight.endY-flight.startY)*u+4*flight.arc*u*(1-u),vx:moving?dx/flight.duration:0,vz:moving?dz/flight.duration:0,vy:moving?(flight.endY-flight.startY+4*flight.arc*(1-2*u))/flight.duration:0,moving,airborne:moving&&u>0,holed:!!shot.holed&&u===1};
}
