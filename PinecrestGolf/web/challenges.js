export function medal(score){return score==null?null:score<=72?'Gold':score<=81?'Silver':score<=90?'Bronze':null;}
export function unlockedCourses(){return [0,1,2,3,4,5,6,7];}
export function dailyChallenge(day=new Date().toISOString().slice(0,10)){
 const n=Math.floor(Date.parse(day+'T00:00:00Z')/86400000),course=((n%4)+4)%4,start=((n*7)%16+16)%16;
 return {day,course,start,end:start+2,wind:[Math.sin(n*.7)*3,Math.cos(n*.9)*3],label:'Three holes · Same wind for everyone · Resets at 00:00 UTC'};
}
export function dailyHole(h,challenge){return {...h,wind:[...challenge.wind],gust:0};}
