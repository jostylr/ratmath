# Tuned modular-power algorithms written in RiX

Two ordinary RiX scripts reproduce the earlier successful JavaScript algorithms:

- [window.rix](scripts/window.rix): most-significant-bit sliding windows, width 6, with a batch-shared exponent schedule and per-base odd-power table.
- [montgomery.rix](scripts/montgomery.rix): sliding windows, width 5, plus Montgomery reduction for positive **odd** moduli. Newton iteration constructs the modular inverse; conversion to/from Montgomery form is part of every batch.

The widths are the earlier full-size benchmark winners for Bun and Node. Both scripts execute in the existing interpreter; their arithmetic is actually written in RiX rather than delegated to an opaque host algorithm. The compiler emits their real IR, including their helper functions, arrays, loops and reductions. No production source files are modified. The earlier `bigint-aot` compiler/results are retained; this folder contains an extended compiler snapshot.

## Run

From the repository root with its existing dependencies, Clang, GMP and Node headers available:

```sh
bun compiler-experiments/tuned-aot/emit.js
bun compiler-experiments/tuned-aot/verify.js
node compiler-experiments/tuned-aot/verify.js
bun compiler-experiments/tuned-aot/bench.js
node compiler-experiments/tuned-aot/bench.js
bun compiler-experiments/tuned-aot/demo.js
node compiler-experiments/tuned-aot/demo.js
```

Use `--quick` for a smoke benchmark, `--samples 9` for more rounds, or `--output path.json` for another named result. `--count`, `--bits` and `--exponent-bits` change workload size. The demo picks window RiX on Bun and Montgomery RiX on Node; `--window` overrides that choice. No package installation is needed. Native compilation reuses the existing experiment-only [C/GMP addon](../whole-scripts/addon.c) and its cache under `whole-scripts/tmp`.

## Compiler additions and exactness

[compiler.js](compiler.js) extends the earlier closed subset with homogeneous integer/nested sequences, pure `Push`, `Slice`, `Reverse`, `Get`, `Last`, `Len`, `Map` and explicit-initial-value `Reduce`; function-body blocks; `BitLength`; and bounded powers of two. Large arithmetic remains BigInt. Number is used only for array lengths/indices, which are bounded small integers and converted at the sequence boundary; no modular multiplication or reduction uses floating point.

Known `2^k` values carry a compiler fact and the original `k`. The compiler passes that shift through specialized helper calls. It rewrites floor modulo by `2^k` as a mask, and floor division by `2^k` as a shift, including signed integer operands. The fact's shift is captured when the radix is bound, so later updates to a variable used to construct it cannot invalidate the optimization. This is general lowering of the emitted operations, not recognition of a named Montgomery function.

The guarded branch `reduced>=modulus ?: reduced-modulus ?_ reduced` supplies a nonnegativity fact for its true-branch subtraction, so subsequent multiplications retain direct BigInt arithmetic. Other subtractions stay conservatively signed. Mutable sequences, metadata effects, unsupported methods, dynamic code, recursion, defaults, arbitrary powers and user dispatch overrides remain unsupported. Loop sign/type invariants are checked, and the default 10,000-iteration limit is retained.

RiX shares an immediate function-body block/loop with its parameter scope. The new scripts use those parameters directly; they do not import them from the caller. Explicit copied imports are supported for nested scopes, and explicit imports on shared function bodies are rejected. Lambda outer reads resolve lexically. Pure `Push` and `Reverse` preserve copy semantics rather than becoming unconditional mutations.

The input specialization requires ordinary nonnegative Integer bases/exponent and a positive modulus; Montgomery additionally requires an odd modulus. Budgets: 4096 bases, 8192-bit bases/modulus, 4096-bit exponent, power-of-two exponent <=16384, sequence length <=16384. Sequence reads must be in range and `Last` receivers nonempty; guards reject unsupported null-producing reads. Arbitrary RiX programs still need an interpreter fallback rather than assuming these contracts. Generated modules return raw BigInt arrays. The adapter returns mutable RiX sequences of exact RatMath Integers, preserving the ordinary sequence's mutable flag for later `.Push!` calls.

Differential verification covers 184 exact reference outputs across 38 fixtures, including zero bases, zero exponents, modulus one, even-modulus windows and large integers. There are 62 algorithm/fixture comparisons, four source mutations (changing widths and names), signed floor arithmetic, rational/error fallback, a captured-shift regression, rejected source/argument cases and managed-call cache/return-value checks. Verification passes under Bun and Node. Every measured batch also matches the independent binary reference and GMP results exactly.

## Measurement and results

Default: the same deterministic 24 powers, 2048-bit modulus and 1024-bit exponent used earlier. Five measured rounds and two warmups per path; rotate order each round. Each runtime runs alone. All main paths return RiX sequences of exact Integers. Timing includes a fresh interpreter context/input bindings or compiled/native input unboxing, guards, the complete algorithm, and output boxing. Parsing, compilation/import, fixture generation, shared runtime setup and native build are excluded and reported separately.

Exponent schedules, per-base power tables and Montgomery state are prepared **inside** each invocation. Handwritten JavaScript uses the earlier `window-6` and `montgomery-5` candidates, with both measured on each runtime. The native path is GMP `mpz_powm` via the existing C N-API batch addon, including conversions at that boundary. GMP chooses its own algorithms; it is a library comparison, not an identical-algorithm native translation of these RiX scripts. CPU/wall samples, versions, source/generated hashes, input/output digests, cache metadata and first-call managed compilation times are recorded in the JSON reports.

Apple M4 Pro, macOS ARM64; Bun 1.4.0 and Node 26.10.0. Medians per full batch:

| Path | Bun ms | Node ms |
|---|---:|---:|
| interpreted binary RiX | 1666.139 | 4833.161 |
| interpreted window RiX | 1380.974 | 3841.655 |
| interpreted Montgomery RiX | 3088.952 | 7899.122 |
| binary RiX + Integer fastpaths | 94.174 | 182.051 |
| window RiX + Integer fastpaths | 155.442 | 222.439 |
| Montgomery RiX + Integer fastpaths | 444.214 | 585.136 |
| compiled window RiX | 25.900 | 76.840 |
| compiled Montgomery RiX | 41.564 | 42.782 |
| handwritten window-6 JS | 23.727 | 75.233 |
| handwritten Montgomery-5 JS | 37.777 | 40.438 |
| native C/GMP powm | 21.970 | 15.632 |
| RiX calls cached compiled kernel | 25.925 | 42.816 |

**Compiled window RiX is 64.3× faster than original binary RiX in Bun; compiled Montgomery RiX is 113.0× faster in Node.** They take 9.2% / 5.8% more time than the matching handwritten implementations. Window is the faster compiled algorithm in Bun; Montgomery is the faster one in Node. Native GMP is still 1.18× / 2.74× faster than those generated paths.

The Integer-only interpreter fast paths reduce the original binary script by **17.7× / 26.5×**, while preserving interpreter loops and scoped calls. More elaborate window/Montgomery algorithms add interpreter machinery, so they are slower than binary under these two-operation fast paths. Ordinary interpreted window RiX is only modestly faster than binary, and interpreted Montgomery is slower.

Power-of-two lowering is essential for Montgomery: disabling those facts increases the compiled median by 3.58× in Bun and 5.07× in Node. This is a compiler arithmetic optimization on the RiX algorithm, independent of removing evaluator dispatch.

The managed RiX call is effectively as fast as the directly called compiled module: measured median differences are 0.024 / 0.034 ms, smaller than the timing spread. First calls, including the entire computation plus lazy compilation/import and evaluator entry, took 32.443 / 48.421 ms. Compilation itself took 1.401 / 1.182 ms; each managed instance compiled once. These first-call times exclude process startup/shared runtime initialization.

See the full tables and raw data: [Bun](results/tuned-bun.md), [Node](results/tuned-node.md), [Bun JSON](results/tuned-bun.json), [Node JSON](results/tuned-node.json). Small `--quick` workloads emphasize schedule, array and call overhead and are not used for the conclusions above. These are single-machine measurements with observed spreads, not universal speedup claims.

## Can normal RiX execution choose faster JavaScript computations?

**Yes. Two routes are demonstrated here, without changing the production interpreter.**

The simpler route is [interpreter-fastpaths.js](interpreter-fastpaths.js): create a private RiX registry and override only `MOD` and `INTDIV` for plain exact Integer operands. Direct BigInt implementations retain floor semantics, including negative operands; other numeric types and invalid divisors use the original implementation. RiX still interprets every loop, lookup, assignment and call, and still creates Integer results at each arithmetic step. This isolates an arithmetic implementation improvement from compilation. It does not replace modulo with JavaScript's signed remainder without a correction.

The larger route is [managed.js](managed.js): a local host capability called **from RiX**, with lazy compilation/import on its first call and cached execution on later calls. [demo.js](demo.js) runs both calls and checks exact results. Its ordinary RiX entry script is:

```rix
Compute(bases,exponent,modulus) -> .compiledPowers(bases,exponent,modulus);
Compute(bases,exponent,modulus);
```

The JavaScript launcher uses the existing public host-capability and `evaluateAsync` APIs:

```js
const kernel = createManagedKernel(windowRiXSource);
const result = await kernel.run(fixture);
```

`windowRiXSource` is the actual window script, not a handwritten JS replacement. The first capability call compiles its IR and imports a standalone BigInt module; repeated calls reuse one module tied to the captured source/options. The returned sequence contains ordinary Integers, and the rest of the program remains in RiX/JavaScript. This is an explicit local launcher/capability experiment; the normal `rix` CLI has not acquired automatic compilation.

Production Integer fast paths could be a small, focused change with wider semantic/regression checks. Automatically replacing arbitrary hot functions is more involved: guard input types and values, preserve Cell aliasing/metadata/custom arithmetic/effects, cache against source and semantic changes, and fall back to interpretation when a specialization is not applicable. BigInt-backed JavaScript already runs as machine code through the host JavaScript engine; a native GMP boundary is a separate option for sufficiently large batches. Both current numerical kernels run synchronously once called and block the JavaScript thread during computation; `evaluateAsync`/a Promise alone does not move CPU work to a worker.

## Promising follow-ups

1. Add bounded small-integer analysis for counters/indices and remove unnecessary guarded sequence reads where bounds are proved. Preserve exact arithmetic and copy semantics.
2. Reduce schedule/table construction allocations with ownership-aware builders, then benchmark small and large jobs separately.
3. Investigate production Integer `MOD`/`INTDIV` fast paths independently from an opt-in cached function compiler. Validate custom dispatch and metadata before enabling them broadly.
4. Put large compiled/native jobs in a worker so JavaScript can keep handling other local work. Compare worker boundary cost and native compilation amortization across batch sizes.
