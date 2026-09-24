const SESSION='__Host-pinecrest_session',AGE=30*24*60*60;
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
export const cookie=(request,name)=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
const result=(body,status=200,cookies=[])=>{const headers=new Headers({'content-type':'application/json','cache-control':'no-store'});for(const c of cookies)headers.append('set-cookie',c);return new Response(JSON.stringify(body),{status,headers});};
const sessionCookie=(token,age=AGE)=>SESSION+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
export async function sessionAccount(request,env){const token=cookie(request,SESSION);if(!/^[a-f0-9]{64}$/.test(token||''))return null;return env.DB.prepare('SELECT a.id,a.email,a.player_id FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first();}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
function equal(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function limited(request,env,email){const now=Date.now(),ip=request.headers.get('cf-connecting-ip')||'unknown',keys=['ip:'+await digest(ip),'email:'+await digest(email)];for(const [i,key]of keys.entries()){await env.DB.prepare('INSERT INTO auth_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END').bind(key,now+900000,now,now).run();const row=await env.DB.prepare('SELECT count FROM auth_limits WHERE key=?').bind(key).first();if(row.count>(i?8:30))return true;}return false;}
async function createSession(env,id){const token=randomToken();await env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(await digest(token),id,Date.now()+AGE*1000).run();return token;}
export async function authRequest(request,env,user,account){
 const path=new URL(request.url).pathname;if(request.method!=='POST')return result({error:'Use POST.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return result({error:'Invalid request origin.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return result({error:'Use JSON.'},415);
 try{
  if(path==='/api/auth/logout'){const token=cookie(request,SESSION);if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return result({ok:true},200,[sessionCookie('',0),'__Host-pinecrest_guest=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);}
  const body=await request.json(),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return result({error:'Enter a valid email and a password with 12 to 128 characters.'},400);
  if(await limited(request,env,email))return result({error:'Too many attempts. Please wait 15 minutes before trying again.'},429);
  if(path==='/api/auth/register'){
   if(!user||account)return result({error:'Start a guest career or sign out before creating an account.'},409);
   if(await env.DB.prepare('SELECT id FROM accounts WHERE email=? OR player_id=?').bind(email,user).first())return result({error:'Unable to create this account. Try signing in instead.'},409);
   const id=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(password,salt);
   await env.DB.prepare('INSERT OR IGNORE INTO players(user_id) VALUES(?)').bind(user).run();
   await env.DB.prepare('INSERT INTO accounts(id,email,player_id,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)').bind(id,email,user,hash,salt,Date.now()).run();
   return result({ok:true},200,[sessionCookie(await createSession(env,id)),'__Host-pinecrest_guest=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);
  }
  const found=await env.DB.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first();
  if(path==='/api/auth/delete'){
   if(!account||!found||account.id!==found.id)return result({error:'Sign in to the account you want to delete.'},403);
   const hash=await passwordHash(password,found.salt);
   if(!equal(hash,found.password_hash))return result({error:'Password is incorrect.'},401);
   await env.DB.batch([
    env.DB.prepare('DELETE FROM round_holes WHERE round_id IN (SELECT id FROM rounds WHERE user_id=?)').bind(found.player_id),
    env.DB.prepare('DELETE FROM rounds WHERE user_id=?').bind(found.player_id),
    env.DB.prepare('DELETE FROM daily_rewards WHERE user_id=?').bind(found.player_id),
    env.DB.prepare('DELETE FROM players WHERE user_id=?').bind(found.player_id),
    env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(found.id),
    env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(found.id),
    env.DB.prepare('DELETE FROM auth_limits WHERE key=?').bind('email:'+await digest(email))
   ]);
   return result({ok:true},200,[sessionCookie('',0),'__Host-pinecrest_guest=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);
  }
  if(path==='/api/auth/login'){
   const hash=await passwordHash(password,found?.salt||'unregistered-account-timing-salt');if(!found||!equal(hash,found.password_hash))return result({error:'Email or password is incorrect.'},401);
   return result({ok:true},200,[sessionCookie(await createSession(env,found.id))]);
  }
  return result({error:'Not found.'},404);
 }catch(error){console.error('Account request failed',error);return result({error:'Account request could not be completed. Please retry.'},503);}
}
