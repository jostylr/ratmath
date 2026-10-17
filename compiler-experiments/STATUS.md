# Experiment status and production candidates — October 17, 2026

## Promoted now

`Rational("-.5")` parsing is fixed in experimental and production core. Core
commit **`c081124`** includes only the parser change, four regression tests and
changelog entries; unrelated local power edits remain unstaged. The production
worktree passes 559 core tests (76,068 assertions), while a clean committed-core
archive plus this fix passes 557. Bun and Node pass 224 constructor equivalence
cases plus malformed-input checks for each fixed snapshot.
[Reproduction and reports](rational-decimal-fix/README.md).

All performance changes below remain experimental. These are promotion
recommendations, not a request to merge them all at once. Ratios come from
specific kernels and are not additive or representative of every RiX program.

## Worth promoting in focused changes

| Change | Location | Evidence and readiness |
|---|---|---|
| Private canonical-result factory plus Rational fast paths | Core | Strong candidate: ordinary Rational-heavy RiX improved roughly 2–3×. Preserve reduced/positive-denominator invariants, custom/subclass fallback and certified-number dispatch. Promote the guarded arithmetic paths with differential/invariant tests; keep the unsafe construction capability private. |
| Explicit Integer floor division, floor modulo and divmod | Core, with separate RiX builtin wiring | Strong candidate: avoids constructing and reducing a Rational for integral quotients/remainders. Interpreted modular powers improved about 8.5× Bun / 15.9× Node when wired. Preserve exact `divide`, existing signed remainder, zero-divisor rules and RiX floor semantics; do not silently change existing API meanings. |
| Copy already-canonical Rationals with the existing copy constructor | RiX cell copying, not core | Strongest interpreter fix: profiles found 79–89% of growing-denominator Horner CPU in redundant copy normalization. Together with a guarded decimal-literal path, improvements were 2.9–9.8× Bun / 6.0–16.1× Node. Keep fresh object identity, metadata and overridden-getter behavior. |
| Decimal Integer literal path | RiX interpreter | Useful small simplification with general parser fallback and fresh value allocation. Benchmark/source tests cover number syntax and object semantics; not a reason to cache mutable literal objects. |
| Bounded method-name spelling cache | RiX method resolution | Best recent dispatch candidate: Integer Horner about 1.15× Bun / 1.22× Node in its isolated variant. Cache only spelling candidates; all live method/prototype/extension resolution must still run. |

Core optimizations passed full suites and broad differential tests in the
experiments. Production promotion still needs dedicated review across the
library's full supported API and current branch. Broadly publishing all helper
symbols/prototypes used by the prototypes is not recommended.

## Useful opt-in services, with more design work

- **Exact polynomial/batch kernels:** moving a complete Horner loop into core
  produced large gains over the original RiX loop, including roughly 13–23×
  on the tested Rational cases. This is a useful optional service that RiX can
  invoke while keeping source-level exploration and orchestration. Resolve
  dynamic coefficients explicitly and retain custom/interval fallback.
- **Fused reduced-pair intermediates:** about 10–12% extra on one Rational
  fixture, only 1–2% on the larger one, and not consistently better for
  Integers. Start with a maintainable method-based batch operation; fuse only
  when a measured workload warrants it. Do not delay normalization by default.
- **Marked BigInt JS / native GMP kernels:** valuable for large, homogeneous
  exact computations with coarse calls and cached setup. The experiments show
  that compilation can remove interpreter costs and that algorithms matter
  at least as much as backends. Keep explicit eligibility, input guards,
  fallback, resource limits and compilation/amortization accounting. These
  prototypes are not a general production compiler or browser replacement.

## Not worth promoting as blanket changes

Generic dispatch allocation changes alone are inconsistent: most measured
ratios were around 0.95–1.11×. Guarded Integer comparisons add modest gains but
still probe every installed operator variant. Promote only after a simpler
standalone patch demonstrates value. The combined Integer Horner improvement
is about 1.23× Bun / 1.25× Node, far from removing interpreter overhead.

Do not replace exact arithmetic with Number, enable unchecked bounded Wasm for
arbitrary integers, cache selected custom operators/methods without an invalidation
model, or automatically reassociate arithmetic with interval/custom operands.
Fused arithmetic and compilation are not automatically faster for every domain.

## Where substantial slowness remains

Cheap Integer loops still spend most time evaluating IR, probing multifunction
variants, resolving methods, handling scopes/cells and copying arguments. The
latest optimizations reduce allocations while retaining that machinery. Complete
pure loops and batch operations remain much faster in direct JavaScript.

Growing-denominator arithmetic is a different case: after redundant copy GCDs
are removed, a sampled large Rational Horner run spends about 66.5% in actual
core arithmetic (versus 4.2% for the sampled Integer loop). BigInt multiplication,
GCD and denominator growth then matter. An algorithm/domain change or a suitable
native batch is more promising than another small lookup cache.

Current public plugin calls demonstrate the remaining boundary cost: polynomial
evaluation and an exact mean still take hundreds of times longer than direct
fixed-input core loops, with only small gains from the existing combined
candidate. Those hand loops omit dynamic RiX runtime contracts; their ratios
are opportunity bounds, not demonstrated replacement implementations.

## Are the tests faster?

**No demonstrated meaningful suite speedup yet.** The previous 337-test focused
RiX suites took about 52.8–57.6 seconds across variants; several candidate runs
were concurrent, so those totals do not establish regressions either. The core
suite remains roughly 1–1.4 seconds locally. The parser fix repairs a failure;
it is not a test-performance optimization.

New diagnostics show fresh system construction takes about **303 ms Bun /
218 ms Node**, versus under 1 ms for evaluating a trivial expression with a
reused session. A separate Node profile and source inspection identify repeated
tokenization while extracting bundled plugin operator declarations. Caching
immutable source-derived metadata, while preserving fresh runtime state, is
now a high-priority experiment for faster tests/startup. Existing numerical
benchmark timings exclude this setup cost, so numerical speedups do not imply
faster test-suite wall time. No production startup change was made.

## Included plugins

There was an October 3 compiler-era plugin audit, recoverable in RiX Git history.
This follow-up checks current sources and adds fresh public `poly` and `stats`
benchmarks. The earlier plain Horner experiments did not establish plugin API
speedups. `poly`, `stats` and exact `linalg` are the strongest next candidates
for bounded JavaScript/core services. Polynomial helpers could also benefit
`ratfun`, `algebra`, `algebraicReal` and some plot sampling. Adaptive/async
`ode`, `plot` and certified `numerics` need profiling and careful callback,
budget and evidence contracts; many render/Float/data plugins already use JS.
[Measurements, current source assessment and next experiments](plugin-followup/README.md).

## Evidence map

- [Core arithmetic integration](integrated-core/README.md)
- [Combined polynomial operations](polynomial-core/README.md)
- [Interpreter profiling and copy/literal changes](interpreter-overhead/README.md)
- [Integer lookup/dispatch ablations](integer-dispatch/README.md)
- [Updated Bun/Node runtime measurements](integer-dispatch/results/refresh/README.md)
- [Current plugin and setup follow-up](plugin-followup/README.md)

Historical files retain the runtime versions, source fingerprints, and failures
observed when measured. New snapshots must be rebuilt from their prerequisites
when production changes. The leading-decimal fix is the only production change
made by this follow-up; unrelated existing changes remain outside its commits.
