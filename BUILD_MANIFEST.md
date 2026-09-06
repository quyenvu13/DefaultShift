# DefaultShift build manifest

## Project identity

- Product: DefaultShift
- Intelligent Contract: DefaultPolarityGuard v1.3
- StudioNet Project address: `0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`
- Website: `https://default-shift.vercel.app`
- Frozen contract SHA256: `1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

## Build gates executed

- Python contract compile: PASS
- Contract source parity: PASS
- Frontend/contract static integration checks: PASS
- Node tests: PASS
- Contract regression checks: PASS
- JavaScript syntax checks: PASS
- `npm run build`: PASS
- Public hygiene scan: PASS
- Vercel publish configuration: PASS (`npm run build` → `dist`)

The generated `dist/` directory is deleted after the successful production build and is not part of the public package.

## Executed Project runtime

Runtime Project verification was executed through the deployed frontend against the address above:

- clause creation: PASS
- fresh `DEFAULT_PRESERVED` → activated v2: PASS
- fresh `DEFAULT_FLIPPED` → blocked, active remained v2: PASS
- exact cached `DEFAULT_FLIPPED` reuse → cache hit, fresh semantic eval count unchanged: PASS
- StudioNet Explorer transaction list: all Project writes `FINALIZED`, GenVM `SUCCESS`, consensus `Accepted`: PASS
- frontend matching post-state / attempt-history reads: PASS

The Project is runtime-final. Contract logic remains frozen.
