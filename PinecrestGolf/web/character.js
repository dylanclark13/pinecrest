export const PALETTES={
 skin:['#f0c7a5','#d6a17b','#b87850','#925e3c','#70442d','#4c3024'],
 shirt:['#e3e8d1','#386b8d','#9e443b','#e2b852','#695180','#264f41'],
 pants:['#1f303d','#d1c4a5','#56604d','#353439'],
 cap:['#85291f','#254b67','#dfdcc9','#252f29','#75578f','#c6983b']
};
export const DEFAULT_LOOK={skin:2,shirt:0,pants:0,cap:0,hat:true};
export function validAppearance(a){return a&&typeof a==='object'&&Object.keys(PALETTES).every(k=>Number.isInteger(a[k])&&a[k]>=0&&a[k]<PALETTES[k].length)&&typeof a.hat==='boolean';}
export function lookColors(a={}){const look={...DEFAULT_LOOK,...a};return {...Object.fromEntries(Object.entries(PALETTES).map(([key,colors])=>{const hex=colors[look[key]]||colors[0];return [key,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)];})),hat:look.hat};}
