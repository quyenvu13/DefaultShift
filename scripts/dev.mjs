import http from 'node:http'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
const root = resolve(new URL('..', import.meta.url).pathname); const port = Number(process.env.PORT || 4173)
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}
http.createServer((req,res)=>{ let path=(req.url||'/').split('?')[0]; if(path==='/'||!extname(path)) path='/index.html'; const file=join(root,path); if(!existsSync(file)||statSync(file).isDirectory()){res.writeHead(404);return res.end('Not found')} res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(readFileSync(file))}).listen(port,()=>console.log(`DefaultShift dev server http://localhost:${port}`))
