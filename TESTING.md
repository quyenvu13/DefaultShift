# DefaultShift testing

## Frozen contract source

SHA256:

`1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09`

Project address:

`0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E`

## Pre-build gates

The frozen Intelligent Contract previously passed its dedicated compile, regression, mutation, baseline-restoration, exact-cache-reuse, cross-clause-isolation, and owner-boundary checks. This Project package independently verifies exact source parity and frontend/contract integration invariants.

Run:

```bash
npm run verify:source
npm run check
npm test
npm run build
```

## Required Project runtime smoke test

The fresh Project deployment must be tested after frontend deployment. Do not infer these results from the earlier Intelligent Contract test address.

Representative flow:

1. Create a clause from the owner wallet.
2. Inspect the created clause from accepted state.
3. Submit a clearly `DEFAULT_PRESERVED` rewrite and verify:
   - transaction reaches FINALIZED;
   - GenVM execution reports success/return;
   - post-state increments `attempt_count`;
   - a new version is activated;
   - recorded attempt verdict is `DEFAULT_PRESERVED`.
4. Submit a clearly `DEFAULT_FLIPPED` rewrite and verify:
   - transaction reaches FINALIZED;
   - GenVM execution reports success/return;
   - active version remains unchanged;
   - `default_flip_blocks` increments;
   - recorded attempt verdict is `DEFAULT_FLIPPED`.
5. Submit an exact cached rewrite and verify `used_cache=true` and no fresh `semantic_eval_count` increment.
6. Re-read all postconditions from the contract. Never treat FINALIZED alone as execution success.

Until those transactions are executed on the Project address, the public UI labels the deployment as ready for smoke testing rather than claiming Project runtime PASS.
