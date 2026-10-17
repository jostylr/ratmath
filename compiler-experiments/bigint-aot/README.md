# RiX → direct BigInt JavaScript

This experiment compiles the actual [modular-power RiX script](../whole-scripts/scripts/modular-powers.rix), using the existing RiX tokenizer, parser and IR lowering. It emits standalone ES modules containing JavaScript functions, local BigInt variables, a `while` loop and an array map. **There are no interpreter, context, registry, arithmetic-helper dispatch or intermediate RatMath Integer calls in the generated hot loop.** It does not substitute a prewritten modular-power implementation.

Run from the repository root:

```sh
bun compiler-experiments/bigint-aot/emit.js
bun compiler-experiments/bigint-aot/verify.js
node compiler-experiments/bigint-aot/verify.js
bun compiler-experiments/bigint-aot/bench.js
node compiler-experiments/bigint-aot/bench.js
```

`--quick` runs a smaller smoke benchmark; `--output path.json` saves a separate report. There are no new dependencies. All code and generated artifacts stay in `compiler-experiments`; production code is untouched.

Call the emitted module from JavaScript after running `emit.js`:

```js
import { run } from './compiler-experiments/bigint-aot/generated/modular-powers-peepholes.js';
const residues = run([2n, 3n], 65537n, 1000000007n); // BigInt[]
```

For programmatic compilation, `compileBigInt(rixSource, { peepholes: true })` returns `moduleSource`, the lowered `ir`, and the source hash. Save `moduleSource` as an ES module and import it, as `emit.js` and `bench.js` do.

## What gets compiled

The input contract is explicit: external `bases` is a nonempty sequence of nonnegative exact integers, `exponent` is a nonnegative exact integer, and `modulus` is positive. The module's `run(bases, exponent, modulus)` accepts raw BigInts and returns an array of raw BigInts. Runtime guards enforce types and limits (4096 bases, 8192-bit bases/modulus, 4096-bit exponent). `runIntegerSequence` unwraps RatMath input Integers and returns a RiX sequence containing exact RatMath Integers.

Two outputs are saved:

- [Plain translation](generated/modular-powers.js): keep the script's `% 2` parity test and `// 2` halving, while lowering proven nonnegative integer operations to BigInt `%` and `/`.
- [Translation with two peepholes](generated/modular-powers-peepholes.js): replace nonnegative `% 2` with `& 1n`, and nonnegative `// 2` with `>> 1n`. This retains the same square-and-multiply algorithm as the RiX source and the handwritten binary implementation.

Function parameter types are inferred from calls starting at the guarded input contract. Functions are specialized by argument types/signs; names are resolved to generated identifiers. Copy scope imports become local variables, the lambda's `@exponent`/`@modulus` become lexical references, and `e=exponent` shares the copied loop binding as RiX's Cell alias requires. Updates preserve that alias. The compiler rejects copied assignment that would detach a shared alias, loop rebinding, or assignments that invalidate an inferred sign invariant.

RiX `//` floors negative quotients; BigInt `/` truncates. Unknown-sign division therefore uses a small floor-division helper. RiX modulo requires a positive divisor and returns a nonnegative remainder; a helper handles negative dividends. Direct `%` is used only where nonnegativity and a positive divisor are proved. Conditions must be comparison booleans: arbitrary RiX numeric truthiness is deliberately rejected. The generated loop preserves RiX's default 10,000-iteration limit.

There is also an arithmetic implementation difference inside that exact contract. Current RiX `MOD` computes a quotient through numeric division, floors it, then subtracts the divisor times that floor. Proven nonnegative integers can use BigInt `%` directly, avoiding that quotient/Rational path. The roughly 50× improvement therefore combines removal of evaluator machinery, intermediate wrappers and unnecessary arithmetic work; these measurements do not assign an individual percentage to each source of overhead.

The supported subset includes ordinary positional function definitions/calls, copied-scope loops with initialization/body/return, integer arithmetic, comparisons, ternaries, sequence `Map` lambdas and explicit outer reads. Unsupported operations fail compilation. This is an experimental specialization under default RiX arithmetic semantics, without custom registry overrides, metadata, holes/reactive values, overloaded functions, recursion, effects, async or arbitrary sequence methods. It is not a general RiX compiler or an automatic algorithm optimizer.

## Measurement

Default workload: the same deterministic 24 modular powers as the earlier whole-script experiment, with a 2048-bit modulus and 1024-bit exponent. Apple M4 Pro, macOS ARM64; Bun 1.4.0 and Node 26.10.0. Nine timed rounds, three warmups per path, rotating order. One process per runtime, run sequentially. Every tuning run, warmup and timed result is checked outside the timed section.

Parsing, compilation, module import, input generation and shared runtime setup are excluded. Compilation/import durations are recorded separately. Timed compiled and handwritten paths include input unboxing, guards, the entire computation and conversion to a RiX sequence of Integers. Timed interpretation includes a fresh context, input binding and evaluating the full pre-parsed script, including its function definitions. The raw diagnostic uses preconverted BigInts and omits the output boundary conversion. No arithmetic uses Number.

The handwritten binary comparator uses the same algorithm as generated code. The tuned comparator is selected from binary, six sliding-window variants and five Montgomery/window variants using separate, rotated three-round training. Its schedule/table/Montgomery setup stays inside each batch. Main benchmark samples are not used to choose a candidate. This is the best measured candidate from that set, not a claim of globally optimal JavaScript.

Raw reports include wall and CPU samples, machine/runtime versions, source hashes, generated-module hashes, exact input/output digests and tuning samples. See [Bun results](results/bigint-bun.md) and [Node results](results/bigint-node.md).

| Path | Bun ms | Node ms |
|---|---:|---:|
| interpreted RiX | 1588.703 | 4806.735 |
| compiled BigInt | 31.503 | 98.320 |
| compiled BigInt + peepholes | 30.060 | 95.492 |
| handwritten binary | 30.113 | 95.639 |
| Hand-tuned (Bun: window-6; Node: Montgomery-5) | 23.275 | 40.084 |

The generated version with peepholes is **52.9× faster than interpreted RiX in Bun and 50.3× in Node**. It is within **0.2% (Bun) / 0.2% (Node)** of handwritten binary code; those differences are smaller than the observed timing spread. Plain translation is also close (4.6% / 2.8% slower than handwritten binary). Two tiny integer peepholes improve the generated median by about 4.6% / 2.9%.

The tuned algorithm is still **1.29× / 2.38× faster** than generated binary code. Algorithm selection—not a large residual interpreter cost—is the main remaining difference. The raw diagnostic is almost unchanged (30.184 / 94.996 ms), consistent with boundary conversion being small for this workload.

Warm compiler calls including parsing took 0.37–1.09 ms; importing a generated module took 0.14–0.46 ms. These exclude process startup and shared runtime initialization. All 224 verification outputs, 18 source-mutation comparisons and 10 unsupported-source checks passed under both runtimes; every measured batch matched exactly.

Small smoke timings should not be interpreted as precise ratios. The large workload is the main evidence, but these are single-machine measurements, not a cross-machine performance claim.

## How this relates to the FizzBuzz logs

The user's three [reported runs](results/fizzbuzz-user.json) show 46.4–76.2× AOT speedups. The latest table places compiled RiX only 1.4–2.0× slower than handwritten JavaScript using RatMath Integer arithmetic, but 34.6–50.0× slower than Number JavaScript. That is consistent with removing most evaluator/scoping/call overhead while retaining BigInt arithmetic, object construction and core-method costs. The core comparator's 0.04012 ms versus Number's 0.00161 ms is already about a 25× gap before compiled-language overhead is considered. This comparison does not separately measure BigInt versus Number arithmetic, object allocations and method calls.

The BigInt experiment removes Integer wrapping inside the loop while retaining exact large-integer arithmetic. Boundary boxing of 24 results costs little compared with the large multiplications/remainders. Its remaining gap to the tuned version measures an algorithm difference: generated code preserves the script's binary algorithm, whereas the tuned handwritten version uses windows (and, where selected, Montgomery reduction). Similar overall speedups do not imply identical overhead or arithmetic workloads.

The compiled FizzBuzz source is unavailable in this checkout, so its timing and semantics cannot be independently reproduced here. I reran the existing production `rix/benchmarks/fizzbuzz.js` without editing it: [local Bun output](results/fizzbuzz-local-bun.txt). It uses 1000 values, nine rounds and three warmups. RiX medians were 2.742–3.894 ms and Integer JavaScript was 0.046 ms, broadly in line with the supplied logs. Number JavaScript was about 0.004–0.005 ms here, versus 0.00161 ms in the supplied compiled benchmark. These are different harnesses (the local script constructs arrays with `Array.from`, boxes core inputs inside the timed batch and includes map-pipe evaluation), so treat that difference as a reason to compare the generated code and assembly/timing boundaries before attributing it to the compiler.

## Next experiments

1. Express sliding-window modular exponentiation in RiX, extend the subset only as needed, and compile it. This tests whether algorithm improvements plus compilation can reach the best measured handwritten time.
2. Add explicit specialization signatures and guarded fallback for mixed RiX programs, with compile-cache invalidation based on source/contract/runtime semantics. Keep exact integers as BigInts until leaving a compiled region.
3. Evaluate batch size and bit width separately, with calibrated repetitions for small kernels. Preserve equivalent arithmetic and output types; compare cold startup and repeated calls separately.
4. Retain JavaScript orchestration for async/host work. The earlier [async experiment](../whole-scripts/README.md) found little native advantage when waits dominate.
