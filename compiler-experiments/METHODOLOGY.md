# Inspection and methodology

## What was inspected

- `rix/src/parser/`, `rix/src/eval/lower.js`, and `ir.js`: source is parsed and lowered into nested `{ fn, args }` nodes.
- `rix/src/eval/evaluator.js`: recursive evaluation checks budgets, builds argument arrays and dispatches through the registry. Literal values are parsed at execution time. Variable reads use cells/context services.
- `rix/src/eval/registry.js` and `functions/arithmetic.js`: the default registry supports operator variants; numeric helpers perform type handling before calling core methods. Retaining these services retains meaningful overhead.
- `packages/core/src/integer.js`: arbitrary-precision BigInt arithmetic creates Integer result objects and handles promotion.
- `packages/core/src/rational.js`: add/multiply form numerator/denominator products, construct a new Rational, and reduce it using Euclidean GCD. Integer-to-Rational promotions can create additional objects.
- `packages/core/src/rational-interval.js`: multiplication computes four endpoint products; promotion, interval construction, and fraction reduction add work.
- `rix/src/eval/functions/symbolic.js`: the existing `.Poly` path constructs a callable with a cloned IR body (`polyFromSpec`), rather than emitted JavaScript or native code. No general RiX-to-JavaScript emitter was found in the current source/CLI.

## Workloads and variants

Five workloads evaluate `x*x + 2*x + 1`: small integers, 160-bit integers, small fractions, fractions with roughly 128-bit components, and rational intervals crossing zero. A sixth evaluates **32 successive additions** of `step=1/101` to `x=(1..100)/101`; this is an unrolled expression, not a RiX loop benchmark. Inputs vary within each deterministic batch.

Every workload compares pre-lowered interpreted RiX, the recreated runtime translation, runtime translation with hoisted integer literals, generated direct core-method calls, and handwritten core arithmetic. Integer workloads also emit BigInt expressions with either a single boxed result or raw results. Rational polynomial workloads compare an expression-specific fused numerator/denominator kernel (one final reduction) and the separate algebraic rewrite `(x+1)^2`. The repeated-add workload keeps a common denominator through all additions, reducing once at the end, with a core fallback for other denominators.

The small-integer workload additionally compares guarded Number arithmetic with boxed output, raw Number arithmetic, a JavaScript typed-array batch, and scalar/batched i32 Wasm generated from the same expression IR. The batch JS and Wasm paths both use preloaded Int32Array inputs, reusable output storage, and an output copy per batch. Other variants return ordinary arrays. These representation differences are intentional and labeled in JSON.

`compile.js` accepts only integer literal nodes, `x`/`step` reads, and binary ADD/SUB/MUL. It rejects other IR instead of silently falling back. Direct-method and BigInt modes are **numeric experiments assuming default dispatch**, not general RiX compilers: they bypass runtime budgets, diagnostics, reactive reads, holes, custom operator variants, and scope lookup. Rational specialization is handwritten, not inferred by this emitter.

## Methodology

- 256 values/batch, 9 timed samples per variant; order rotates each round. Each variant warms for at least 50 ms, then calibrates repetitions toward a 20 ms sample (maximum 262,144 batches). Samples can be shorter if execution speeds up after calibration.
- Parsing/lowering, emitter construction, Wasm compilation/instantiation, registry/context setup, input conversion/preloading, correctness checks, report writing and module startup are excluded from steady-state timing. One-shot setup durations are recorded separately; they are not reliable cold-start comparisons.
- Interpreted/runtime-translation paths update one existing input cell per value; direct kernels take values as arguments. Their differences include this binding cost. The core handwritten rational polynomial hoists Rational constants, while direct emitted methods hoist Integer constants, exposing promotion costs too.
- Every batch materializes all outputs. An input-dependent output from every repetition is consumed; the final batch of every sample is verified outside timing. The verifier checks every workload output, boxed result classes, large-integer boundaries, specialization fallback, invalid subsets, interval semantics, and Wasm bounds on both runtimes.
- Results retain every timing sample, median/min/max, repetition counts, runtime/OS/CPU details, Git heads and dirty state, experiment file hashes and a hash of local RiX/core/plugin sources. Existing local edits were included; these are **not clean-release measurements**. Initial runs were staged against the live repository before copying this folder into it.
- One process per runtime on one machine, no forced GC, CPU pinning or allocation profiler. GC/JIT/thermal effects remain possible. These measurements identify candidates, not general speed guarantees or a precise attribution of time to GCD/allocation/dispatch.

