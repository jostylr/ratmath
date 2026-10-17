# Direct JavaScript loops with an explicit RiX boundary

This experiment supplies `.exactLoop` only through its local JavaScript loader.
It uses current RiX syntax and **the unchanged production arithmetic implementation**
in an isolated copy. The metadata cache is enabled to reduce session setup; none
of the earlier arithmetic/copy/dispatch optimizations is included in the timed
interpreter. Production sources and included plugin implementations are unchanged.

For a worked numerical example and a plain-language explanation of the parser,
callback and JavaScript loop, see [What Fold does](FOLD-WALKTHROUGH.md).

## A usable convention

```rix
coefficients := [1/3, 2/5, 7/11];
point := 7/5;

answer := .exactLoop.Fold(
    coefficients, 0,
    (acc, coefficient, x) -> acc*x + coefficient,
    [point]
);
```

The callback is ordinary RiX. On first use the loader checks its real lowered IR
and compiles the arithmetic expression to JavaScript using core Integer/Rational
methods. A host `for` loop invokes it over privately snapshotted values. The
compiler does **not** translate arbitrary RiX loop statements or entire plugins.
Compiled expressions are cached (64 entries by default); each call rechecks
live body/parameters, inputs and execution eligibility. Captured values become
explicit parameters and extra arguments, as `point` does above. The cache stores
code/constants, never a prior input collection or coefficient provider.

There are two contracts:

- **`Fold` is an explicit exact-core arithmetic island.** Within its callback,
  `+`, `-`, `*`, `/`, unary minus and bounded literal powers mean core numeric
  operations. Custom RiX operator overloads intentionally do not apply there.
  Unsupported bodies/values are rejected before the loop starts. This is a
  user-visible semantic choice, not a transparent optimization of arbitrary code.
- **`TryFold` is conservative.** It uses compiled code only for eligible inputs
  and unchanged operator entries/variants. Otherwise it invokes the ordinary
  RiX callback for each element. Unsupported calls, custom operators/methods,
  metadata and evaluator budgets retain interpretation. A computation error or
  exceeded numeric bound never restarts a partially executed loop.

An annotation such as `pure` cannot by itself establish eligibility. The proof
here comes from a small IR whitelist plus checked runtime representations and
explicit semantics. Existing [marked BigInt functions](../marked-bigint/README.md)
remain a separate restricted experiment; this one demonstrates a general exact
numeric fold convention without introducing parser syntax.

## Plugin-facing operations

```rix
.Plugin.Load("poly");
P := .poly([1/3, 2/5, 7/11]);
points := [0, 1, 2, 3];
cs := .exactLoop.Snapshot(P.Coefficients());
samples := .exactLoop.PolynomialBatch(cs, points);

summary := .exactLoop.Moments([1/3, 2/3, 5/3, 7/3]);
## summary contains count, mean and population variance
```

`PolynomialBatch` uses descending coefficients and unchanged Horner operation
order. `Mean` and `Moments` use exact Rational arithmetic and the same left-to-right
sum and two-pass variance algorithm as Stats. Moments shares the mean instead
of recomputing it through separate public calls. No floating-point substitution
or deferred reduction is involved.

`Snapshot` is a deliberate value-domain boundary: it copies Integer/Rational
numeric payloads and discards attached semantic metadata. It rejects other
numeric domains and overridden numeric payload fields. Strict kernels otherwise
reject metadata-bearing numeric inputs. Their private input copies are never
published or retained in the compilation cache. They re-read supplied arrays on
later calls.

This matters for live Polynomial coefficients. `Coefficients()` can yield
metadata-bearing canonical Rationals; a live polynomial's direct `P(x)` call can
instead return Integers. Our batch matches canonical **`P.Evaluate(x)`** on the
tested inputs, including result classes, and preserves live coefficient changes
between batches. It is not a transparent replacement for all `P(x)` calls.
The coefficient provider is resolved once at the explicit batch boundary, not
once for every point. Snapshotting does not preserve a provider's per-point effects.

## Measured results

Bun 1.4.3 / Node 26.12.0, Apple M4 Pro / macOS ARM64. Median ms per complete call:

| Workload | Bun RiX → helper ms | Speedup | Node RiX → helper ms | Speedup |
|---|---:|---:|---:|---:|
| Horner scalar, 20 Rational coefficients | 0.8622 → 0.0332 | 26.0× | 0.7292 → 0.0484 | 15.1× |
| Polynomial public Evaluate, 32 points | 53.2904 → 1.1763 | 45.3× | 41.0851 → 1.0642 | 38.6× |
| Statistics Mean, 128 Rationals | 5.2518 → 0.0548 | 95.8× | 3.2801 → 0.0861 | 38.1× |
| Statistics mean and population variance, 128 Rationals | 16.3252 → 0.1659 | 98.4× | 10.3459 → 0.1978 | 52.3× |

All paths use byte-identical production core arithmetic. Parsing, loading,
compilation and setup are outside the warm timings. The accelerated calls include
snapshotting, input checks, core-prototype checks and per-operation numeric bounds;
the polynomial batch also includes public coefficient extraction and explicit
metadata demotion. There are three warmup batches and nine rounds with rotating
path order. Every result's exact value **and numeric class** is checked outside
the timer. Raw reports include samples and expected-output digests; batch repetition counts
are explicit in `bench.js`.

Handwritten core-method JavaScript is also recorded as an unguarded reference;
it is faster than the checked helpers. It does not provide their domain,
metadata, resource and runtime-mode checks. Compilation is small for the tested
one-expression callback; `stats.compileMs` records it separately. These are warm
kernel measurements, not end-to-end startup timings or arbitrary-plugin speedups.

## Linear algebra: reuse versus new helpers

A 6×6 Rational multiplication probe compares current `LinalgMultiplyRows` with
RiX's **already existing JavaScript Matrix loop**, plus a direct core reference:

| Path | Bun ms | Node ms |
|---|---:|---:|
| RiX linalg row loops | 7.7569 | 5.2147 |
| existing JS Matrix compute only | 3.7679 | 2.4650 |
| existing JS Matrix loop, prebuilt inputs | 5.6370 | 3.7740 |
| existing JS Matrix loop, conversions included | 6.8869 | 4.7457 |
| handwritten exact core JS | 0.0449 | 0.0274 |

The existing Matrix loop still dispatches every scalar multiply/add through
RiX. Keeping its Matrix result is about 2× faster than the plugin's row loops in
this case; converting back to row arrays reduces the gain to about 1.4×, and
including input/output conversion leaves about 1.1×. The compute-only row has
a different container representation and is a diagnostic, not API-equivalent
end-to-end timing. Scalar values/classes are checked after adapting representations.

A worthwhile next linalg experiment is a typed exact dot/matrix or Bareiss update
kernel with fewer scalar dispatches, while retaining Matrix/coordinate storage
through the pipeline. Blindly routing every row operation through Matrix would
not solve conversion costs. The two existing multiplication algorithms also
handle the initial zero addition differently, so arbitrary custom-operator
behavior is not equivalent. Bareiss additionally records pivots, swaps and
before/after stages; a determinant-only kernel cannot replace that evidence API.
No linalg algorithm was changed here.

## Eligibility and practical limits

- Plain, dense, eager arrays of plain Integer/Rational values. Intervals,
  certified numbers, units, custom subclasses and lazy/async streams stay outside
  strict kernels. Explicit Snapshot can remove numeric metadata when requested.
- Plain positional callback parameters; a pure arithmetic expression only.
  No implicit outer reads, nested calls/methods, mutation, prep, conditionals,
  async work or effectful callbacks are compiled. Identity callbacks interpret
  through `TryFold` to retain ordinary value semantics.
- Defaults: 65,536 elements per input, 1,000,000 arithmetic operations and 16,384
  bits per numeric payload/intermediate. Powers require a literal exponent 0–8.
  Inputs and intermediate results are checked. These bounds are not a promise
  of fixed latency or a general memory sandbox.
- Active tracing and evaluator budgets reject strict execution; `TryFold` takes
  its interpreter path. Synchronous kernels do not yield to cancellation timers.
  Long computations should use bounded chunks; worker execution and integrated
  cancellation/deadline/work accounting are required before general production use.
- Core prototypes are checked. `TryFold` checks relevant operator entries,
  variant arrays, implementations, priorities and prep descriptors. The prototype
  targets a trusted local host, not adversarial JavaScript/proxy mutation. Broad
  production optimization needs a supported registry/version/eligibility protocol.
- Custom `Reduce` methods are not rewritten. `TryFold` is its own ordered eager
  fold: it snapshots the element list before interpreted callbacks, so callback
  mutation cannot extend the source iteration. Callbacks can still perform their
  ordinary synchronous RiX effects, once per original element.

RiX can keep scopes, exploratory definitions, live coefficients, orchestration
and async work around coarse numeric kernels. Compiling arbitrary async/effectful
loops would require much more machinery and may save much less.

## Validation and reproduce

115 checks pass independently in Bun and Node: differential scalar/batch cases,
exact class parity, compilation reuse/eviction, live function-body changes,
explicit captures, mutable input refresh, metadata/subclass/accessor rejection,
custom operator overrides/variants, custom methods, effectful fallback exactly
once, active trace/budget handling, size/work/bit bounds, arithmetic-error behavior,
live polynomial changes and Stats mean/variance parity. The metadata experiment
also runs 358 paired focused RiX tests, 50 plugin tests and 559 core tests.

```sh
node compiler-experiments/metadata-cache/build.js
bun compiler-experiments/direct-loops/verify.js
node compiler-experiments/direct-loops/verify.js
bun compiler-experiments/direct-loops/run.js
node compiler-experiments/direct-loops/run.js
bun compiler-experiments/direct-loops/bench.js
node compiler-experiments/direct-loops/bench.js
bun compiler-experiments/direct-loops/linalg-probe.js
node compiler-experiments/direct-loops/linalg-probe.js
```

`run.js path/to/file.rix` supplies `.exactLoop` and the wrappers in
`scripts/kernels.rix`; without a path it runs the included demo. Generated callback
source, compilation statistics, raw timing samples and validation are in `results/`.
Production remains unchanged. This is an experimental host capability, not a
built-in RiX namespace or a general JavaScript compiler.
