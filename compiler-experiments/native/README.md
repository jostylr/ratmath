# Local native kernels

Yes: JavaScript can own an application while explicitly marked, substantial computations run as local machine-code kernels. This experiment compiles a restricted RiX arithmetic expression into C calls to GMP, then uses Clang to create an **ARM64 executable on this machine**. A JavaScript Promise launches the compiled process, transfers the inputs once, and returns exact RatMath Rational objects. A separate process also lets the host remain responsive and cancel the job.

This is an experimental kernel interface inside `compiler-experiments`, with no production language or arithmetic changes. It uses a C compiler as the machine-code backend; it does not hand-encode ARM instructions.

## Mark, compile, run

You can now mark a function directly in RiX with `## @native exact-rational` and load it as a JavaScript callable. See [source markers and the working example](SOURCE.md). The normal RiX interpreter treats the marker as a comment.

The lower-level marker remains a JSON descriptor, such as [exact-matrix.json](kernels/exact-matrix.json):

```json
{
  "name": "exact-matrix",
  "execution": "native",
  "numeric": "exact-rational",
  "pattern": "matrix-reduce",
  "expression": "x*y"
}
```

`execution: "native"` explicitly requests native work. `pattern` defines the large loop to compile; `expression` defines its scalar arithmetic. Supported patterns are matrix dot reductions and pairwise map/reduce. The descriptor remains useful when a caller already has an expression and an explicit loop pattern.

From JavaScript, using imports relative to the `native/` folder:

```js
import { defineKernel } from './plan.js';
import { compileNativeKernel } from './host.js';

const plan = defineKernel({
  name: 'exact-product', execution: 'native', numeric: 'exact-rational',
  pattern: 'matrix-reduce', expression: 'x*y'
});
const kernel = await compileNativeKernel(plan); // creates or reuses machine code
const { values, metrics } = await kernel.run({
  rows, inner, cols,
  left: leftMatrixValues, right: rightMatrixValues
}, { timeoutMs: 120_000, signal: abortController.signal });
```

Inputs are flat row-major arrays of RatMath Rational/Integer objects: `left.length=rows*inner`, `right.length=inner*cols`; output has `rows*cols` Rational values. For `map-reduce`, set `rows=count`, `inner=cols=1`, with two arrays of `count` values. It returns one exact sum of the compiled expression evaluated on each pair. Input arrays are not mutated.

The native process executes all iterations, with reusable GMP temporaries and no JavaScript callback per arithmetic operation. JavaScript still manages inputs, compilation, scheduling, cancellation and returned values. Nothing is installed into the production RiX evaluator.

## Reproduce

From the RatMath repository root:

```sh
bun compiler-experiments/native/verify.js
bun compiler-experiments/native/projection.verify.js
bun compiler-experiments/native/source.verify.js
bun compiler-experiments/native/source-demo.js --cold
bun compiler-experiments/native/bench.js
node compiler-experiments/native/verify.js
node compiler-experiments/native/projection.verify.js
node compiler-experiments/native/source.verify.js
node compiler-experiments/native/source-demo.js --cold
node compiler-experiments/native/bench.js

# Larger local job: 32,768,000 exact multiply/add terms.
node compiler-experiments/native/demo.js --size 320 --bits 512
# Compare every result with the improved JS reference; this also takes time.
node compiler-experiments/native/compare-large.js
```

`--quick` shortens the benchmark. The demo defaults to 256×256 matrices and 256-bit numerators; `--size` and `--bits` select a larger/smaller workload. Interrupting the demo cancels its native child. Native child execution has a configurable timeout; host encoding and output reconstruction are synchronous. The comparison defaults to `results/demo-node.json`, or accepts an explicit demo report path.

Clang (or a compiler named by `CC`), `pkg-config`, and GMP development headers/library are required. They were already present here: Apple Clang 21, GMP 6.3.0, macOS ARM64, Apple M4 Pro. No dependency was installed. The [machine-code inspection](generated/native-machine-code.txt) confirms the generated ARM64 executable. The worker uses POSIX APIs and has only been tested on this Mac; Windows support is not implemented. Node 26.10.0 and Bun 1.4.0 both work with the subprocess host.

## Results — October 12, 2026

Native execution benefits depend on work performed per transferred value:

| Workload | Best JS ms (Bun / Node) | Native whole-job ms (Bun / Node) | Native speedup vs best JS |
|---|---:|---:|---:|
| 4×4 matrix | 0.06 / 0.10 | 2.47 / 3.71 | 0.02× / 0.03× |
| 32×32 matrix | 13.05 / 13.49 | 8.58 / 8.36 | 1.52× / 1.61× |
| 96×96 matrix | 382.86 / 368.67 | 142.90 / 141.32 | 2.68× / 2.61× |
| 65,536-pair reduction | 37.64 / 41.21 | 75.86 / 57.33 | 0.50× / 0.72× |

The 96×96 native matrix was **2.6–2.7× faster than the improved JS kernel**, including transfer costs, and **4.7–7.1× faster than direct RatMath arithmetic**. The longer reduction still favors the fused JS kernel: its cheaper arithmetic does not amortize the native boundary. Tiny matrices favor JS too.

Fresh kernel builds took **61–78 ms**; artifact-cache preparation took about 9–10 ms, including toolchain discovery and binary checking. At 96×96, the saved time pays for one compilation within one job. At 32×32, the measured break-even is 13–18 jobs. These are estimates from the measured medians, not universal thresholds.

A larger local job multiplied **320×320 matrices with 512-bit numerators**: **32,768,000 exact terms**, returning **102,400 Rational values**. Native arithmetic took **6.295 s**; the whole native call took **6.726 s**. The improved JS reference took **22.256 s** (**3.31×**). Every canonical output matched by SHA-256 comparison. The JS host produced 6 timer heartbeats while the native job ran. Input and output transfers were approximately 32.7 MB and 35.7 MB. This large comparison is one timing per backend.

Full measurements: [Bun](results/native-bun.md) ([JSON](results/native-bun.json)), [Node](results/native-node.md) ([JSON](results/native-node.json)), [large native job](results/demo-node.json), [full-output JS comparison](results/demo-node-js-comparison.json). The large demo also performs two modular projection diagnostics; the subsequent JS comparison checks the complete exact result digest.


## What is compiled

`plan.js` lowers current RiX source, validates it, and emits native GMP operations or either of two JavaScript implementations. The subset includes integer literals, `x`/`y`, addition, subtraction, multiplication, division, and negation, with a 64-node expression budget. It rejects powers, calls, mutation, unknown identifiers and other unsupported/effectful nodes. Descriptor fields and numeric domains are explicit, and the validated plan is frozen.

The core JS implementation preserves operation order and uses Rational constants. The fused JS implementation computes numerator/denominator temporaries and reduces once per scalar expression. Every original division retains its zero check, even when later algebra could hide it. An LCM-based accumulator limits denominator growth without creating a RatMath result object for each addition. This generalizes the earlier hand-specialized polynomial experiment; denominator growth inside a fused expression still needs broader stress testing.

GMP rational operations canonicalize their results; input parsing explicitly checks zero denominators and canonicalizes before use. See the [GMP rational-number documentation](https://gmplib.org/manual/Rational-Number-Functions).

`host.js` discovers the local toolchain, generates C from `worker.c.in`, and builds with `-O3`. A cache key includes generated source, compiler/GMP versions, flags, OS and architecture. Cached binaries are checked against their recorded digest. Sources, binaries and build records live under ignored `native/tmp/`; inspected generated C/JS/RiX references are kept in `generated/`. No shell interpolation is used to compile or launch jobs. Missing tools or compilation errors are reported; there is no silent switch to a slower backend.

The worker validates its own dimensions/protocol, checks division by zero, and computes with arbitrary-precision rationals. The interface limits matrices to 512 per dimension and 50 million terms, reductions to 2 million pairs, transfers to 64 MiB, and individual input lines to 10,000 bytes. This is a kernel contract with resource limits, not a compiler for arbitrary RiX programs or custom operator behavior.

## Measurement and verification

- Deterministic dense matrices and reduction arrays use roughly 160-bit numerators and five small prime denominators. This controls denominator growth; arbitrary, large unrelated denominators could change results substantially. The large demo uses 512-bit numerators.
- Three rotated-order samples after one warm execution per variant. JS kernels and input objects are prepared outside timing. Native wall time includes validation, decimal serialization, process launch, native parsing/initialization, computation, formatting, transfer, cleanup and RatMath output reconstruction. Compilation is measured separately in a fresh artifact cache; the OS/compiler caches can already be warm.
- RiX comparisons at small sizes execute a real function and loop, with scope import, indexing, arithmetic and loop control. For matrices the outer row/column traversal is in JS; each dot product runs through RiX. Large interpreter runs are omitted, with no extrapolated timings.
- Every benchmark output is checked against the direct RatMath reference. The native verifier additionally checks 302 exact comparisons, rectangular dimensions, arbitrary-size integer inputs, zero division, unsupported constructs, cached builds, malformed native input, timeouts and active cancellation on both runtimes. Projection tests also detect a deliberately corrupted result.
- Reports preserve all wall samples, native parse/compute/format timings, transfer sizes, compilation environment, generated-source hashes, source-file hashes and reference result digests. `bench.js` writes `results/native-{bun,node}.json` and Markdown tables. `demo.js` writes its report; `compare-large.js` writes the full-output JS comparison report.
- One machine/process per runtime and three samples. There is no allocation/GCD profiler, worker pool, multithreading or persistent native process. The large demo/comparison are one timing each, not a repeated benchmark. These are initial measurements.

## What to try next

1. Keep the explicit kernel boundary. Add a policy based on measured job size, arithmetic type and transfer cost, rather than assuming every marked computation benefits.
2. Use persistent native workers or a binary transport for repeated jobs. The reduction benchmark is a clear target for reducing transfer/startup overhead. Compare with worker-thread JavaScript before adopting an in-process native bridge.
3. Compile fuller loop/reduction IR with checked purity, operator/version guards and explicit fallback. The source-marker loader now supplies this boundary experimentally; fuller bodies and dispatch through the production evaluator still need numeric and effect contracts.
4. Sweep independent large denominators and cancellation-heavy expressions; compare eager GMP operations, expression fusion and selective reduction. Do not assume these small-denominator fixtures represent all exact arithmetic.
5. Add blocked/parallel matrix kernels and process-level repetitions, with all output validation retained. The current native matrix loop is deliberately straightforward.
