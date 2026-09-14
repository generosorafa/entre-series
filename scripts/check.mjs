import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const name of await readdir('public'))if(name.endsWith('.js'))execFileSync(process.execPath,['--check','public/'+name]);
for(const name of await readdir('worker'))if(name.endsWith('.js'))execFileSync(process.execPath,['--check','worker/'+name]);
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
for(const icon of manifest.icons)await readFile('public/'+icon.src);
const html=await readFile('public/index.html','utf8');
for(const name of await readdir('public'))if(name.endsWith('.html')){
 const page=await readFile('public/'+name,'utf8');
 for(const match of page.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g))await readFile('public/'+match[1]);
}
const sw=await readFile('public/sw.js','utf8');
for(const match of sw.matchAll(/'\.\/([^']+)'/g))await readFile('public/'+match[1]);
for(const name of ['app.js','timer.js','audio.js','push.js','config.js','sw.js','privacy.html'])await readFile('public/'+name);
if(!html.includes('viewport-fit=cover')||!html.includes('lang="pt-BR"'))throw new Error('Metadados ausentes');
console.log('Sintaxe, manifesto e referências locais válidos. Nenhuma dependência externa.');
