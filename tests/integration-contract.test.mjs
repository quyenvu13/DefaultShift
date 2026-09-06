import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs'
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'); const gl=readFileSync(new URL('../src/genlayer.js',import.meta.url),'utf8')
test('Project address is bound',()=>assert.match(gl,/0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E/))
test('write success requires finalized execution evidence and post-state',()=>{assert.match(gl,/TransactionStatus\.FINALIZED/);assert.match(app,/executionOutcome\(receipt\)/);assert.match(app,/expected attempt_count postcondition/);assert.match(app,/expected clause was not found/)})
test('forms are not prefilled with demo runtime content',()=>{assert.doesNotMatch(app,/value="A 30-day trial/);assert.doesNotMatch(app,/value="Trial access stops/)})
test('owner gate is rendered from on-chain owner',()=>{assert.match(app,/Only the on-chain clause owner may propose a rewrite/);assert.match(app,/isOwner\(\)/)})
test('verification reflects executed Project runtime evidence',()=>{assert.match(app,/Runtime verified on StudioNet/);assert.match(app,/DEFAULT_PRESERVED activation, DEFAULT_FLIPPED blocking, and exact cache reuse/)})
