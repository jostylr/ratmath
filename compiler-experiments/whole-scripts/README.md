# Whole RiX scripts versus handwritten JavaScript and native programs

Two complete RiX scripts are executed by the current interpreter, then independently implemented in tuned JavaScript and handwritten C. All inputs, exact Integer outputs and observable host effects match. This measures how much a future compiler could gain from specializing a whole program; **these C/JS programs are hand translations, not output from the experimental source-marker compiler**. Everything remains inside `compiler-experiments`.

## Programs

**[Modular powers](scripts/modular-powers.rix)** computes 24 modular exponentiations with 2,048-bit bases/modulus and a shared 1,024-bit exponent. The RiX script owns the entire batch map and square/multiply loop, with integer arithmetic, indexing-free iteration, decisions, calls and scope imports. No outer computation is hidden in a JS driver.

The [handwritten JS](optimized.js) searches 12 candidates: right-to-left binary exponentiation, sliding windows of widths 1–6, and Montgomery sliding windows of widths 1–5. Three rotating-order training measurements after warmup select the fastest observed median for each runtime. Schedule preparation and Montgomery constants are recomputed inside each timed batch; they are not precomputed results. The reported winner is the best of these candidates, not a claim of the best possible algorithm on every machine. Handwritten C uses GMP's `mpz_powm` for the optimized version, with a separate square/multiply version matching RiX's algorithm.

**[Async scopes](scripts/async-scopes.rix)** fetches each job through an asynchronous host capability, enters fresh function/block scopes, defines a nested function that captures an outer bias, scores the payload, and publishes it before admitting the next job. The script owns the full map. The synchronous publisher and fetch order are part of the contract; none of the implementations parallelizes requests or batches away observable effects.

The JS translation specializes static scope bindings and uses an ordinary sequential `await` loop. Separate training runs choose between exact BigInt arithmetic and a guarded Number implementation. Payloads/bias are unsigned 32-bit integers; even the Number implementation's largest intermediate is below 2^53 and its outputs are exact Integers. The C version implements the **complete async control flow** as a native Promise state machine: captured bias, job index, result storage, fulfillment/rejection continuations and cleanup. It calls the same JS fetch/publish services and constructs the same RatMath Integer outputs. An additional hybrid keeps the async loop in JS and moves only scoring into C.

Run the async script with two fixtures:

- 2,048 jobs whose fetch returns an asynchronous Promise, with only a microtask yield. This exposes interpreter, scope, Promise and bridge overhead.
- 128 jobs whose same fetch waits on a 2 ms timer. This provides a controlled example where external waiting dominates. It is simulated latency, not a network or disk performance claim. Actual host wait times are recorded; timers may exceed the requested delay.

## Run

From the repository root:

```sh
bun compiler-experiments/whole-scripts/verify.js
node compiler-experiments/whole-scripts/verify.js
bun compiler-experiments/whole-scripts/bench.js
node compiler-experiments/whole-scripts/bench.js
```

`--quick` uses smaller fixtures and three samples. `--samples 3` changes repetitions. `--bits 4096 --exponent-bits 2048 --count 8` selects larger modular powers; fixture bounds are checked. `--output compiler-experiments/whole-scripts/results/my-run.json` preserves a named JSON report plus a Markdown table. Ordinary runs write `results/whole-{bun,node}.json` and `.md`. Run benchmark processes sequentially to avoid CPU contention.

Clang, `pkg-config`, GMP development headers/library and Node-API headers are required. They were already installed on this machine. `build.js` discovers headers next to the installed Node executable; `NODE_INCLUDE` can select another directory. The addon is loaded locally by both Node and Bun. It passes BigInts as 64-bit words, avoiding the earlier subprocess protocol's decimal serialization and process launch. Build artifacts remain under ignored `whole-scripts/tmp/`; the cache key includes C source, headers, compiler/GMP versions, flags, OS and architecture, and the cached binary digest is verified.

Sources: [Node-API BigInt conversion](https://nodejs.org/api/n-api.html#napi_get_value_bigint_words), [Bun Node-API support](https://bun.sh/docs/runtime/node-api), [GMP integer exponentiation](https://gmplib.org/manual/Integer-Exponentiation). This addon was tested on macOS ARM64; its direct numerical calls are synchronous and occupy the JS thread. Moving them into a worker would be a separate responsiveness experiment.

## Results

Measured October 13, 2026 on Apple M4 Pro, macOS ARM64, Clang 21 and GMP 6.3.0. These are **warm whole-script execution medians**, in milliseconds, including native calls/conversion and host effects.

| Workload | Runtime | RiX | Tuned JS | Native C | JS / native |
|---|---|---:|---:|---:|---:|
| 24 modular powers | Bun 1.4.0 | 1538.679 | 22.669 | 20.616 | 1.10× |
| 24 modular powers | Node 26.10.0 | 4708.671 | 39.534 | 15.248 | 2.59× |
| 2,048 scoped async jobs, microtask fetch | Bun 1.4.0 | 31.317 | 0.671 | 1.330 | 0.50× |
| 2,048 scoped async jobs, microtask fetch | Node 26.10.0 | 40.741 | 0.573 | 2.677 | 0.21× |
| 128 scoped async jobs, 2 ms host delay | Bun 1.4.0 | 337.839 | 322.020 | 323.303 | 1.00× |
| 128 scoped async jobs, 2 ms host delay | Node 26.10.0 | 344.726 | 321.079 | 322.679 | 1.00× |

For the numerical script, Node's tuned JS was **119.1× faster than interpreted RiX**, and native was a further **2.59× faster than tuned JS**. Bun's tuned JS was already close to native (**1.10×** native speedup). Node selected Montgomery width 5; Bun selected sliding-window width 6. Runtime and algorithm selection materially change the result.

The matched square/multiply diagnostics were 90.93 ms JS / 30.37 ms C in Node, and 29.83 / 30.31 ms in Bun. GMP's optimized power routine and tuned JS both improve on their literal translations. The headline gain is therefore a combination of representation, runtime and arithmetic algorithm/library choices, not an isolated measurement of compiler quality.

For cheap asynchronous jobs, the full C Promise state machine was slower than tuned JS: roughly **2× in Bun / 4.7× in Node**. Keeping the loop in JS and calling only the native score was 0.567 / 0.560 ms (Bun/Node), much closer to JS. These sub-millisecond rankings need more process repetitions before treating small differences as meaningful.

With host delays, JS and native were within about **0.5%**, and interpreted RiX was only **5–7.4%** slower than tuned JS. The host wait dominates: all implementations make the same 128 fetches and produce the same ordered publish effects. Native code cannot remove that external wait.

Fresh compilation and addon loading took 281.62 / 296.92 ms (Bun/Node). Normal cached preparation, including toolchain/header discovery, digest checks and loading, took 92.28 / 96.11 ms. Reusing the loaded addon avoids preparation on subsequent calls. Building the reusable RiX host capability context took 287.66 / 202.05 ms, also excluded from warm execution. Neither number includes all process/module startup costs.

Using these medians, Node's saved execution time pays for its fresh native preparation after approximately **13 batches**. Bun's much smaller gain suggests approximately **138 batches**; that estimate is sensitive to measurement variation. This is a simple amortization model, not an automatic scheduling rule.

Both runtimes produced identical complete result and effect-trace digests for every workload. Reports: [Bun table](results/whole-bun.md) ([raw JSON](results/whole-bun.json)), [Node table](results/whole-node.md) ([raw JSON](results/whole-node.json)). [Native library inspection](generated/native-inspection.txt) confirms ARM64 machine code linked to GMP.

## Methodology and checks

- The lowered scripts run in the real RiX evaluator. A fresh execution context, external input bindings, the script's function definitions and its complete computation are included in every timed execution. Default host capabilities and parser/lowering are prepared once; their setup timings are reported separately. Handwritten modules and native builds are also prepared before timing. No production runtime modification or mock evaluator is involved.
- Native numerical timings include array/BigInt conversion, GMP computation, returning BigInts and reconstructing RatMath Integer outputs. Native async timings include callbacks, Promise continuations, Integer construction and effects. The shared host's payloads/IDs are prepared identically outside timing.
- One warm execution per variant, then five rotated-order execution samples in separate sequential Bun and Node processes. Candidate training runs precede these held-out samples. Every sample compares all exact values; async samples also compare the complete ordered fetch/fetched/publish trace. Timing stops before verification and digest calculation.
- Raw reports include every wall/CPU sample, measured host waiting, variant ranges, selected algorithms and all training samples, fresh/native-cache preparation costs, parse times, source hashes and deterministic input/output/trace digests. CPU measurements include all threads of the runtime process, so JIT/GC work can exceed wall time. Library import and process startup are not benchmarked.
- The verifier covers 228 distinct modular outputs across 12 JS candidates and both native algorithms, including exponent zero, zero base, modulus one, even moduli on supported candidates and larger operand widths. It checks 1,020 bounded scores against exact BigInt arithmetic, all workflow variants' exact output/effect order, timer and microtask modes, rejected input types/bounds, fetch/publish failures and native state cleanup with interleaved activations. Cache reuse is checked too.
- This is one machine and one measured process per runtime, with a fixed deterministic fixture and no memory/allocation profiler. Tuning is finite, timer-heavy rankings can be noisy, and a hand translation can specialize static scopes more aggressively than a generic RiX compiler. These measurements do not establish that arbitrary scripts can be compiled this way or that native code always wins.

## Implications for the compiler experiments

The useful next step is a guarded integer-loop compiler: infer or require exact Integer inputs, avoid per-operation object construction and dispatch, and choose BigInt JS or a native arithmetic backend using measurements on the actual local runtime. Compare against tuned algorithms; a literal transliteration is an inadequate baseline.

For async/effectful scripts, specialize lexical bindings and cheap pure expressions while leaving scheduling and host capabilities in JavaScript. The native state-machine and hybrid diagnostics measure the cost of moving that boundary. Persistent/in-process calls remove launch costs, but Promise/callback overhead and external waits still matter. More arbitrary scopes and effects need explicit semantics; the existing `## @native exact-rational` loader still accepts only its documented arithmetic subset.
