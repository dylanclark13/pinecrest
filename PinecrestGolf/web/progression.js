export const TIERS=[
 {id:0,name:'Academy',level:1,distance:1,forgiveness:1,spin:.65,color:[.58,.64,.65],finish:'Brushed steel',description:'A complete starter bag. Learn your distances and earn your first upgrade.'},
 {id:1,name:'Club',level:2,distance:1.035,forgiveness:1.10,spin:.75,color:[.28,.57,.66],finish:'Blue titanium',description:'More carry and a wider contact window for consistent rounds.'},
 {id:2,name:'Forged',level:4,distance:1.07,forgiveness:1.18,spin:.86,color:[.75,.45,.28],finish:'Copper forged',description:'Improved wedge control and reliable shaping through the bag.'},
 {id:3,name:'Tour',level:7,distance:1.11,forgiveness:1.26,spin:.96,color:[.55,.43,.76],finish:'Tour graphite',description:'Longer woods, responsive irons, and stronger control around the green.'},
 {id:4,name:'Signature',level:10,distance:1.15,forgiveness:1.34,spin:1.08,color:[.84,.70,.34],finish:'Gold titanium',description:'Maximum distance, forgiveness, and spin control. Earned on the course.'}
];
export const CLUB_IDS=['driver','3wood','5wood','hybrid','5iron','6iron','7iron','8iron','9iron','pw','gw','sw','lw','putter'];
export const UPGRADE_COSTS=[150,400,900,1800];
export const clubLevel=(profile,id)=>Math.max(0,Math.min(4,Number(profile?.clubLevels?.[id])||0));
export function holeReward(strokes,par,difficulty=1){const delta=strokes-par;const bonus=strokes===1?12:delta<=-2?8:delta===-1?5:delta===0?3:delta===1?1:0;return Math.round((5+bonus)*(1+(difficulty-1)*.12));}
export function upgradeClub(club,tier){const t=TIERS[tier]||TIERS[0];return {...club,range:club.type==='putter'?club.range:Math.round(club.range*t.distance),tier:t.id,finish:t.color,forgiveness:t.forgiveness,spinControl:t.spin};}
