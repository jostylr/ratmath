# RiX compiler experiments

Reproducible, isolated experiments using the local RiX interpreter and RatMath arithmetic. Performance changes remain isolated here. The signed-leading-decimal constructor fix was subsequently promoted to production core; see the October 17 status below. **The previous RiX-to-JavaScript compiler was deleted**, as confirmed by the user. Its actual output is unavailable; the clearly labeled recreated baseline translates current IR into current runtime-helper calls.

## Current status — October 17, 2026

[Status and promotion recommendations](STATUS.md) distinguish the strongest
core/RiX candidates, remaining interpreter costs, test startup overhead, and
plugin opportunities. The [leading-decimal fix](rational-decimal-fix/README.md)
now passes in experimental and production core (`c081124`). The [plugin follow-up](plugin-followup/README.md)
benchmarks current public `poly` and `stats` operations and profiles expensive
session setup; older compiler-era plugin findings are explicitly historical.

## Run

From the RatMath repository root, with its existing dependencies installed:

```sh
bun compiler-experiments/verify.js
bun compiler-experiments/bench.js
node compiler-experiments/verify.js
node compiler-experiments/bench.js
```

Use `--quick` for a smoke run or `--output compiler-experiments/results/my-run.json` to preserve a named run. Default runs write `results/latest-{bun,node}.json` plus Markdown tables and refresh `generated/snapshot.json`. No additional dependencies or Wasm compiler are required. `RATMATH_ROOT` can select another checkout.

## Local native kernels — October 12, 2026

The follow-up experiments add an explicit `execution: "native"` kernel contract, RiX arithmetic-to-C/GMP compilation, cached local machine-code executables, asynchronous JavaScript calls, and larger exact workloads. JavaScript retains job orchestration and RatMath result objects. See [the native experiment README](native/README.md) for the API, measurements, compilation break-even, and a substantial 32.8-million-term job. Production code remains untouched.

## RiX source markers — October 13, 2026

Put `## @native exact-rational` before an ordinary RiX function, then use the experimental JavaScript loader to compile and call it locally. Scalar calls and native batch methods return exact RatMath values. [Syntax, JavaScript example, limits, and measurements](native/SOURCE.md); run `bun compiler-experiments/native/source-demo.js --cold` or the same command with `node`. All source handling remains inside this folder.

## Complete scripts — October 13, 2026

[Whole-script comparisons](whole-scripts/README.md) run modular exponentiation and a scoped async job workflow as real RiX scripts, tuned handwritten JavaScript, and handwritten native C. They compare exact results and ordered host effects, include matched-algorithm/hybrid diagnostics, and record setup costs separately. Run `bun compiler-experiments/whole-scripts/bench.js` or the same command with `node`.

## Direct BigInt JavaScript compilation — October 13, 2026

[Compile the modular-power script](bigint-aot/README.md) through real RiX IR into standalone BigInt JavaScript, preserving its binary algorithm and exact Integer results at the boundary. Generated code is compared with matched handwritten JavaScript and separately tuned algorithms, with a discussion of the supplied FizzBuzz AOT timings. Run `bun compiler-experiments/bigint-aot/bench.js` or the same command with `node`.

## Integer method/operator dispatch and refreshed runtimes — October 17, 2026

[The integer-dispatch experiment](integer-dispatch/README.md) compares a bounded method-name cache, operator-dispatch allocation reductions, and guarded plain-Integer comparisons, all on top of the preceding copy/literal fixes with identical core code. It checks live custom method/operator changes, priorities/normalized arguments, tracing and async behavior. Fresh Bun 1.4.3 / Node 26.12.0 reports rerun the integrated-core, polynomial-core and interpreter-overhead harnesses while preserving earlier results. Combined changes give about 1.23× / 1.25× on Integer Horner and 1.33× / 1.25× on Len/Get traversal; dispatch-only results are mixed. All 337 focused RiX tests pass per variant; the updated core run exposes one existing `Rational("-.5")` constructor failure. See its README for the ablations, validation and a core parser failure reproduced independently of these changes. Production code stays unchanged.

## Profiling and reducing RiX interpreter overhead — October 17, 2026

[The interpreter-overhead experiment](interpreter-overhead/README.md) profiles ordinary RiX Horner and tests targeted changes in copied interpreters. It isolates redundant Rational normalization during fresh value copies, repeated literal parsing and remaining dispatch/lookup work. Every timed interpreter uses byte-identical fast core code; profiling/counters are separate from clean Bun/Node benchmarks. Fresh object/meta semantics are retained, and an explicitly labeled source control hoists invariant `Len()`. The combined fixes improve the two growing-denominator Rational-point workloads by 2.9–9.8× in Bun and 6.0–16.1× in Node, while Integer-only gains are modest. All 555 core tests and 342 focused RiX tests per interpreter pass. See its README for full profiles/counters, results, validation and a local runner. Production files are unchanged.

## Combined polynomial operation in the integrated fast core — October 16, 2026

[The polynomial-core experiment](polynomial-core/README.md) compares RiX Horner with explicit per-point and batch core calls, all using the same private Rational factory and scalar fast paths. A second core operation keeps reduced intermediate pairs unboxed, without delaying normalization or changing Horner's algorithm. Eight workloads include Integer/Rational coefficients and points, a zero polynomial, a constant and intervals. Exact results/classes match the original interpreter; all 555 core tests pass. See its README for Bun/Node results and `.polynomialBatchFused(coefficients,points)` usage. Production core and RiX are unchanged.

## Ordinary RiX with an integrated experimental core — October 16, 2026

[The integrated-core experiment](integrated-core/README.md) runs unannotated RiX against complete copied core packages, including the private Rational factory and mixed arithmetic fast paths. It separates a core-only substitution from optional copied RiX wiring for new Integer floor methods. Full core suites pass (555 tests for each core), focused RiX numeric suites pass (90 tests per environment), and 574 differential source cases pass in Bun/Node. Rational-heavy ordinary RiX improves about 2–3×; Integer-heavy modular powers improve 8.5× / 15.9× with the copied built-in wiring. Production files and links are unchanged. Build copies with `integrated-core/build.js` and see its README for tests, benchmarks and an ordinary-script runner.

## Core arithmetic and combined operations — October 14, 2026

[Core arithmetic candidates](core-arithmetic/README.md) compare direct Integer floor division/modulo, mixed Rational fast paths, equal-denominator arithmetic and cross-cancellation with current methods. A copied Rational class tests a private reduced-result factory without changing production core; an unchanged copy controls for class identity. Polynomial benchmarks compare RiX algorithms, compiled Integer-pair Horner, scalar/batch offloading and reusable plans/operation descriptors, with exactness and growth checks. Run `core-arithmetic/verify.js`, `bench.js`, `combo-bench.js` or `demo.js` using Bun or Node.

## Marked functions and first-use BigInt compilation — October 13, 2026

[The marked-function runner](marked-bigint/README.md) recognizes `## @bigint` before an ordinary RiX function. It compiles supported bodies on first use, caches successful/rejected specializations, checks current helpers for redefinitions, and falls back to interpretation for unsupported calls. Use `marked-bigint/run.js` for a local RiX script, `marked-bigint/demo.js` for annotated modular powers and Rational fallback, and `marked-bigint/verify.js` for semantic checks. This isolated synchronous runner leaves the production CLI unchanged.

## Tuned RiX algorithms and managed execution — October 13, 2026

[Sliding-window and Montgomery algorithms written in RiX](tuned-aot/README.md) compile to direct BigInt JavaScript and are compared with the corresponding handwritten JavaScript and native GMP. The same experiments measure Integer arithmetic fast paths in the interpreter and demonstrate compiling/caching a kernel on its first call from ordinary RiX via a local host capability. Run `bun compiler-experiments/tuned-aot/bench.js` or `node` for benchmarks; `tuned-aot/demo.js` demonstrates calls from RiX.

## Initial results — October 11, 2026

Apple M4 Pro; Bun 1.4.0 and Node 26.10.0. Six workloads, 45 variants, 256 varying inputs/batch, 9 timed samples, warmup and calibrated repetitions. Parsing, compilation, setup and input conversion are excluded. All 11,520 workload outputs and additional boundary/fallback checks passed in both runtimes. Each timing sample also verifies its final batch.

The recreated runtime translation improved execution by only **1.14–1.42× in Bun** and **1.05–1.32× in Node**. Removing runtime dispatch and reducing intermediate fraction construction made a much larger difference:

| Workload | Exact boxed approach | Bun speedup vs IR | Node speedup vs IR |
|---|---|---:|---:|
| integer-small | BigInt, one boxed output | 36.7× | 201.8× |
| integer-160bit | BigInt, one boxed output | 26.2× | 36.1× |
| rational-small | Fused fraction, one reduction | 12.4× | 24.0× |
| rational-128bit | Fused fraction, one reduction | 6.0× | 6.0× |
| rational-add32 | Common denominator, one reduction | 40.8× | 105.6× |
| interval-polynomial | Handwritten core methods | 1.8× | 2.3× |

These rows preserve exact values and RatMath result classes. Specialized rational kernels are handwritten experiments; no general type inference or rational optimizer was added. The handwritten rational baseline also avoids repeated Integer-to-Rational constant promotion.

Batching and representation matter for the bounded integer case:

| Raw bounded integer batch | Bun µs/256 values | Node µs/256 values |
|---|---:|---:|
| hand JS Number raw | 1.047 | 1.269 |
| hand JS i32 batch raw | 0.193 | 0.241 |
| Wasm i32 scalar raw | 1.616 | 1.711 |
| Wasm i32 batch raw | 0.168 | 0.301 |

Wasm batching was **9.6× / 5.7× faster than scalar Wasm calls** (Bun/Node). The typed-array JS batch and Wasm batch are much closer: Wasm was slightly faster in Bun, while the JavaScript batch was faster in Node. These paths assume prevalidated inputs in [-2048,2047] and preloaded buffers; they do not establish a Wasm advantage for arbitrary-precision rationals or include input conversion at the boundary.

Intervals retain the original operation order. For example, x=[-2,3] yields [-9,16] for x*x+2*x+1; algebraic rewrites can change the interval result. Rational rewrites are explicitly rejected for interval inputs.

Full timing samples, medians/ranges, versions, source fingerprints and local dirty state: [Bun results](results/initial-bun.md) ([JSON](results/initial-bun.json)); [Node results](results/initial-node.md) ([JSON](results/initial-node.json)). Inspection, workload definitions and caveats: [methodology](METHODOLOGY.md). One process per runtime on one machine; these are initial measurements against a locally edited checkout, not general speed guarantees.

## Promising next experiments

1. Compile hot numeric expressions to direct kernels with type/operator guards, fallback and hoisted constants. Measure invalidation and guard costs.
2. Generalize rational fusion and denominator tracking; test variable denominators, cross-cancellation, operand sizes and intermediate growth before delaying reduction.
3. Add real RiX function/loop/map and matrix benchmarks, including compilation costs and break-even counts.
4. Prototype a whole-kernel exact Wasm runtime with checked bounds/fallback and measured input/output conversions. Typed-array JS should remain a comparison.
5. Repeat in separate processes and instrument allocation/GCD costs inside this folder to distinguish the inferred bottlenecks.

Files: `compile.js` emits a restricted ADD/SUB/MUL subset; `wasm.js` encodes i32 kernels; `workloads.js` defines kernels/inputs; `verify.js` checks correctness; `bench.js` records measurements; `runtime.js` adapts the checkout. Emitted source/IR/Wasm bytes are retained in [generated snapshot](generated/snapshot.json).
