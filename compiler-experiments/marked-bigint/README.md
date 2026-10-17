# First-use compilation of marked RiX functions

Mark an ordinary, top-level RiX function with an adjacent comment:

```rix
## @bigint
Square(x) -> x*x;

Square(1234567890123456789);  ## compiles on first use
Square(9876543210987654321);  ## reuses the specialization
Square(3/2);                  ## interpreter, exact result 9/4
```

The experimental runner recognizes the marker, runs the surrounding program through the existing interpreter, and replaces only the marked function's body with a first-use compilation hook. Normal RiX argument evaluation, parameter binding, call scopes, automatic symbolic specifications, and callbacks remain in place. An unmarked pure helper can be included in the compiled region automatically. This is ordinary RiX syntax: the standard interpreter treats the marker as a comment.

**The production RiX CLI does not activate this hook.** Use this folder's runner or its JavaScript session API. All code and results are isolated to `compiler-experiments`; no production source is changed. The runner currently uses synchronous RiX evaluation. Async functions/scheduler integration remain a next experiment, rather than being routed through a synchronous fallback.

## Run

From the repository root, using the existing installed dependencies:

```sh
bun compiler-experiments/marked-bigint/run.js compiler-experiments/marked-bigint/scripts/demo.rix --stats
node compiler-experiments/marked-bigint/run.js compiler-experiments/marked-bigint/scripts/demo.rix --stats
bun compiler-experiments/marked-bigint/verify.js
node compiler-experiments/marked-bigint/verify.js
bun compiler-experiments/marked-bigint/demo.js
node compiler-experiments/marked-bigint/demo.js
bun compiler-experiments/marked-bigint/bench.js
node compiler-experiments/marked-bigint/bench.js
```

The demo runs an annotated substantial modular-power batch twice, checks both answers, then demonstrates Rational fallback. It chooses sliding windows on Bun and Montgomery on Node based on the preceding experiment, and saves the generated JavaScript kernel for inspection. The benchmark needs the existing Clang/GMP/Node-header setup for its native comparison; neither the runner nor verification requires a native compiler. Add `--quick` for a small smoke benchmark. Package aliases inside `compiler-experiments`: `run:marked`, `verify:marked`, `demo:marked`, `bench:marked`.

## Use from JavaScript

```js
import { createMarkedSession } from './compiler-experiments/marked-bigint/runner.js';

const session = createMarkedSession();
const program = session.load(rixSource);  // parse/lower; no kernel compilation yet
const result = program.run();            // first eligible call builds the kernel
const again = program.run();             // cached kernel
console.log(session.stats);
```

`program.run({bindings, context})` accepts exact RatMath/RiX values and an optional existing `rix.Context`. A session can load additional source into that context, including helper redefinitions. `inspectCache()` exposes compiled factory source, inferred input types, return types and rejection reasons; `clearCache()` removes all entries. Results remain exact RatMath Integers and ordinary mutable RiX sequences. No floating-point arithmetic substitutes for large integers.

## Cache and fallback behavior

- A definition alone does not compile. The first supported call checks actual input representations/signs, resolves the current helper definitions, and compiles the real lowered IR into a JavaScript function with direct BigInt operations.
- The in-memory cache key includes the marked definition, reachable helper definitions and input type/sign profile. It does not depend on a hard-coded function name or modular-power recognition. Redefining a helper or marked function selects a new entry; equivalent reloaded definitions reuse an entry.
- Successful and rejected compilations are cached. A Rational call or guard failure leaves an existing Integer specialization usable. This first version uses an LRU cache of 64 entries, configurable from 1 to 256; there is no disk cache or cross-process reuse.
- Unsupported values, metadata/custom dispatch, captures, recursion, defaults/prep, unsupported operators, mutations and other effects execute the original function body. Rejected bodies execute only once per call; arguments are already evaluated and are never retried.
- Explicit kernel guards for division/modulo errors, out-of-range sequence reads, empty `Last`, and specialization budgets can retry through the interpreter because the compiled subset is pure. Other kernel exceptions propagate, exposing compiler defects rather than silently rerunning the body.
- Marked functions defined with automatic symbolic specs disabled retain their original reflective bodies and execute normally. Guard checks also retain interpreter behavior with changed loop limits, constructor-capture defaults, numeric input bases, tracing, method extensions and operator registry entries. Functions returning existing parameter values/collections or identity callbacks conservatively fall back to preserve identity and metadata.

The [compiler](compiler.js) is an isolated snapshot/generalization of the previous tuned AOT compiler. Supported arithmetic includes exact Integer addition/subtraction/multiplication, comparisons, signed floor division/modulo and bounded powers of two. It supports a limited set of plain function calls, loops, blocks, homogeneous arrays, and pure sequence methods used by the window/Montgomery scripts. Guarded inputs are plain Integers or nonempty flat Integer sequences; arbitrary Rational, interval, lazy or heterogeneous inputs fall back. Input budgets: 8192 bits per Integer and 4096 sequence elements; output/intermediate sequence cap 16384, power-of-two exponent cap 16384, ordinary loop limit 10000. Compiler sign/type invariants may reject otherwise valid numeric functions.

Default RiX constructor deep copies and `:=` shallow copies are retained in generated arrays. Known powers of two carry a frozen shift fact for masking/shifting, including signed floor operations. The compiled kernel has no interpreter operator dispatch; its boundary still pays for guards, dependency fingerprints, ordinary function scope setup and exact output boxing. Tiny scalar functions may not benefit. Mark the whole expensive batch when possible.

## Measurement

The default benchmark uses the earlier deterministic 24 modular powers with a 2048-bit modulus and 1024-bit exponent. Each runtime runs alone, with two warmups and five measured rounds in rotated order. Every output is checked against an independent binary algorithm outside timing. Parsing/lowering, fixture generation, runtime initialization, compilation and native preparation are excluded from steady-state timings. First use is recorded separately, including compilation and the full computation. Schedule/table/Montgomery setup remains inside every call. Marked timing includes normal RiX function binding, guards, live dependency fingerprint/cache lookup and exact input/output conversion.

The earlier direct AOT comparison uses its preserved compiler snapshot; the marked compiler additionally checks live definitions and preserves constructor-copy behavior. Handwritten JS uses the matching window-6/Montgomery-5 algorithm. Native GMP `powm` chooses its own arithmetic algorithm and includes the full N-API BigInt boundary. Raw wall/CPU samples, runtime/machine versions, digests, source fingerprints and cache statistics are stored in the result JSON files.

Apple M4 Pro; Bun 1.4.0 and Node 26.10.0. Medians per batch (window-6 in Bun, Montgomery-5 in Node):

| Path | Bun ms | Node ms |
|---|---:|---:|
| interpreted marked RiX (ordinary interpreter) | 1433.589 | 7902.501 |
| marked RiX, cached compilation | 27.032 | 43.397 |
| earlier direct BigInt AOT | 25.797 | 42.931 |
| handwritten BigInt JS | 24.646 | 40.422 |
| native C/GMP powm | 22.257 | 15.630 |

Cached marked execution is **53.0× / 182.1×** faster than interpretation of the same respective algorithm. First use took **30.461 / 48.672 ms**, including **1.185 / 1.695 ms** compiling and constructing the kernel. Each session built once, made eight compiled calls, had seven cache hits and no fallbacks. Process startup/runtime initialization are excluded.

The marked boundary adds little cost for this large batch. The handwritten and native versions remain faster; GMP uses its own algorithm. Node’s large relative speedup reflects how expensive the Montgomery script is in the interpreter, rather than an improvement over the preceding compiled algorithm.

Results: [Bun](results/marked-bun.md) ([JSON](results/marked-bun.json)); [Node](results/marked-node.md) ([JSON](results/marked-node.json)). These are one-machine initial measurements, not general speed guarantees.

Verification covers 48 differential semantic cases, 118 reference powers including zero bases/exponents, modulus one/even window moduli and 2048-bit inputs, both annotated algorithms, two source mutations, first-use/repeated/rejected caching, dependency invalidation, signed arithmetic, division/index guards, Rational/metadata/size fallback, custom loop limits, sequence identity/copy behavior and effects executed exactly once. It passes in Bun and Node.

Next useful work: integrate the hook with promise-aware RiX function invocation while retaining scheduler/cancellation state; specialize typed numeric loops more generally; cache helper fingerprints by definition identity without losing redefinition guards; measure break-even sizes for scalar versus batch markers; and investigate background compilation/disk caches after the semantics are stable.
