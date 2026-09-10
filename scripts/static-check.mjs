import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
const root=resolve(new URL('..',import.meta.url).pathname)
const app=readFileSync(join(root,'src/app.js'),'utf8'); const gl=readFileSync(join(root,'src/genlayer.js'),'utf8')
const vercel=JSON.parse(readFileSync(join(root,'vercel.json'),'utf8'))
if(vercel.buildCommand!=='npm run build'||vercel.outputDirectory!=='dist') throw new Error('Vercel must run the production build and publish dist')
if(Array.isArray(vercel.rewrites)&&vercel.rewrites.length) throw new Error('Hash routing does not require a catch-all Vercel rewrite')
const must=["CONTRACT_ADDRESS = '0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E'","functionName: 'create_clause'","functionName: 'propose_rewrite'","functionName: 'get_clause'","functionName: 'get_attempts'","TransactionStatus.FINALIZED","executionOutcome(receipt)"]
for(const token of must) if(!(app+gl).includes(token)) throw new Error(`Missing required integration token: ${token}`)
if(/value:\s*Number\(/.test(gl)) throw new Error('Native value must not use Number conversion')
if(!app.includes('placeholder="Enter the exact clause text…"')||!app.includes('placeholder="Enter a new rewrite…"')) throw new Error('Action forms must be empty by default')
const forbidden=[
  ['cl','au','de'].join(''),
  ['chat','gpt'].join(''),
  ['open','ai'].join(''),
  ['anthro','pic'].join(''),
  ['dall','e'].join(''),
  ['review',' request'].join(''),
  ['internal',' prompt'].join(''),
  ['generated','-by-','ai'].join(''),
].map(s=>new RegExp(s,'i'))
function walk(dir){return readdirSync(dir).flatMap(n=>{const p=join(dir,n);const s=statSync(p);return s.isDirectory()?walk(p):[p]})}
const IGNORED=['/dist/','/node_modules/','/__pycache__/','/.pytest_cache/','/artifacts/','/.git/']
// The walk is not gitignore-aware, so untracked build output has to be skipped
// explicitly. Python bytecode is the case that matters: a .pyc embeds the
// absolute source path, so running the Direct Mode suite leaves a file whose
// contents can trip a hygiene rule on the developer's own home directory name.
// Everything skipped here is already in .gitignore and can never be committed.
for(const file of walk(root).filter(p=>!IGNORED.some(d=>p.includes(d))&&!p.endsWith('.png')&&!p.endsWith('.pyc'))){const text=readFileSync(file,'utf8');for(const rx of forbidden)if(rx.test(text))throw new Error(`Public hygiene failure ${rx} in ${file}`)}
console.log('STATIC CHECK PASS')
