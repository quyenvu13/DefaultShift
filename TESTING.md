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

`npm run check`, `npm test` and `npm run verify:source` verify exact contract
source parity and frontend/contract integration invariants. They are **static**:
they hash the contract and match strings in the source. They do not execute the
contract, and nothing in this section should be read as behavioural proof.

## Contract behaviour, executed on real GenVM

```bash
pip install "genlayer-test==0.29.2" "pytest>=8,<9"
python -m pytest tests/direct/ -q
```

```text
15 passed
```

`genlayer-test` Direct Mode runs `contracts/DefaultPolarityGuard.py` inside a
real GenVM build. Nothing is stubbed and no contract logic is re-implemented, so
the suite cannot drift from the deployed source. `tests/direct/conftest.py` pins
the GenVM version, so a clean machine executes the same runtime instead of
resolving "latest".

`test_clause_lifecycle.py` executes the same sequence recorded under
**Executed StudioNet Project runtime** below — creation, a fresh
`DEFAULT_PRESERVED` activation, a fresh `DEFAULT_FLIPPED` block, and exact cached
reuse — and asserts the same counters the live run produced. It also proves the
two properties the design rests on: every candidate is compared to the immutable
version-1 baseline even after the active version has moved on, and a verdict
cached for one clause is never reused for another clause that happens to share
the same baseline text.

`test_guards.py` covers what the contract refuses. Six malformed consensus
outputs — unknown verdict, extra key, wrong type, wrong key, non-JSON, non-object
— each revert with no attempt written, no budget spent and no version added. A
rewrite byte-identical to the active text is refused, including one that differs
only by surrounding whitespace. The eight-evaluation budget is exercised to
exhaustion: a ninth fresh candidate is refused and writes nothing, while a
previously cached candidate still resolves, so the clause is bounded rather than
frozen. Restoration to the version-1 baseline resolves from the seeded cache and
spends no budget. Finally, clause text carrying a forged fence tag and an
embedded verdict token cannot reach the model as instructions, and the stored
text is kept exact.

The model answer in these tests comes from `mock_llm`; the suite never invents a
consensus outcome, it states one and checks what the contract does with it.

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
