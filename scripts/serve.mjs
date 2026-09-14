import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const prefix='/entre-series';if(url.startsWith(prefix+'/'))url=url.slice(prefix.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(base,'.'+url);if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return}const bytes=await readFile(file);console.log(req.method,url);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(bytes)}catch{res.writeHead(404).end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173/'));
