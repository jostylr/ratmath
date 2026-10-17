# Mark RiX functions for local native compilation

Put this marker immediately before a normal RiX function:

```rix
## @native exact-rational
Product(a,b) -> a*b;

## @native exact-rational
Transform(t) -> (t*t+2*t+1)/(t*t+1);
```

The complete runnable source is [examples/marked-functions.rix](examples/marked-functions.rix). It also contains an unmarked ordinary function. The usual RiX interpreter ignores the marker and executes these definitions normally.

From JavaScript, with imports relative to `compiler-experiments/native/`:

```js
import { Rational } from '../runtime.js';
import { loadNativeFile } from './source.js';

const { Product, Transform } = await loadNativeFile(
  new URL('./examples/marked-functions.rix', import.meta.url)
); // validates source, generates C/GMP, builds or reuses local machine code

const value = await Product(new Rational(1n, 3n), new Rational(7n, 5n)); // 7/15
const transformed = await Transform(new Rational(1n, 3n)); // 8/5

// For intensive work, cross the process boundary once for the whole job.
await Product.prepare('matrix-reduce'); // optional explicit preparation step
const { values, metrics } = await Product.matrixReduce({
  rows, inner, cols, left: leftMatrixValues, right: rightMatrixValues
}, { timeoutMs: 120_000, signal: abortController.signal });
```

`loadNativeFunctions(source, compileOptions)` accepts a source string instead of a file. Both loaders return a frozen object keyed by each function's **declared spelling**, such as `Product`. RiX's internal normalized name is retained in `Product.native.canonicalName`. Compiler options are the existing `cacheDir` and `compiler` options. The loader compiles every marked scalar/map function before returning. Other batch patterns are compiled lazily, or explicitly through `prepare`.

| JavaScript call | Native work | Result |
|---|---|---|
| `await Product(a,b)` / `await Transform(a)` | One scalar evaluation | One RatMath Rational |
| `await Product.map(left,right,options)` | Evaluate the function independently for every pair | `{values,metrics}` with one output per pair |
| `await Transform.map(left,undefined,options)` | Evaluate the unary function for every input | `{values,metrics}` with one output per input |
| `await Product.reduce(left,right,options)` | Sum function results for all pairs | `{values,metrics}` with one exact sum |
| `await Transform.reduce(left,undefined,options)` | Sum unary function results | `{values,metrics}` with one exact sum |
| `await Product.matrixReduce(job,options)` | For each output cell, sum the function over its row/column pairs | `{values,metrics}` with `rows*cols` outputs |
| `await Product.prepare(pattern)` | Build/reuse `map`, `map-reduce` or `matrix-reduce` | Build metadata |

Arrays contain exact RatMath Integer/Rational objects and must be nonempty. Matrix arrays are flat and row-major, with `left.length=rows*inner` and `right.length=inner*cols`. `matrixReduce` requires a binary function; its operation is matrix multiplication specifically when the marked body is `a*b`. Each batch method launches one native child; JavaScript does not execute its inner loop. Inputs are not mutated. Cancellation and timeout options apply to the child job; host encoding and result decoding remain synchronous.

## Contract and limits

This is an experimental **source loader**, with all code in `compiler-experiments`. The production parser, evaluator and arithmetic implementation are untouched. Ordinary RiX calls do not automatically redirect into the native backend. JavaScript owns orchestration and gets Promises and exact RatMath results back. Unmarked definitions and other top-level statements are parsed but never evaluated or exported by this loader.

The marker must be a standalone `## @native exact-rational` line before a top-level function. Blank lines and indentation are accepted; another comment or statement between the marker and definition is rejected. Marker-like text in strings does not count. Export names must be ASCII system function names, up to 57 characters, with one or two distinct plain positional parameters. Defaults, preparation, conditions, overloads, captured variables, calls, mutation, powers and loop/block bodies are rejected. The body supports integer literals, parameters, `+`, `-`, `*`, `/` and unary negation, up to 64 expression nodes and 4,096 emitted characters. Source is limited to 128 KiB and 32 marked functions.

`exact-rational` explicitly selects built-in exact arithmetic, accepting Integer/Rational inputs and returning Rational outputs even for integral results. It does not preserve integer result classes or custom operator behavior. Intervals and JS Number inputs are rejected. Every division keeps its original zero check; division errors reject the Promise. This subset cannot call back into JavaScript or observe RiX bindings.

RiX tokenization, AST and lowering identify declarations and arithmetic; parameter bindings are remapped by IR identity rather than text replacement. All declarations are validated before any compiler process is started. The backend emits C/GMP and invokes the local C compiler to produce a machine-code executable. The existing source/toolchain/platform cache detects changed function bodies; repeated calls reuse prepared kernels. `Function.native` records the declaration, complete source hash and initial map build. `prepare` reports other pattern builds. Missing tools or unsupported constructs produce errors, with no automatic fallback.

Scalar calls demonstrate the bridge and incur process overhead; use batches for substantial work. This version compiles supplied map/reduction loop templates around the marked scalar body. It does not infer arbitrary RiX loops or decide automatically when native work is worthwhile. Clang, `pkg-config` and GMP development files are required; this has been tested locally on macOS ARM64 with Node and Bun. [Existing native backend limits and methodology](README.md) still apply.

## Reproduce and measurements

From the repository root:

```sh
bun compiler-experiments/native/source.verify.js
node compiler-experiments/native/source.verify.js
bun compiler-experiments/native/source-demo.js --cold
node compiler-experiments/native/source-demo.js --cold
```

`--cold` uses a fresh artifact directory under ignored `native/tmp/`; omitting it exercises the persistent build cache. The demo prints scalar results, compiles a matrix pattern, runs the same 96×96/160-bit fixture as the earlier experiments, and compares all 9,216 exact outputs with fused JavaScript. Three alternating-order samples follow one warm execution per implementation. Compilation, fixture preparation and output verification are outside execution timing; native execution includes conversion and subprocess costs. Raw reports preserve compilation metadata, source hashes, timing samples, output digest and host timer heartbeats. One process per runtime on one machine; these are initial measurements.

| Runtime | Fresh load of two marked functions ms | Matrix build ms | Native execution ms | Fused JS ms | Speedup |
|---|---:|---:|---:|---:|---:|
| Bun 1.4.0 | 137.25 | 81.68 | 146.99 | 359.89 | 2.45× |
| Node 26.10.0 | 127.84 | 68.29 | 144.40 | 373.24 | 2.58× |

Measured October 13, 2026 on the Apple M4 Pro with Clang 21 and GMP 6.3.0. The load timings include parsing and two fresh map builds; matrix compilation is separate. Execution timings are medians including the native boundary. Scalar product/transform calls returned `7/15` and `8/5`; both runtimes produced the same complete matrix digest, and the host timer ran while native jobs executed. Scalar product calls took 165.40 ms (Bun) / 137.31 ms (Node).

Reports: [Bun](results/source-demo-bun.json), [Node](results/source-demo-node.json).

The verifier checks 97 exact outputs against RiX/RatMath, scalar/map/reduction/rectangular matrix behavior, cache reuse and body-change invalidation, parameter remapping, marker placement, rejected effects/signatures, integer promotion, zero division, timeout validation and active cancellation. The original 302-comparison native suite also passes after adding independent map output support.

Next useful steps are compiling a supported loop directly inside a marked RiX function, keeping a native worker alive across jobs, and measuring an automatic size threshold. The present batch API provides a measurable boundary for those experiments.
