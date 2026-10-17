# Profiling and reducing ordinary RiX interpreter overhead

This experiment profiles the same ordinary Horner script used by `polynomial-core`, then compares three copied interpreters. Every timed environment has byte-identical experimental fast core code, including the private Rational factory, mixed arithmetic paths and polynomial control operation. Production core, RiX and dependency links are unchanged. No compiler, native code, unboxed Horner kernel, registry override or global capture-mode change is used by the candidate interpreter.

## Reproduce

From the repository root, build the preceding experiments first if needed:

```sh
node compiler-experiments/integrated-core/build.js
node compiler-experiments/polynomial-core/build.js
node compiler-experiments/interpreter-overhead/build.js
node compiler-experiments/interpreter-overhead/review.js
node compiler-experiments/interpreter-overhead/tests.js
bun compiler-experiments/interpreter-overhead/verify.js
node compiler-experiments/interpreter-overhead/verify.js
node compiler-experiments/interpreter-overhead/counts.js
node compiler-experiments/interpreter-overhead/profile.js
bun compiler-experiments/interpreter-overhead/bench.js
node compiler-experiments/interpreter-overhead/bench.js
bun compiler-experiments/interpreter-overhead/run.js literals
```

Run tests, profiles and benchmarks separately; run the benchmark runtimes sequentially. `--quick` reduces benchmark fixtures. Building verifies earlier source fingerprints and replaces only this experiment's five generated `tmp` package trees. The extra CLI plugin example fixtures are copied so unchanged diagnostic CLI tests can run. No package install or production link redirection is needed.

The runner accepts `control`, `copy` or `literals`, followed by an optional RiX file path. With no file, it evaluates `2*x^2-3*x+1` at `x=1/3`, yielding `2/9`. The runner interprets ordinary RiX with the default registry and capabilities.

## The candidates

| Variant | Change to the copied interpreter |
|---|---|
| control | Unchanged RiX against the existing fast core |
| copy | Fresh Rational copies use core's existing copy constructor, with guards |
| literals | Copy fix plus a direct decimal-digit Integer literal parser |

RiX's `:=` correctly makes fresh numeric objects so metadata and cells can be independent. However, `shallowCopyValue` and `deepCopyValue` reconstruct Rational values as `new Rational(value.numerator,value.denominator)`. That runs a full normalization/GCD on already reduced values, including a growing Horner accumulator after each iteration.

The candidate uses `new Rational(value)` for plain canonical Rational instances, including interval endpoint copies. That existing core constructor preserves reduction and creates a new object with fresh lazy caches. It retains the existing shallow/deep copying, memoization, alias and metadata-transfer code. Subclasses, shadowed numerator/denominator fields and changed prototype getters keep the general normalized constructor path. It does not share numeric object identity to avoid allocation.

Plain unsigned decimal-digit literals also take the full number parser on every evaluation, even for the loop's repeated `1`. The second candidate returns a fresh `Integer(BigInt(text))` after a digit-only check. Other literal forms retain the original parser; active-base interpretation and registry dispatch are unchanged. There is no shared mutable literal cache.

An additional, explicitly labeled **RiX source control** hoists `coefficients.Len()` into the loop initialization. The default fixture arrays have invariant length/methods. This is a handwritten source change, not an automatic rewrite or an assumption imposed on user code.

## Profiling findings

Node sampling identifies two different cases:

- **Growing Rational denominators:** normalization/GCD beneath RiX value-copy helpers accounts for 79.2% of sampled time for the degree-16 case and 88.6% for the larger case. Both are below 0.1% after the candidate changes (no such samples in the follow-up runs). The matched JavaScript loop spends its time in the scalar fast kernels rather than copy normalization.
- **Integer-only work:** evaluator dispatch, method resolution, multifunction calls/applicability probes and literal parsing dominate. In the original profile, `evaluate` has 12.4% aggregated self time, `resolveMethod` 11.0%, `_callSystemMultifunction` 7.3%, `_prepareVariant` 5.9% and `parseNumber` 6.4%. Self shares are sample estimates, not isolated timings.

One instrumented degree-16 point batch makes **272 fresh Rational copies**, reaching **1,027-bit numerators / 1,024-bit denominators**. The larger batch makes 264 copies, reaching 4,099 / 4,096 bits. The candidate preserves the copy count while removing the costly full normalization at each canonical Rational copy. Overall normalization-GCD call counts fall by 272 / 264 respectively; other calls remain, many with tiny operands. Counts alone do not measure cost.

For the Integer batch, counters record **1,152 calls to the general core number parser** and **34,176 variant-preparation probes**. The decimal literal path removes all 1,152 general-parser calls while still allocating fresh Integer values; it does not remove the variant probes. Remaining cheap Integer comparisons also construct exact relation/enclosure values, explaining why there are still many cheap normalization calls. Method/registry dispatch is still live and customizable.

After the changes, the large Rational follow-up profile spends 66.5% of samples beneath core arithmetic (61.8% self in the fast kernel's GCD). The degree-16 follow-up has more interpreter work left, and Integer-only Horner remains largely interpreter-bound. Thus a specialized combined operation can still help, but the largest Rational boundary penalty was avoidable repeated arithmetic, not just a generic function-call cost.

[Readable profile tables](results/profile-node.md) link all seven raw profiles; [JSON](results/profile-node.json) includes self/stack-inclusive attribution and provenance. These percentages are Node-specific observations. Bun improvements are established by separate clean benchmarks below.

## Clean benchmark results — October 17, 2026

Apple M4 Pro, macOS ARM64; Bun 1.4.0, Node 26.10.0. **Unchanged RiX source** in the three interpreter variants. These are additional gains over the previous optimized core, not gains from substituting a different arithmetic library.

| Workload | Bun control ms | Bun both fixes ms | Speedup | Node control ms | Node both fixes ms | Speedup |
|---|---:|---:|---:|---:|---:|---:|
| Integer degree 32 | 2.7746 | 2.5365 | 1.09× | 3.2837 | 2.8282 | 1.16× |
| Rational points, degree 16 | 2.8986 | 1.0159 | 2.85× | 6.8991 | 1.1478 | 6.01× |
| Rational coefficients/points, degree 16 | 2.9320 | 1.0586 | 2.77× | 7.0448 | 1.1738 | 6.00× |
| Rational points, degree 32 / 128 bits | 13.5867 | 1.3902 | 9.77× | 40.9945 | 2.5501 | 16.08× |
| Zero polynomial, degree 128 | 1.4318 | 1.3379 | 1.07× | 1.6242 | 1.5417 | 1.05× |
| Intervals, degree 8 | 0.3200 | 0.3053 | 1.05× | 0.3322 | 0.3039 | 1.09× |
| Rational coefficients / Integer points | 1.8800 | 1.7884 | 1.05× | 1.9866 | 1.8297 | 1.09× |
| Rational constant | 0.0986 | 0.0879 | 1.12× | 0.1077 | 0.0970 | 1.11× |

The **copy fix alone** gives 2.70× / 5.49× for degree-16 Rational points and 9.10× / 15.35× for the larger Rational case (Bun / Node). The direct Integer literal path adds a smaller improvement and helps cheap loops too. The combined fixes reach 2.85× / 6.01× and 9.77× / 16.08× respectively.

Copying is not uniformly expensive: the zero polynomial's values remain zero, and Rational coefficients at Integer points have at most 7-bit denominators in these fixtures. Their old normalization is cheap. Copy guards/constructor changes alone show no benefit or a small regression there, while the literal path provides modest gains. Intervals likewise have little extra benefit in this small workload. This argues for workload coverage before any production proposal.

The separate, handwritten RiX change that hoists `Len()` gives total speedups of 1.27× / 1.31× for Integer Horner and 3.12× / 6.57× for degree-16 Rational points. It illustrates overhead reduction available in RiX source without changing Horner's mathematics; it assumes invariant coefficient length and method behavior.

For the larger Rational workload, the gap to the matched JavaScript/core loop shrinks from **20.62× to 2.11× in Bun** and **23.77× to 1.48× in Node**, using only the interpreter fixes and unchanged RiX. Degree-16 gaps shrink from 12.77× to 4.48× and 21.76× to 3.62×. Cheap Integer and constant cases retain much larger gaps, so these fixes do not make the interpreter equivalent to a compiled loop.

[Full Bun results](results/overhead-bun.md) ([JSON](results/overhead-bun.json)); [full Node results](results/overhead-node.md) ([JSON](results/overhead-node.json)). Rows include each ablation, the source-hoisted control, and direct JavaScript with the same core methods. Only within-run comparisons are used; timings differ from earlier reports.


## Validation and limits

All **555 unchanged core tests** pass (26 files, 75,706 assertions); core source is byte-identical in every timed variant. All **342 focused RiX tests pass in each of control, copy and literals** (13 files, 883 assertions per run), covering cells/aliasing, constructor captures, collection values, identity, number notation, numeric regressions, function returns, scopes, ranges, diagnostics/CLI/trace, async safety, numeric adapters and semantic types.

An additional **168 polynomial cases across all three variants**, plus direct boundary checks, pass in both Bun and Node. Checks cover exact numeric classes and values, input mutation, fresh object identity, shallow/deep metadata, memoized graphs, aliases, subtype/shadowed-field/prototype-getter fallback, formatting/cache behavior, JSON revival, literal identity/parser fallbacks, live registry overrides, evaluation budgets and async evaluation. The eight full benchmark workloads also verify exact outputs outside timing. The complete RiX suite was not run.

[Test summary and full logs](results/tests.json), [Bun verification](results/verification-bun.json), [Node verification](results/verification-node.json). The changes are small experimental patches; a production proposal would still need broader RiX/plugin coverage and multiple-process performance runs.


## Measurement details

The same eight deterministic polynomial fixtures as `polynomial-core`: Integer/Rational coefficients and points, larger Rational operands, zero/constant polynomials and intervals. Seven measured samples, two warmups, repeats calibrated to 15 ms, rotated variant order. Timed work includes fresh RiX contexts/function definitions, all interpreted loops/operators/copies, and complete output allocation. Imports/build, parsing/lowering, fixtures and validation are excluded. A direct JavaScript Horner loop using the identical core methods remains the control.

Profiling uses Node's built-in V8 sampling profiler (500 microseconds, 1.5 seconds per case after warmup). It saves raw `.cpuprofile` files and a summary with self/stack-inclusive attribution. Self time is merged by function/source line; inclusive entries are separate stacks and must not be summed. Diagnostic percentages include profiler/host/GC samples; they are not a substitute for clean elapsed benchmarks. Bun/Node benchmark processes contain no counter imports or active profiler. Counters run in separate instrumented package trees and record one full evaluation, with setup excluded.

Every calibration/warmup/measured batch checks its final complete output outside timing against control, including core classes and exact endpoints. The original Horner algorithm/operation order is unchanged in the three interpreter rows. Measurements are one process per runtime on one machine; small differences can be noise. Source fingerprints and input/output digests are saved in the JSON reports.

[Counter report](results/counts.json), [sampling summary](results/profile-node.json), [copy-only patch](patches/copy.patch), [combined patch](patches/literals.patch), [build fingerprints](results/build-provenance.json).

## Promising next steps

1. Profile numeric loop dispatch after the copy fix, especially repeated method lookup, variant probes, and Integer comparison-to-enclosure conversion. Preserve custom operators, type/proto extensions, priority/ambiguity and trace behavior when testing any shortcut.
2. Compare structured `.Reduce()`/iteration patterns with repeated `.Get()` plus `.Len()`, keeping callback/capture semantics explicit. A general method cache would need mutation/version invalidation.
3. Prototype guarded execution plans only after separating these costs. Keep combined core operations as a control: they already show what remains possible when loop machinery is removed.
