# Included plugin and setup follow-up — October 17, 2026

This follow-up measures current RiX plugin functions, rather than assuming that
plain Horner microbenchmarks predict complete plugin behavior. It changes no
production plugin or interpreter. Bun 1.4.3 / Node 26.12.0, Apple M4 Pro / macOS ARM64.

## Actual plugin pilot

`probe.js` loads real `poly` and `stats` plugins, builds fixed inputs once, then
compares production with the previous `integer-dispatch/comparisons` candidate
(private Rational factory/fast paths, copy/literal changes, method-name caching,
dispatch allocation changes and guarded comparisons). Every result is checked
for exact value and class. This is a combined candidate comparison, not an
ablation of individual changes. There are three warmup batches and nine rounds
with alternating RiX/JS order. Loading, setup, parsing and correctness checks
are outside the timers; raw reports retain samples, exact answers, repetitions,
runtime versions and source fingerprints. Processes ran sequentially. A separate
source-parity check confirms production RiX/plugins match the original snapshot
and that bundled `poly`/`stats` source strings equal their `.rix` files in both
environments; see `results/source-parity.json`.

Handwritten JavaScript uses the **corresponding core's exact methods**, with
prebuilt inputs and ordinary arrays. It does not implement RiX closures,
operator/method overrides, tracing, budgets, metadata or diagnostics. Its time
is an opportunity comparison for these fixed inputs, not a replacement plugin
or a promised compiler speedup.

| Runtime | Workload | Production RiX ms | Experimental RiX ms | Speedup | Exact JS ms (experimental core) |
|---|---|---:|---:|---:|---:|
| Bun | poly internal Horner, degree 19 Integer | 0.8687 | 0.8101 | 1.07× | 0.000288 |
| Bun | poly public callable, degree 19 exact | 1.1584 | 1.0749 | 1.08× | 0.003091 |
| Bun | poly public callable, degree 7 Rational | 0.4885 | 0.4535 | 1.08× | 0.002178 |
| Bun | stats public Mean, 64 Rationals | 2.8020 | 2.9771 | 0.94× | 0.006224 |
| Node | poly internal Horner, degree 19 Integer | 0.7055 | 0.6622 | 1.07× | 0.000301 |
| Node | poly public callable, degree 19 exact | 0.8354 | 0.7990 | 1.05× | 0.002955 |
| Node | poly public callable, degree 7 Rational | 0.3372 | 0.3407 | 0.99× | 0.001562 |
| Node | stats public Mean, 64 Rationals | 1.7581 | 1.7371 | 1.01× | 0.005739 |

These public polynomial calls improve only about 1.0–1.1× here; the experimental
statistics call is slightly slower in Bun and nearly unchanged in Node. Tiny
exact arithmetic is dominated by function scopes, recursive calls, argument
binding, validation, indexing and dispatch. The hand loops are still hundreds
of times faster for the public fixed-input examples; they intentionally omit
those runtime contracts. The internal Integer-only kernel gap is even larger.
This motivates selected bulk kernels, not a claim that every plugin will gain
hundreds of times from compilation.

The experimental snapshot predates the decimal parser fix; the production
snapshot includes it. None of these workloads constructs a signed leading
decimal. Historical snapshot fingerprints remain unchanged. Rebuilding the
previous chain will incorporate that fix in every new candidate.

## Why tests remain slow

`setup.js` measures five samples per operation in one process, outside the
kernel benchmark. Median default-system construction is **302.6 ms Bun /
218.4 ms Node**; new registry construction is about **0.16 ms**. Evaluating
`1;` with fresh defaults costs **309.8 / 217.7 ms**, versus **0.87 / 0.84 ms**
when a session is reused. This is a small diagnostic, not a whole-suite speedup
estimate, and session reuse is unsafe when a test requires fresh mutable state.

A separate Node sampling profile of eight system constructions attributes most
CPU samples to tokenizer routines (for example `tryMatchSymbol` 35.7%,
`tokenizeSource` 12.3%, identifier/string matchers about 7.8% each). Inspection
shows `createDefaultSystemContext` calls `installBundledPlugins`; each fresh
catalog's `addMetadata` extracts operator declarations by tokenizing whole RiX
plugin sources. This repeats even before a plugin is loaded.

A promising next experiment is caching **immutable source-derived operator
metadata** keyed by source, owner and parsing configuration, while constructing
fresh catalogs and mutable runtime state. Test custom catalogs, source changes,
mounts, operators and permissions. Caching whole live sessions would violate
isolation. No such cache has been implemented in this follow-up.

## Plugin priorities

| Priority | Current implementation and likely helper | Contracts to retain |
|---|---|---|
| First | `poly` is pure RiX. An explicit exact scalar/batch Horner helper can serve evaluation, sign tests and repeated sampling; polynomial convolution/division/GCD follow after profiling. | Resolve live coefficient providers at the defined call boundary; preserve variable identity, coefficient order, custom operators, interval operation order and evidence. |
| First | `stats` is pure RiX. Exact sum/mean and shared moments/summary reductions could avoid repeated callbacks and traversals. | Keep validation, exact Rational results, population/sample distinctions, empty-data errors and certified distribution providers. Start with unchanged sum/variance order before combining formulas. |
| Next | `linalg` implements exact dense algorithms in RiX, including Bareiss, LU and RREF. Typed matrix multiply and fraction-free elimination are substantial bounded-kernel candidates. | Exact divisibility, pivots, dimensions, scalar-field/coordinate protocols, cancellation/work limits and verification records. No performance measurement of this plugin yet. |
| Later | `ratfun`, `algebra`, `algebraicReal` build on polynomial algorithms; a shared coefficient kernel could benefit several plugins. | Canonical forms, dynamic coefficients and independently checkable factor/root/sign evidence. Not benchmarked here. |
| Profile first | `plot`, `ode`, `numerics` coordinate callbacks, adaptive work and certified providers. Batch sampling or whole-step kernels may help selected pure callbacks. | Async effects/order, cancellation, work budgets, units, intervals, callback semantics and certification. Not covered by this pilot. |
| Already host JS | Float/data/drawing/rendering plugins already have JavaScript implementations. | Profile provider arithmetic, sampling, transfer/serialization or output size before adding another compiler layer. |

## Earlier audit

RiX history commit `64d1ff575f79aa73d5bc8c6241f6fba922ad1a73` contains the
October 3 audit (`documentation/eval/plugin-javascript-compilation.md`) and
`benchmarks/plugin-kernel-probe.js`. Those files and the old compiler were
removed at `d525695`; inspect them with `git -C rix show <commit>:<path>`.
That audit reported a roughly 570× internal polynomial-kernel opportunity on
Bun 1.4.0, explicitly excluding full RiX semantics. Its generated-artifact and
compiler-coverage findings describe the deleted compiler. The current public
plugin measurements above are fresh evidence; source sizes and inventories
from the earlier audit are not presented as current measurements.

## Reproduce

From the repository root, after building integer-dispatch copies for `--fast`:

```sh
bun compiler-experiments/plugin-followup/probe.js
node compiler-experiments/plugin-followup/probe.js
bun compiler-experiments/plugin-followup/probe.js --fast
node compiler-experiments/plugin-followup/probe.js --fast
bun compiler-experiments/plugin-followup/setup.js
node compiler-experiments/plugin-followup/setup.js
node compiler-experiments/plugin-followup/setup-profile.js
node compiler-experiments/plugin-followup/source-check.js
```

Set `RATMATH_ROOT` for another checkout. Inspect `results/*.json` for original
measurements. No original compiler, native compiler, network or new package
installation is needed.
