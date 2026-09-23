import {HOLES as ORIGINAL,clamp} from './physics.js';
const NAMES={
  park:['Willow Bend','Lily Pond','The Orchard','Bluebird','Garden Gate','Long Meadow','Old Oak','Mill Stream','The Pavilion','Maple Run','Rosebank','The Pasture','Stone Bridge','Foxglove','Pondside','The Promenade','Cedar Walk','Clubhouse Green'],
  ridge:['Summit Road','The Lookout','Granite Pass','Eagle Ridge','Lower Basin','Timberline','The Ascent','Ravine Crossing','High Point','The Divide','Hawk’s Nest','Switchback','Stone Shelf','Twin Peaks','Alpine Lake','Cloudline','The Pinnacle','Summit Finish'],
  links:['First Light','Salt Marsh','Dune Run','The Narrows','Harbor View','Longshore','The Headland','Tidal Crossing','Turn for Home','Sea Breeze','The Punchbowl','Winding Sands','The Old Quarry','Blind Corner','Lighthouse','Gale Force','Devil’s Passage','Atlantic Finish']
};
const BENDS={park:[-12,5,-16,15,-6,8,-20,16,10,-10,9,-18,22,12,-5,10,18,-12],ridge:[18,-15,24,-12,16,-19,14,-22,21,17,-14,25,-17,20,-13,23,-18,16],links:[-25,18,-22,26,-18,24,-20,27,-21,24,17,-28,23,-25,14,-22,20,-24]};
const FINISH={park:[-9,12,8,14,-12,6,-17,13,-9,12,-8,17,-12,9,-6,15,18,-10],ridge:[12,-15,11,-8,17,-12,8,-13,15,-16,9,-11,12,-9,16,-14,11,-13],links:[-14,17,-12,20,-11,18,-16,22,-13,17,12,-20,16,-15,12,-19,15,-18]};
const STRETCH={park:[.92,.86,.91,.98,.85,.93,.9,.94,.91,.92,.86,.9,.93,.9,.89,.91,.96,.90],ridge:[1.02,.97,1.06,1.07,.98,1.04,1.05,1.01,1.08,1.03,.96,1.04,1.06,1.03,.98,1.02,1.09,1.04],links:[1.06,.94,1.04,1.10,.95,1.06,1.03,1.05,1.06,1.04,.94,1.02,1.08,1.06,.95,1.04,1.1,1.03]};
function smooth(path){let pts=path.map(p=>[...p]);for(let k=0;k<2;k++){const next=[pts[0]];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}next.push(pts.at(-1));pts=next;}return pts;}
const CONFIGS=[
  {id:'park',name:'Willow Park',difficulty:'Relaxed',level:1,biome:'park',tag:'Open parkland',description:'Wide fairways, sheltered approaches, and slower greens. A forgiving place to learn the new swing.',windScale:.45,widthScale:1.3,greenScale:1.2,greenFriction:.73,contour:.045,sweetSpot:.19,timingSpeed:1.15,roughFactor:.78,slopeScale:.55,seedOffset:340},
  {id:'woodland',name:'Pinecrest',difficulty:'Club',level:2,biome:'woodland',tag:'Woodland golf',description:'Tree-lined doglegs, lake carries, and rolling greens. Club choice and clean contact both matter.',windScale:.86,widthScale:1,greenScale:1,greenFriction:.59,contour:.07,sweetSpot:.13,timingSpeed:1.4,roughFactor:.70,slopeScale:.85,seedOffset:0},
  {id:'ridge',name:'Granite Highlands',difficulty:'Tour',level:3,biome:'ridge',tag:'Mountain golf',description:'Elevated greens, steep approaches, rocky ridges, and stronger crosswinds. Plan each landing area.',windScale:1.13,widthScale:.94,greenScale:.94,greenFriction:.52,contour:.085,sweetSpot:.10,timingSpeed:1.55,roughFactor:.66,slopeScale:1.05,seedOffset:620},
  {id:'links',name:'Atlantic Links',difficulty:'Championship',level:4,biome:'links',tag:'Coastal golf',description:'Exposed dunes, firm fairways, deep bunkers, and fast greens. The narrowest timing window of the four courses.',windScale:1.45,widthScale:.91,greenScale:.94,greenFriction:.46,contour:.075,sweetSpot:.075,timingSpeed:1.7,roughFactor:.62,slopeScale:1.1,seedOffset:980}
];
export const COURSES=CONFIGS.map(cfg=>{
  const holes=ORIGINAL.map((source,i)=>{
    const c=structuredClone(source),variant=cfg.id!=='woodland',stretch=variant?STRETCH[cfg.id][i]:1,bend=variant?BENDS[cfg.id][i]:0,finish=variant?FINISH[cfg.id][i]:0,len=Math.abs(source.pin[1]);
    const transform=([x,z])=>{const u=clamp(-z/len,0,1.2);return [clamp(x*.94+Math.sin(u*Math.PI)*bend+u*finish,-98,98),z*stretch];};
    c.pin=variant?transform(source.pin):[...source.pin];c.path=variant?source.path.map(transform):source.path.map(p=>[...p]);c.centerline=smooth(c.path);
    c.sand=source.sand.map(s=>[...(variant?transform(s):s.slice(0,2)),s[2]*(cfg.id==='park'?.83:cfg.id==='links'?1.08:1),s[3]*stretch]);
    c.water=source.water.map(w=>[...(variant?transform(w):w.slice(0,2)),w[2]*(cfg.id==='park'?.85:1),w[3]*stretch]);
    if(cfg.id==='park'&&i%3===0)c.sand=c.sand.slice(0,2);
    if(cfg.id==='links'&&i%3===1&&!c.island){const p=c.path[Math.floor(c.path.length/2)];c.sand.push([p[0]+c.width*.7,p[1]-24,7,14]);}
    c.name=variant?NAMES[cfg.id][i]:c.name;c.id=cfg.id+'-'+(i+1);c.seed+=cfg.seedOffset;c.biome=cfg.biome;c.courseId=cfg.id;c.level=cfg.level;
    c.width*=cfg.widthScale;c.greenRadius*=cfg.greenScale;c.wind=source.wind.map((v,j)=>v*cfg.windScale*(variant?(j===0?(i%2?-.92:1.06):1):1));
    c.elevation=cfg.id==='park'?source.elevation*.4:cfg.id==='ridge'?source.elevation*1.4+(i%2?6:11):cfg.id==='links'?source.elevation*.3:source.elevation;
    c.slope=source.slope.map(v=>v*cfg.slopeScale);c.greenFriction=cfg.greenFriction;c.contour=cfg.contour;c.sweetSpot=cfg.sweetSpot;c.timingSpeed=cfg.timingSpeed;c.roughFactor=cfg.roughFactor;
    if(variant)c.tip=cfg.id==='park'?(c.water.length?'Choose enough club to carry the water. Favor the wider side of the green.':'Use the open fairway to set up a comfortable approach.'):
      cfg.id==='ridge'?(c.elevation>8?'Check the elevation change before choosing a club for the uphill approach.':'Allow for the slope and leave your approach below the pin.'):
      c.wind[1]>0?'A headwind reduces carry. Avoid the deep bunkers guarding the landing area.':'Watch the crosswind and allow extra room for the ball to release.';
    return c;
  });
  return {...cfg,holes,par:holes.reduce((s,h)=>s+h.par,0)};
});
export const TOTAL_HOLES=COURSES.reduce((n,c)=>n+c.holes.length,0);
