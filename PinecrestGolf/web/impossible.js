// Standalone challenge geometry. Regular courses and tournament holes are untouched.
export function impossibleHole(){
 const path=[[0,0],[-15,-90],[-23,-230],[28,-315],[32,-455],[20,-620]];
 return {id:'the-gauntlet',courseId:'impossible',name:'The Gauntlet',par:5,biome:'links',level:10,seed:9407,
 pin:[20,-620],path,centerline:path.map(p=>[...p]),width:4.2,greenRadius:3.3,island:true,
 water:[[-5,-155,109,50],[4,-350,108,66],[20,-578,91,86]],
 sand:[[-33,-235,6,14],[-13,-243,5,11],[21,-460,6,13],[42,-450,5,15],[14,-622,2.1,3],[25.8,-618,2,3]],
 wind:[9,-3],gust:1,elevation:18,slope:[.025,.022],contour:.055,greenFriction:.38,sweetSpot:.032,timingSpeed:2.15,roughFactor:.38,
 tip:'Three forced carries. Land on the narrow shelves, then hold the tiny island green. Range Guide is off. Upgraded clubs recommended.'};
}
