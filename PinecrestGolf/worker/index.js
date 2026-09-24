import {authRequest,sessionAccount,cookie,randomToken,digest} from './auth.js';
import {validAppearance} from './character.js';
import {ASSETS} from './assets.js';
import {holeReward,CLUB_IDS,UPGRADE_COSTS} from './progression.js';
const PARS=[4,3,5,4,3,5,4,4,4,4,3,5,4,4,3,5,4,4];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function db(env){if(!env.DB)throw Error('Progress storage is unavailable.');return env.DB;}
async function courseProgress(env,user){
 const rows=await db(env).prepare("SELECT r.course,SUM(h.strokes) AS total FROM rounds r JOIN round_holes h ON h.round_id=r.id WHERE r.user_id=? AND r.status='complete' AND r.mode='full' GROUP BY r.id HAVING COUNT(DISTINCT h.hole)=18 AND MIN(h.hole)=0 AND MAX(h.hole)=17").bind(user).all();
 const best={};for(const r of rows.results)best[r.course]=Math.min(best[r.course]??Infinity,r.total);
 const unlocked=[0,1,2,3];for(let i=4;i<8;i++){const required=[2,3,...Array.from({length:i-4},(_,n)=>n+4)];if(required.every(c=>best[c]<=72))unlocked.push(i);}
 return {courseBest:best,unlockedCourses:unlocked};
}
async function profile(env,user){const row=await db(env).prepare('SELECT tokens,club_levels,holes,rounds,display_name,appearance,onboarded FROM players WHERE user_id=?').bind(user).first();return {...await courseProgress(env,user),displayName:row?.display_name||'Golfer',appearance:JSON.parse(row?.appearance||'{}'),onboarded:Boolean(row?.onboarded),tokens:row?.tokens||0,clubLevels:JSON.parse(row?.club_levels||'{}'),holes:row?.holes||0,rounds:row?.rounds||0};}
async function currentRound(env,user){const row=await db(env).prepare("SELECT id,course,mode,next_hole,end_hole,status FROM rounds WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(user).first();if(!row)return null;const saved=await db(env).prepare('SELECT hole,strokes FROM round_holes WHERE round_id=? ORDER BY hole').bind(row.id).all();return {...row,scores:saved.results};}
async function ensurePlayer(env,user){await db(env).prepare('INSERT OR IGNORE INTO players(user_id) VALUES(?)').bind(user).run();}
async function handle(request,env,user,account=null){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/')){const asset=ASSETS[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});}
 if(!user)return json({error:'Reload the game to start a guest career.'},401);
 if(request.method!=='GET'){const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Invalid request origin.'},403);if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Use JSON for this request.'},415);}
 try{
  if(path==='/api/profile'&&request.method==='GET')return json({profile:await profile(env,user),round:await currentRound(env,user),guest:!account&&user.startsWith('guest:'),account:account?{email:account.email}:null});
  if(path==='/api/customize'&&request.method==='POST'){
   const b=await request.json(),name=String(b.displayName||'').trim();if(name.length<2||name.length>24||!validAppearance(b.appearance))return json({error:'Choose a golfer name with 2 to 24 characters and valid colors.'},400);
   await ensurePlayer(env,user);await db(env).prepare('UPDATE players SET display_name=?,appearance=? WHERE user_id=?').bind(name,JSON.stringify(b.appearance),user).run();return json({profile:await profile(env,user)});
  }
  if(path==='/api/onboarding'&&request.method==='POST'){await ensurePlayer(env,user);await db(env).prepare('UPDATE players SET onboarded=1 WHERE user_id=?').bind(user).run();return json({profile:await profile(env,user)});}
  if(path==='/api/records'&&request.method==='GET'){
   const rows=await db(env).prepare("WITH totals AS (SELECT r.course,r.mode,r.user_id,SUM(h.strokes) AS strokes FROM rounds r JOIN round_holes h ON h.round_id=r.id WHERE r.status='complete' GROUP BY r.id HAVING COUNT(h.hole)=CASE WHEN r.mode='full' THEN 18 ELSE 9 END), best AS (SELECT course,mode,user_id,MIN(strokes) AS strokes FROM totals GROUP BY course,mode,user_id), ranked AS (SELECT b.*,p.display_name,ROW_NUMBER() OVER(PARTITION BY b.course,b.mode ORDER BY b.strokes,b.user_id) AS place FROM best b JOIN players p ON p.user_id=b.user_id) SELECT * FROM ranked WHERE place<=5 OR user_id=? ORDER BY strokes,place").bind(user).all();
   const records=[];for(let course=0;course<8;course++)for(const mode of ['front','back','full']){const list=rows.results.filter(r=>r.course===course&&r.mode===mode),seen=new Set(),leaders=[];for(const r of list){if(seen.has(r.user_id))continue;seen.add(r.user_id);leaders.push({name:r.display_name,strokes:r.strokes});if(leaders.length===5)break;}const own=list.find(r=>r.user_id===user);records.push({course,mode,leaders,personal:own?.strokes??null});}return json({records});
  }
  if(path==='/api/upgrade'&&request.method==='POST'){
   const body=await request.json();if(!CLUB_IDS.includes(body.clubId)||!Number.isInteger(body.expectedLevel)||body.expectedLevel<0||body.expectedLevel>=4)return json({error:'Choose a club with an available upgrade.'},400);
   await ensurePlayer(env,user);const cost=UPGRADE_COSTS[body.expectedLevel],key='$.'+body.clubId;
   const result=await db(env).prepare('UPDATE players SET tokens=tokens-?,club_levels=json_set(club_levels,?,?) WHERE user_id=? AND tokens>=? AND COALESCE(json_extract(club_levels,?),0)=?').bind(cost,key,body.expectedLevel+1,user,cost,key,body.expectedLevel).run();
   const p=await profile(env,user);if(!result.meta?.changes)return json({error:'Your balance or club level changed. Your bag has been refreshed.',profile:p},409);
   return json({profile:p,spent:cost,clubId:body.clubId});
  }
  if(path==='/api/rounds'&&request.method==='POST'){
   const b=await request.json();if(!Number.isInteger(b.course)||b.course<0||b.course>7||!['front','back','full'].includes(b.mode))return json({error:'Choose a course and round length.'},400);
   const progress=await courseProgress(env,user);if(!progress.unlockedCourses.includes(b.course))return json({error:'Course locked. Finish the required 18 hole rounds in 72 strokes or fewer.'},403);
   const id=crypto.randomUUID(),start=b.mode==='back'?9:0,end=b.mode==='front'?8:17;await ensurePlayer(env,user);
   await db(env).batch([db(env).prepare("UPDATE rounds SET status='closed' WHERE user_id=? AND status='active'").bind(user),db(env).prepare('INSERT INTO rounds(id,user_id,course,mode,next_hole,end_hole,status,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,user,b.course,b.mode,start,end,'active',Date.now())]);return json({round:await currentRound(env,user),profile:await profile(env,user)});
  }
  const match=path.match(/^\/api\/rounds\/([a-f0-9-]{36})\/holes$/);
  if(match&&request.method==='POST'){
   const b=await request.json(),id=match[1];if(!Number.isInteger(b.hole)||b.hole<0||b.hole>17||!Number.isInteger(b.strokes)||b.strokes<1||b.strokes>13)return json({error:'Invalid hole score.'},400);
   const round=await db(env).prepare('SELECT * FROM rounds WHERE id=? AND user_id=?').bind(id,user).first();if(!round)return json({error:'Round not found.'},404);
   const existing=await db(env).prepare('SELECT strokes,tokens FROM round_holes WHERE round_id=? AND hole=?').bind(id,b.hole).first();if(existing)return json({profile:await profile(env,user),earned:existing.tokens,duplicate:true,round:await currentRound(env,user)});
   if(round.status!=='active'||b.hole!==round.next_hole)return json({error:'Finish the current hole before moving on.'},409);
   const receipt=crypto.randomUUID(),done=b.hole===round.end_hole,bonus=done?(round.mode==='full'?20:8):0,earned=holeReward(b.strokes,PARS[b.hole],round.course+1)+bonus;
   await db(env).batch([
    db(env).prepare('INSERT OR IGNORE INTO round_holes(round_id,hole,strokes,xp,tokens,receipt) VALUES(?,?,?,?,?,?)').bind(id,b.hole,b.strokes,0,earned,receipt),
    db(env).prepare('UPDATE players SET tokens=tokens+?,holes=holes+1,rounds=rounds+? WHERE user_id=? AND EXISTS(SELECT 1 FROM round_holes WHERE round_id=? AND hole=? AND receipt=?)').bind(earned,done?1:0,user,id,b.hole,receipt),
    db(env).prepare('UPDATE rounds SET next_hole=?,status=? WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM round_holes WHERE round_id=? AND hole=? AND receipt=?)').bind(b.hole+1,done?'complete':'active',id,user,id,b.hole,receipt)
   ]);
   return json({profile:await profile(env,user),earned,roundBonus:bonus,round:await currentRound(env,user)});
  }
  return json({error:'Not found.'},404);
 }catch(error){console.error('Golf progress request failed',error);return json({error:'Progress could not be saved. Please retry.'},503);}
 }
const COOKIE='__Host-pinecrest_guest';
export default {async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return handle(request,env,null);
 let account=await sessionAccount(request,env),user=account?.player_id||request.headers.get('oai-authenticated-user-id'),token=null,fresh=false;
 if(!user){
  token=cookie(request,COOKIE);
  if(/^[a-f0-9]{64}$/.test(token||'')){user='guest:'+await digest(token);if(await env.DB.prepare('SELECT id FROM accounts WHERE player_id=?').bind(user).first()){user=null;token=null;}}
  if(!user){
   if(url.pathname!=='/api/profile'||request.method!=='GET'){
    if(url.pathname.startsWith('/api/auth/'))return authRequest(request,env,null,account);
    return json({error:'Reload the game to start a guest career.'},401);
   }
   token=randomToken();fresh=true;user='guest:'+await digest(token);
  }
 }
 if(url.pathname.startsWith('/api/auth/'))return authRequest(request,env,user,account);
 const response=await handle(request,env,user,account);
 if(fresh&&response.ok){const headers=new Headers(response.headers);headers.append('set-cookie',COOKIE+'='+token+'; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax');return new Response(response.body,{status:response.status,headers});}
 return response;
}};
