import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const expected='1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09'
const data=readFileSync(new URL('../contracts/DefaultPolarityGuard.py', import.meta.url))
const actual=createHash('sha256').update(data).digest('hex')
if(actual!==expected) throw new Error(`Contract source mismatch\nexpected ${expected}\nactual   ${actual}`)
console.log(`SOURCE PARITY PASS ${actual}`)
