import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url),out=new URL('dist/',root);await fs.rm(out,{recursive:true,force:true});await fs.mkdir(new URL('server/',out),{recursive:true});await fs.mkdir(new URL('.openai/',out),{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};const assets={};
for(const file of await fs.readdir(new URL('web/',root))){if(file.startsWith('.'))continue;const ext=file.slice(file.lastIndexOf('.'));if(!types[ext])throw Error('Unexpected public asset '+file);assets['/'+file]={type:types[ext],body:await fs.readFile(new URL('web/'+file,root),'utf8')};}
await fs.writeFile(new URL('server/assets.js',out),'export const ASSETS='+JSON.stringify(assets)+';\n');
await fs.copyFile(new URL('worker/index.js',root),new URL('server/index.js',out));await fs.copyFile(new URL('web/progression.js',root),new URL('server/progression.js',out));await fs.copyFile(new URL('.openai/hosting.json',root),new URL('.openai/hosting.json',out));await fs.cp(new URL('drizzle/',root),new URL('.openai/drizzle/',out),{recursive:true});
await fs.copyFile(new URL('worker/auth.js',root),new URL('server/auth.js',out));await fs.copyFile(new URL('web/character.js',root),new URL('server/character.js',out));
const module=await import(new URL('server/index.js',out));if(typeof module.default?.fetch!=='function')throw Error('Worker fetch entrypoint missing');console.log('Built golf game, saved progression API, and migrations.');
