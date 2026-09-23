import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('PinecrestGolf/Game/',import.meta.url);
await fs.mkdir(out,{recursive:true});
for(const file of await fs.readdir(new URL('web/',root))){
 let text=await fs.readFile(new URL('web/'+file,root),'utf8');
 if(file==='style.css')text=text.replace(/^@import[^\n]*\n/,'')+'\n#game{height:100dvh;min-height:0}button,input{touch-action:manipulation}\n';
 if(file==='index.html')text=text.replace('<head>','<head>\n<meta http-equiv="Content-Security-Policy" content="default-src \'self\' pinecrest:; script-src \'self\' pinecrest:; style-src \'self\' pinecrest: \'unsafe-inline\'; img-src \'self\' pinecrest: data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'">').replace('Progress and rounds save after every hole.','Progress saves on this device after every hole.');
 if(file==='game.js')text="import './native.js';\n"+text.replaceAll('Career saved to your account.','Career saved on this device.').replace("playTone('hit');","playTone('hit');window.golfHaptic('hit');").replace("pendingScore=null;$('resultXP')","pendingScore=null;window.golfHaptic('hole');$('resultXP')");
 await fs.writeFile(new URL(file,out),text);
}
await fs.copyFile(new URL('PinecrestGolf/native.js',import.meta.url),new URL('native.js',out));
console.log('Bundled current golf game and native device career adapter.');
