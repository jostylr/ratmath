# Signed leading decimal Rational fix — October 17, 2026

The defect was `BigInt("-")` in the decimal-string constructor. `"-.5"`
split into whole part `"-"` and fractional digits `"5"`; the sign was known,
but converting the whole part threw before combining the fraction. The fix
uses `0n` for that whole part only when fractional digits are present. It
retains the sign and existing reduction, and still rejects `"-."`.

The same small change first passed in a copy of the experimental private-factory
fast core, then in a clean archive of committed production core, and was applied
to production. **Production core commit: `c081124`.** Performance optimizations
remain experimental. Existing local Integer/Rational exponentiation edits were
excluded from that commit.

## Validation

Bun 1.4.3; Node 26.12.0. All three unpatched snapshots reproduced the failure
in both runtimes. Full Bun suites before/after:

| Snapshot | Before | After |
|---|---:|---:|
| Current production worktree | 554 pass, 1 fail | 559 pass, 0 fail |
| Experimental fast core | 554 pass, 1 fail | 559 pass, 0 fail |
| Clean committed core (`b2554fb`) | 552 pass, 1 fail | 557 pass, 0 fail |

The worktree includes two independent, preexisting exponentiation tests, hence
the different totals. Four new regression tests cover signed/unsigned leading
decimals, whitespace, negative zero, explicit-zero equivalence at many fractional
scales, and malformed input rejection. Each fixed snapshot also passes 224
constructor equivalence cases plus eight malformed cases independently in Bun
and Node. The Node checks are constructor contracts, not the Bun-based full suite.

After installation, actual production passes **559 tests, 76,068 assertions,
zero failures**, about **1.31 seconds** in Bun, plus the same Bun/Node contracts.
See [snapshot test report](results/tests.json), [production report](results/production.json),
and the captured full test logs in `results/`. A [post-install recheck](results/post-install-recheck/tests.json)
also verifies that rebuilding an already-fixed production snapshot is idempotent.

## Reproduce

From the repository root, with the earlier integer-dispatch copies built:

```sh
node compiler-experiments/rational-decimal-fix/build.js
node compiler-experiments/rational-decimal-fix/tests.js
bun test --cwd packages/core ./tests
node compiler-experiments/rational-decimal-fix/contract.js packages/core
bun compiler-experiments/rational-decimal-fix/contract.js packages/core
```

The builder creates only its own ignored `tmp/` snapshots. It copies the live
production and experimental core without altering them; if they already have
the fix, their before phase is expected to pass. The clean archived baseline
is pinned to `b2554fb` so the original failure remains reproducible. Override
with `--core-ref=<ref>` if needed. `--root=<checkout>` selects the source checkout.
`patch.js` is idempotent and rejects unexpected decimal-conversion source.
`regression-test.txt` is the source of the regression module installed into each
copied core's tests, avoiding accidental collection as an experiment-local test.

Earlier benchmark reports, including the integer-dispatch parser failure, are
preserved as historical measurements. New integrated-core copies inherit the
production parser fix; rebuild the full dependent snapshot chain before using
its fingerprint checks against the changed production checkout.
