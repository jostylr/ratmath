# Integer method/operator dispatch experiments

Bun **1.4.3**, Node **26.12.0**, Apple M4 Pro / macOS ARM64. All work is isolated to `compiler-experiments`; production sources and dependency links are unchanged. Every new timed variant uses byte-identical core code and starts from the preceding Rational-copy/decimal-literal interpreter candidate.

**Parser follow-up:** the `Rational("-.5")` failure recorded in these historical
reports was subsequently fixed and tested in experimental and production core.
See [the fix and full validation](../rational-decimal-fix/README.md). Rebuild the
preceding snapshot chain after a production change; old result files retain the
source fingerprints and failure observed at measurement time.

## Reproduce

From the repository root, build the previous experiments if needed:

```sh
node compiler-experiments/integrated-core/build.js
node compiler-experiments/polynomial-core/build.js
node compiler-experiments/interpreter-overhead/build.js
node compiler-experiments/integer-dispatch/build.js
node compiler-experiments/integer-dispatch/review.js
node compiler-experiments/integer-dispatch/refresh.js
node compiler-experiments/integer-dispatch/tests.js
bun compiler-experiments/integer-dispatch/verify.js
node compiler-experiments/integer-dispatch/verify.js
bun compiler-experiments/integer-dispatch/bench.js
node compiler-experiments/integer-dispatch/bench.js
bun compiler-experiments/integer-dispatch/run.js comparisons
```

Run benchmark processes sequentially, after tests. Use `--quick` on the new benchmark for smaller smoke fixtures. `run.js` accepts one of the five variants followed by an optional ordinary RiX file. With no file it computes the sum of 0 through 99 (`4950`). No annotations or compilation are involved.

The builder checks source fingerprints and replaces only its five generated `tmp` variant trees. It copies dependencies using local package links, without package installation or changes to production resolution. The earlier snapshots must match the current production checkout; rebuild them if that checkout changes.

## Candidate changes

| Variant | Copied interpreter changes |
|---|---|
| base | Previous fresh Rational-copy / decimal Integer-literal fixes |
| methods | Base plus a bounded cache of method-name spellings |
| dispatch | Base plus fewer temporary objects/arrays during operator selection |
| both | Method and dispatch changes |
| comparisons | Both changes plus direct comparisons of guarded plain Integers inside existing comparison implementations |

### Method names, not resolved methods

`resolveMethod` normally builds a `Set`, several prefixed strings and an array for every lookup. The `methods` candidate retains up to 256 spelling arrays keyed by string name. It still reads receiver metadata, semantic trait/type prototypes, current system extensions and the current built-in prototype on every call. It never retains a resolved callable, receiver, prototype or capability result.

Names retain original precedence and case behavior. Non-string names retain the original coercion path. Cache clearing changes only allocation work. Instance methods, `_proto`, semantic `__proto`, prototype entries, extension registration and capability visibility remain live. This deliberately removes a smaller, safe portion of lookup overhead rather than assuming methods are immutable.

### Operator dispatch allocations

Every applicability/normalization probe still runs in its original order. Priorities are read only after all probes, including priority getters that can have observable effects. Finite priorities retain the original highest-priority/tie behavior and error text. A common call with no finite matching priority avoids constructing a throwaway prioritized array.

Ordinary value-only calls also avoid allocating the internal `{value,args,variant}` result envelope. `invokeWithVariant`, used by operations such as plugin-aware Min/Max, retains the complete normalized-argument/selected-variant envelope. Native preemption, tracing and thrown errors are preserved. A host override of the internal invocation hook takes the original envelope path.

This is not a cache of selected operator variants. Later `installVariant`, direct entry changes, `override`/`restore`, priorities and custom operators continue through the normal selection path. In particular, it does not skip apparently inapplicable custom probes.

### Plain Integer comparisons

The additional comparison candidate runs inside `relationDecision`, after registry dispatch. When operands have the standard Integer prototype/value getter and no own `value` or `toRational` override, it compares their BigInts directly. This avoids constructing rational relation/enclosure objects for ordinary loop conditions. Custom operator variants get their normal opportunity first; subclasses and altered Integer conversion/value access use the existing implementation. Intervals, certified values and other numeric families retain their original relation logic.

## Refreshed prior benchmarks

[The refresh report](results/refresh/README.md) contains new runs of all three recent harnesses: integrated core (13 workloads), combined polynomial operations (8), and interpreter overhead (8), in both runtimes. Input digests, exact expected-output digests and harness fingerprints match the historical reports. The historical files were restored byte-for-byte after collecting the refreshed reports into this folder.

The refreshed results remain broadly consistent with earlier findings. Some Bun polynomial paths are faster in this run, while several ordinary interpreted rows are slightly slower. Node's selected rows are mostly similar. These are single-process observations; an old/new timing ratio does not isolate a runtime upgrade from JIT, thermal or other machine-state variation. Bun's raw `process.versions.node` is its compatibility value, not the separately installed Node runtime version.

## New benchmark results

All ratios below compare with **base on the same updated runtime**, which already includes the preceding Rational-copy and literal-parser improvements. The RiX program and fast core are unchanged between the five variants.

| Workload | Bun base ms | Bun all changes ms | Speedup | Node base ms | Node all changes ms | Speedup |
|---|---:|---:|---:|---:|---:|---:|
| integer-horner | 2.6375 | 2.1482 | 1.23× | 3.1992 | 2.5506 | 1.25× |
| integer-accumulator | 1.8834 | 1.9426 | 0.97× | 2.7169 | 2.4369 | 1.11× |
| integer-comparisons | 1.7007 | 1.5556 | 1.09× | 2.1479 | 1.9685 | 1.09× |
| len-get-sum | 1.0348 | 0.7786 | 1.33× | 1.2683 | 1.0114 | 1.25× |
| custom-Get-sum | 1.0742 | 0.8272 | 1.30× | 1.2358 | 0.9836 | 1.26× |
| custom-ADD-accumulator | 1.1095 | 1.0500 | 1.06× | 1.3954 | 1.3067 | 1.07× |
| rational-horner | 1.0328 | 0.8533 | 1.21× | 1.2184 | 1.0728 | 1.14× |
| interval-horner | 0.2928 | 0.2511 | 1.17× | 0.3398 | 0.3175 | 1.07× |
| larger-rational-horner | 1.3766 | 1.2560 | 1.10× | 2.7278 | 2.5952 | 1.05× |

The strongest isolated result is the **method-name cache**: Integer Horner improves 1.15× / 1.22× (Bun / Node), Len/Get traversal 1.16× / 1.23×, and custom-Get traversal 1.19× / 1.26×. It avoids repeated syntax allocation without retaining any selected method, so method mutations still take effect immediately.

The **dispatch-only** change is mixed. It ranges from about 0.95× to 1.05× in Bun and 0.96× to 1.11× in Node across these rows. It does not justify a broad claim of faster dispatch by itself. The combined method/dispatch variant gives 1.20× / 1.24× for Integer Horner. Keeping all custom probes preserves behavior but limits the potential gain.

Adding plain Integer comparisons takes that Horner result to **1.23× / 1.25×** and Len/Get traversal to **1.33× / 1.25×**. This has a clearer incremental benefit in Bun's Len/Get case; in Node it adds little or regresses slightly in several rows. The pure accumulator is about 3% slower in Bun with all changes, while improving in Node. This is a targeted improvement for method-heavy loops, not a universal loop speedup.

The custom-Get and custom-ADD rows retain their active overloads and exact base results. All finite-priority operator probes still run. Remaining interpreter evaluation, scope/cell handling, full method-resolution layers, generic applicability probes and core work still account for most of the larger gap to direct JavaScript. These experiments do not provide a general cache of operator selections or compiled loop plan.

[Full Bun ablations](results/dispatch-bun.md) ([JSON](results/dispatch-bun.json)); [full Node ablations](results/dispatch-node.md) ([JSON](results/dispatch-node.json)). Small differences need independent process repeats before a production decision. The simplest method-name cache is the most promising candidate to review separately; the extra dispatch/comparison changes should remain separately measurable.


## Verification and the core parser finding

All **337 focused RiX tests pass in each of five variants** (14 original files; 781 assertions per run), covering methods, operator priority/normalization, custom source/plugin operators, semantic types, cells/copies/identity, constructor captures, numeric/range behavior, async method callbacks, returns, literals and diagnostics/CLI/trace. The three dispatch-changing variants were rerun after preserving the observable second normalized-argument read for custom `prepare` getters. These test processes ran separately from every performance measurement.

Additional checks pass in **both Bun and Node**: 45 workload executions across the five copies, 144 signed/large Integer relation cases per variant, warmed instance/semantic/builtin/extension method mutations, spelling precedence, 300-name cache eviction, non-string coercion counts, override/restore, all-probe order, custom comparison precedence, normalized arguments and getters, dynamic priority getters/ties, trace events, native preemption, host dispatch hooks, empty dispatch, own Integer conversion/value fallback, source custom operators and async callbacks. All timed outputs also match base exactly, including result classes.

[Test summary and original-suite logs](results/tests.json), [Bun checks](results/verification-bun.json), [Node checks](results/verification-node.json). The complete RiX suite was not run. Core source remains byte-identical across all five variants, including the unchanged constructor described below.


The core suite has **554 passes and one failure** under the updated Bun: the signed string constructor test for `new Rational("-.5")`. The constructor splits it into integer part `"-"`, then calls `BigInt("-")`, which throws. `new Rational("-0.5")` and `new Rational("-0..1/2")` work.

The same failure is reproduced by directly importing **unchanged production core** in both Bun 1.4.3 and Node 26.12.0. It does not originate in the copied dispatch changes. This experiment does not change the parser or suppress the failing test; `tests.js` returns a failing exit code for the full suite while retaining all separate RiX test results. [Bun reproduction](results/core-parser-bun.json), [Node reproduction](results/core-parser-node.json), [reproducer](core-parser-repro.js).

## Methodology and scope

Nine workloads: Integer Horner, a scalar accumulator, repeated comparisons, repeated Len/Get traversal, a custom Get implementation, custom priority-based ADD, and Rational/interval/larger-Rational regression controls. The custom ADD workload intentionally adds one to every addition, including index increments; variants execute that same overloaded program, not ordinary arithmetic. Custom registrations are prepared outside timing and remain active throughout.

The new benchmark uses nine measured rounds and three warmups, calibrated repeats targeting 15 ms, and rotated variant order per workload. Timing includes fresh contexts/function definitions, interpreted loops and calls, core arithmetic/copies, dispatch and output allocation. Build/import, parse/lower, fixture creation, custom registration and verification are excluded. Each calibration/warmup/measured batch checks its final complete output and exact result classes against base outside timing. There is no profiler or counter instrumentation in timed copies.

The existing harness refresh uses each harness's original round/warmup counts. Both old and new timings are retained, with versions, machine details, source/input/result fingerprints, medians/ranges, wall/CPU samples and repeat counts. Results are initially from one process per runtime on one machine; small differences are not performance guarantees. Changes are experimental and have not been proposed for production.

[Review patches](patches/both.patch) show changes relative to the previous interpreter candidate; [comparison extension](patches/comparisons.patch), [build provenance](results/build-provenance.json).
