# DefaultShift

DefaultShift is a GenLayer application for one narrow rewrite invariant: **if nobody takes any additional affirmative action, does a proposed rewrite preserve the same operational default outcome as the clause's immutable version-1 baseline?**

- `DEFAULT_PRESERVED` → the contract appends a new version and activates it.
- `DEFAULT_FLIPPED` → the contract does not create/activate a version and increments the clause's block counter.

Validators classify only that bounded semantic question. Ownership, immutable baseline binding, cross-clause cache isolation, semantic-evaluation budget, version/attempt limits, activation, blocking, counters, and history are deterministic contract logic.

## StudioNet

- Project deployment: `0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`
- Intelligent Contract: `contracts/DefaultPolarityGuard.py`
- Exact source SHA256: `1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

The Project deployment is intentionally fresh. Runtime Project evidence is added only after executed frontend cases are run against this address.

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

## Commands

```bash
npm run verify:source
npm run check
npm test
npm run build
```

`dist/` is generated locally and is intentionally excluded from the public package.
