# DefaultShift build manifest

## Project identity

- Product: DefaultShift
- Intelligent Contract: DefaultPolarityGuard v1.3
- StudioNet Project address: `0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`
- Frozen contract SHA256: `1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

## Build gates executed

- Python contract compile: PASS
- Contract source parity: PASS
- Frontend/contract static integration checks: PASS
- Node tests: 6/6 PASS
- Contract regression checks: 8/8 PASS
- JavaScript syntax checks: PASS
- `npm run build`: PASS
- Local static serving: PASS
- Public hygiene scan: PASS
- Vercel publish configuration: PASS (`npm run build` → `dist`)

The generated `dist/` directory was deleted after the successful production build and is not part of the public package. Vercel is explicitly configured to run `npm run build` and publish `dist`; the app uses hash routing, so no catch-all rewrite is required.

## Runtime state

This package is **runtime-ready**, not runtime-final. The Project address is fresh and the package does not claim executed Project runtime evidence yet. After GitHub/Vercel deployment, representative `DEFAULT_PRESERVED` and `DEFAULT_FLIPPED` frontend transactions must be executed and verified before submission-final documentation is produced.
