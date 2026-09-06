# DefaultShift

DefaultShift is a GenLayer application for one narrow rewrite invariant: **if nobody takes any additional affirmative action, does a proposed rewrite preserve the same operational default outcome as the clause's immutable version-1 baseline?**

- `DEFAULT_PRESERVED` → the contract appends a new version and activates it.
- `DEFAULT_FLIPPED` → the contract does not create/activate a version and increments the clause's block counter.

Validators classify only that bounded semantic question. Ownership, immutable baseline binding, cross-clause cache isolation, semantic-evaluation budget, version/attempt limits, activation, blocking, counters, and history are deterministic contract logic.

## StudioNet

- Project deployment: `0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`
- Intelligent Contract: `contracts/DefaultPolarityGuard.py`
- Exact source SHA256: `1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

The Project deployment has been runtime-verified through the public frontend on StudioNet. The executed flow covered clause creation, a fresh `DEFAULT_PRESERVED` activation, a fresh `DEFAULT_FLIPPED` block, and exact cached-verdict reuse. The Explorer transaction list shows each Project write as `FINALIZED` with GenVM `SUCCESS`, while the frontend re-read matching contract post-state before presenting application-level success.

## Product flow

1. Connect a StudioNet wallet.
2. Create a clause. Version 1 becomes the immutable baseline.
3. Inspect an on-chain clause by ID.
4. The clause owner proposes a rewrite using an empty-by-default form.
5. The frontend waits for FINALIZED, checks GenVM execution evidence, then re-reads accepted state.
6. The UI renders the recorded verdict and deterministic consequence from contract state.

## Safety properties surfaced in the UI

- Every candidate is compared with immutable version 1, preventing sequential salami drift.
- Cached verdicts are scoped to a clause ID + baseline + rewrite, preventing cross-clause cache poisoning.
- A maximum of 8 fresh semantic evaluations per clause bounds stochastic rerolling.
- Malformed/provider/non-convergent execution cannot be promoted into a semantic verdict or state mutation.
- Only a clause owner can propose rewrites.
- `FINALIZED` alone is never displayed as application-level success.

## Executed Project runtime

On contract `0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`, the public frontend executed:

- Clause #1 creation from the owner wallet.
- Attempt #1: `DEFAULT_PRESERVED` → activated v2; versions 2, attempts 1, fresh semantic evals 1/8, flip blocks 0. Explorer identifier: `0x01cc8235…16e152ef`.
- Attempt #2: `DEFAULT_FLIPPED` → blocked; active remained v2; attempts 2, fresh semantic evals 2/8, flip blocks 1. Explorer identifier: `0xa8476d5a…204dc5e1`.
- Attempt #3: exact `DEFAULT_FLIPPED` rewrite reuse → cache hit; active remained v2; attempts 3, fresh semantic evals stayed 2/8, flip blocks 2. Explorer identifier: `0x5b84b44a…9f05619d`.

The StudioNet Explorer contract page showed all three `propose_rewrite` transactions as `FINALIZED`, GenVM `SUCCESS`, consensus `Accepted`. Runtime evidence is therefore not inferred from `FINALIZED` alone: each semantic consequence is matched to the frontend's accepted-state re-read and attempt history.

Website: `https://default-shift.vercel.app`

## Commands

```bash
npm run verify:source
npm run check
npm test
npm run build
```

`dist/` is generated locally and is intentionally excluded from the public package.
