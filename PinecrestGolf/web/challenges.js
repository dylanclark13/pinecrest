export function medal(score){return score==null?null:score<=72?'Gold':score<=81?'Silver':score<=90?'Bronze':null;}
export function unlockedCourses(best){const list=[0,1,2,3];for(let c=4;c<8;c++)if(list.includes(c-1)&&best[c-1]<=90)list.push(c);return list;}
export function dailyChallenge(day=new Date().toISOString().slice(0,10)){
 const n=Math.floor(Date.parse(day+'T00:00:00Z')/86400000),course=((n%4)+4)%4,start=((n*7)%16+16)%16;
 return {day,course,start,end:start+2,wind:[Math.sin(n*.7)*3,Math.cos(n*.9)*3],label:'Three holes · Same wind for everyone · Resets at 00:00 UTC'};
}
export function dailyHole(h,challenge){return {...h,wind:[...challenge.wind],gust:0};}
