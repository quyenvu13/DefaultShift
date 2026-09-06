# DefaultShift testing

## Frozen contract source

SHA256:

`1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

Project address:

`0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`

Website:

`https://default-shift.vercel.app`

## Build and integration gates

Run:

```bash
npm run verify:source
npm run check
npm test
npm run build
```

The package verifies exact contract source parity and frontend/contract integration invariants. The frozen Intelligent Contract had already passed its dedicated compile, regression, mutation, immutable-baseline, exact-cache-reuse, cross-clause-isolation, restoration, and owner-boundary tests before this Project build.

## Executed StudioNet Project runtime

All cases below were executed through the deployed DefaultShift frontend against the Project address above. Application-level success was accepted only after transaction finalization, GenVM execution evidence, and matching accepted-state reads.

### Case P1 — clause creation

Baseline:

`A 30-day trial ends when the trial period expires. Continued service requires the customer to send a renewal request.`

Post-state for Clause #1:

- active version: 1
- versions: 1
- attempts: 0
- fresh semantic evals: 0/8
- flip blocks: 0

### Case P2 — fresh DEFAULT_PRESERVED

Rewrite:

`Trial access stops on day 30. To continue service after that date, the customer must submit a renewal request.`

Observed attempt #1:

- verdict: `DEFAULT_PRESERVED`
- fresh semantic eval
- activated version 2
- versions: 2
- attempts: 1
- fresh semantic evals: 1/8
- flip blocks: 0
- Explorer identifier: `0x01cc8235…16e152ef`

### Case P3 — fresh DEFAULT_FLIPPED

Rewrite:

`After day 30, the trial automatically converts to a paid subscription unless the customer sends a cancellation request.`

Observed attempt #2:

- verdict: `DEFAULT_FLIPPED`
- fresh semantic eval
- blocked
- active version remained 2
- versions remained 2
- attempts: 2
- fresh semantic evals: 2/8
- flip blocks: 1
- Explorer identifier: `0xa8476d5a…204dc5e1`

### Case P4 — exact cached verdict reuse

The exact P3 rewrite was submitted again.

Observed attempt #3:

- verdict: `DEFAULT_FLIPPED`
- cache hit
- blocked
- active version remained 2
- versions remained 2
- attempts: 3
- fresh semantic evals stayed 2/8
- flip blocks: 2
- Explorer identifier: `0x5b84b44a…9f05619d`

This proves exact cached-verdict reuse does not consume another fresh semantic evaluation.

## Explorer checkpoint

The StudioNet contract page showed the Project deployment plus clause creation and all three `propose_rewrite` writes. Every listed write was `FINALIZED`, GenVM result `SUCCESS`, consensus result `Accepted`. The frontend separately displayed the recorded verdict/history and re-read state, so the runtime claim does not equate `FINALIZED` with successful execution.

## Final state after representative Project flow

Clause #1:

- immutable baseline: v1 original text
- active: v2 preserved rewrite
- versions: 2
- attempts: 3
- fresh semantic evals: 2/8
- flip blocks: 2

No native GEN transfer is part of this primitive; the tested writes used the contract's semantic classification and deterministic on-chain version/block consequences.
