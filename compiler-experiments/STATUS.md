# Experiment status and production candidates — October 17, 2026

## New follow-up: tested priorities

The [metadata cache](metadata-cache/README.md) is now the clearest next production
RiX candidate: the same 358-test suite passes in **52.73 → 4.15 seconds (12.7×)**.
Warm fresh-session construction drops from roughly 272 → 2.15 ms in Bun and
194 → 1.95 ms in Node. Cold first construction remains about the same. It shares
only immutable parser results; catalogs, namespaces and loaded state stay fresh.

The [direct-loop experiment](direct-loops/README.md) supplies an explicit exact-core
numeric boundary using existing RiX syntax. It compiles a restricted arithmetic
callback once and runs it in a checked JavaScript fold, or uses bounded whole
polynomial/statistics operations. Selected measured speedups are **15–26×** for
Horner, **39–45×** for a public polynomial batch and **38–98×** for exact statistics.
These helpers use unchanged production arithmetic and include eligibility checks
and snapshots. They are prototypes, not production language/compiler changes.

The linalg follow-up measures the already-existing JavaScript Matrix loop:
roughly 2× versus RiX row loops when keeping its Matrix result, but about 1.1×
when input/output conversion is included. Avoiding repeated representation changes
and scalar operator dispatch is a better next target than merely relocating loops.

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

**Yes in the new metadata-cache experiment:** the same 358 focused RiX tests pass
in 52.73 seconds uncached and 4.15 seconds cached, in separate sequential processes.
The paired suites include plugin-catalog/custom-operator tests as well as the
previous interpreter-focused cases. Another 50 plugin tests pass with the cache;
all 559 core tests pass in 1.25 seconds. This is not a measured speedup for every
whole-repository test profile.

The earlier arithmetic/dispatch variants did not demonstrate meaningful suite
speedups (337 tests took roughly 53–58 seconds). The new cache addresses the
separate repeated plugin-tokenization bottleneck. Warm fresh contexts now cost
about 2 ms, while first construction still costs about 220–300 ms per process.
No production startup or test code has been changed.

## Included plugins

The compiler-era audit and [first public plugin measurements](plugin-followup/README.md)
are now followed by [actual checked helpers and a linalg probe](direct-loops/README.md).
`poly` gains from batching canonical coefficient evaluation; `stats` gains from
exact reductions/shared moments. Explicit snapshotting matters: a live `P(x)` can
return Integers where canonical `P.Evaluate(x)` returns Rationals. The batch
preserves the tested canonical result classes, not every callable representation.

Linalg already has a host Matrix multiplication loop, but conversion and scalar
dispatch remain costly; typed dot/matrix or Bareiss update kernels are worth the
next investigation. Preserve its stage/evidence and coordinate protocols.
Adaptive/async `ode`, `plot` and certified `numerics` remain to be profiled for
suitable boundaries. Many render/Float/data plugins already use JavaScript.

## Evidence map

- [Core arithmetic integration](integrated-core/README.md)
- [Combined polynomial operations](polynomial-core/README.md)
- [Interpreter profiling and copy/literal changes](interpreter-overhead/README.md)
- [Integer lookup/dispatch ablations](integer-dispatch/README.md)
- [Updated Bun/Node runtime measurements](integer-dispatch/results/refresh/README.md)
- [Current plugin and setup follow-up](plugin-followup/README.md)
- [Immutable operator metadata cache](metadata-cache/README.md)
- [Direct loops, plugin helpers and linalg probe](direct-loops/README.md)

Historical files retain the runtime versions, source fingerprints, and failures
observed when measured. New snapshots must be rebuilt from their prerequisites
when production changes. The leading-decimal fix is the only production change
made by this follow-up; unrelated existing changes remain outside its commits.
