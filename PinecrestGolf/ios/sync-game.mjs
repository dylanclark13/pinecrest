import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('PinecrestGolf/Game/',import.meta.url);
await fs.mkdir(out,{recursive:true});
for(const file of await fs.readdir(new URL('web/',root))){
 let text=await fs.readFile(new URL('web/'+file,root),'utf8');
 if(file==='style.css')text=text.replace(/^@import[^\n]*\n/,'')+'\n#game{height:100dvh;min-height:0}button,input{touch-action:manipulation}\n';
 if(file==='support.html'){await fs.writeFile(new URL(file,out),'<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game help</title></head><body><h1>Game help</h1><p>Open Clubhouse, then Settings, for controller instructions, the tutorial and access to your online career.</p><p>For support contact information, open Online career and choose Support in its clubhouse footer.</p><a href="/index.html">Return to game</a></body></html>');continue;}
 if(file==='privacy.html'){await fs.writeFile(new URL(file,out),'<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Device career privacy</title></head><body><h1>Device career privacy</h1><p>Offline rounds, golfer preferences, statistics and tokens are saved in this app on your device. The offline game makes no network requests. Your device backup settings control whether app data is backed up.</p><p>Online career is optional and separate. Its privacy policy and support contact are available inside Online career.</p><a href="/index.html">Return to game</a></body></html>');continue;}
 if(file==='index.html')text=text.replace('<head>','<head>\n<meta http-equiv="Content-Security-Policy" content="default-src \'self\' pinecrest:; script-src \'self\' pinecrest:; style-src \'self\' pinecrest: \'unsafe-inline\'; img-src \'self\' pinecrest: data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'">').replace('Progress and rounds save after every hole.','Progress saves on this device after every hole.');
 if(file==='game.js')text="import './native.js';\n"+text.replaceAll('Career saved to your account.','Career saved on this device.').replace("playTone(actor.perfect?'pure':'hit');","playTone(actor.perfect?'pure':'hit');window.golfHaptic(actor.perfect?'perfect':'hit');").replace("pendingScore=null;$('resultXP')","pendingScore=null;window.golfHaptic('hole');$('resultXP')");
 if(file==='game.js'){
 text=text.replace('startHole(r.next_hole);showRoundNotice();','startHole(r.next_hole);restoreNativeCheckpoint(r.checkpoint);showRoundNotice();');
 text=text.replace('last=now;if(replay)', 'last=now;if(nativePaused){requestAnimationFrame(animate);return;}if(replay)');
 text=text.replace("if(phase==='accuracy'){commitStrike();return;}", "if(phase==='ready')nativeCheckpoint().catch(e=>window.webkit.messageHandlers.nativeError.postMessage(e.message));if(phase==='accuracy'){commitStrike();return;}");
 text=text.replaceAll('Guest progress is linked to this browser. Clearing cookies starts a new career.','Device career saves locally. Online accounts are separate.');
 text=text.replaceAll('Career saved to your account.','Career saved on this device.');
 text=text.replace('Completed rounds count toward course records, with separate front-nine, back-nine and full-round standings. Create an account to return to your career on another device.','Completed rounds count toward device records. Device careers save locally. Existing online accounts are available separately in the native Settings screen.');
 text += '\n'+await fs.readFile(new URL('native-game.js',import.meta.url),'utf8');
 }
 if(file==='style.css')text+='\n#accountButton,#saveProgressBanner,#onboardingAccountPrompt,#createAccountCTA,#signInCTA{display:none!important}\n';
 await fs.writeFile(new URL(file,out),text);
}
await fs.copyFile(new URL('PinecrestGolf/native.js',import.meta.url),new URL('native.js',out));
console.log('Bundled current golf game and native device career adapter.');
