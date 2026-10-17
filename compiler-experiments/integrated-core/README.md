# Ordinary RiX running against a complete experimental core

This experiment copies the complete core source, exports and tests into isolated package trees and runs unannotated RiX against them. All numeric classes, parsers, intervals, type-promotion utilities and evaluator modules inside an environment resolve the same `@ratmath/core` package. This removes the class-identity limitation of the previous standalone Rational snapshots.

Everything generated lives under `integrated-core/tmp/`; production source files and dependency links are unchanged. Scripts reconstruct the copies from the current local checkout without installing packages. Results and source fingerprints are retained under `results/`.

## Reproduce

From the repository root:

```sh
node compiler-experiments/integrated-core/build.js
node compiler-experiments/integrated-core/review.js
node compiler-experiments/integrated-core/tests.js
bun compiler-experiments/integrated-core/verify.js
node compiler-experiments/integrated-core/verify.js
bun compiler-experiments/integrated-core/bench.js
node compiler-experiments/integrated-core/bench.js
bun compiler-experiments/integrated-core/run.js candidate compiler-experiments/integrated-core/scripts/demo.rix
```

The build replaces **only its own three generated `tmp` package trees**. Run tests before benchmarks and run benchmark processes sequentially. Add `--quick` for a smoke benchmark. `run.js` accepts `baseline`, `candidate` or `candidate-wired` and a self-contained RiX script. It uses ordinary synchronous interpretation, with the standard default registry and capabilities; no function markers, compiler or Host arithmetic helpers are involved. `RATMATH_ROOT` can point the build at another source checkout; omit it when installed here.

## Three controlled environments

| Environment | Core | RiX |
|---|---|---|
| baseline | Unchanged package copy | Unchanged source copy |
| candidate | Private Rational factory and arithmetic fast paths; new Integer floor methods | Identical to baseline |
| candidate-wired | Same optimized core | Only copied `INTDIV`, `MOD`, `DIVMOD` delegate plain Integer operands to the new core APIs |

The candidate adds an internal BigInt cancellation kernel copied from the preceding experiment. A private Rational factory allocates a zero Rational, then sets its canonical fields after arithmetic has proved the result reduced. General construction is unchanged. Rational addition/subtraction uses Integer and equal/shared-denominator paths; multiplication/division cross-cancel. Guarded mixed Integer-left operations use that factory too. Certified approximations, subclasses, shadowed numeric fields and unsupported operands retain the original method branches.

There is no public constructor switch for trusting arbitrary fraction pairs. The added internal Integer-left arithmetic entry validates its typed operands; the reduced-result factory itself remains private. Lazy formatting caches start empty and the result sign cache is initialized consistently.

New Integer `floorDivide`, `floorModulo` and `divmod` methods have explicit semantics. Existing exact `divide` and signed-remainder `modulo` remain unchanged. Merely adding these methods to core cannot change RiX operators that do not call them; the third environment measures that separate integration step. Its non-Integer paths retain the existing built-ins.

The build includes independent copies of all core classes, the full core tests and the RiX sources/plugins/tests needed for numeric integration checks. It links each environment's `@ratmath/core` to its local copy; other existing dependencies are reused read-only. `load.js` asserts the resolved path and verifies that RiX literals belong to the local Rational class. No loader intercepts or prototype monkey-patches are used.

## Validation

The original core test files are copied unchanged. Full Bun suites run against the baseline and candidate packages, covering ordinary arithmetic, promotion, intervals/sets, fractions, decimal formatting, parser/serialization contracts, certified approximations and other core behavior. Test durations are recorded only as test-run metadata, not performance benchmarks.

Six unchanged RiX numeric test files also run against all three environments, including numeric regressions, identity comparison, certified values, range arithmetic, numeric adapters and real-number interoperability plugins. Differential verification compares 574 ordinary RiX expressions/errors with baseline results and exact types. Additional checks cover local class identity, formatting caches, JSON revival, interval interoperability, mixed promotion, subclasses/shadowed fields, fake Integer fallback, floor signs and unchanged exact-division/remainder behavior.

The focused integration suite is not the complete RiX suite. These results support the experiment; promoting the changes to production would require a separate reviewed change and broader compatibility/performance checks.

## Results — October 16, 2026

Apple M4 Pro, macOS ARM64; Bun 1.4.0 and Node 26.10.0. Core-only speedups for unchanged interpreted RiX:

| Workload | Bun | Node |
|---|---:|---:|
| rational-horner | 2.16× | 2.52× |
| rational-coefficients-horner | 2.12× | 2.59× |
| larger-rational-horner | 2.69× | 2.82× |
| mixed-rational-loop-256 | 1.94× | 2.46× |
| mixed-rational-loop-1024 | 2.69× | 2.89× |
| zero-rational-horner | 0.98× | 1.00× |
| interval-horner | 0.94× | 1.04× |

For the degree-16 polynomial at 16 Rational points, Bun improves from 5.884 to 2.721 ms and Node from 17.664 to 7.000 ms with only the core substitution. The 1024-bit-denominator mixed loop improves from 46.545 to 17.297 ms / 153.080 to 52.926 ms. This is a benefit to ordinary RiX scripts without annotations or offloading, but smaller than the preceding isolated arithmetic-kernel speedups: interpreter work and object/copy boundaries remain.

Integer methods need the copied built-in integration to affect RiX operators:

| Ordinary RiX workload | Bun speedup with wiring | Node speedup with wiring |
|---|---:|---:|
| integer-division-inexact | 15.29× | 24.66× |
| integer-modulo-inexact | 25.64× | 39.42× |
| integer-division-exact | 1.01× | 0.97× |
| integer-modulo-exact | 1.93× | 1.70× |
| binary-modular-powers | 8.54× | 15.87× |

Core-only leaves the Integer-heavy workloads essentially unchanged. With the three copied built-ins wired, binary modular powers improve from 91.749 to 10.742 ms in Bun and 258.191 to 16.273 ms in Node (6 powers, 1024-bit modulus, 512-bit exponent). Division/modulo rows use 128 varying 2048-bit numerators and a 1024-bit divisor; exact floor division already avoids fraction construction and gains little.

Integer-only Horner and the zero polynomial are effectively unchanged. The small interval workload is about 6% slower in Bun and 4% faster in Node; cross-cancellation and guards do not universally improve cheap arithmetic. These initial, single-machine, single-process measurements should not be generalized to every workload.

Validation: **555 core tests passed in each of baseline and candidate (26 files, 75,706 assertions per run)**. **90 focused RiX numeric tests passed in each of all three environments (6 files, 530 assertions per run)**. **574 differential RiX expressions/error cases passed in both Bun and Node**, plus direct checks for canonicality, class identity, intervals, type promotion, serialization, formatting, guarded fallback and unchanged legacy Integer semantics. All timed outputs also match baseline exactly.

The experimental core therefore provides a real, transparent improvement for Rational-heavy RiX, while compilation and combined-operation APIs remain complementary options for eliminating interpreter work. This experiment does not modify production core or production RiX.

## Benchmarks

Thirteen ordinary RiX workloads cover Integer/Rational Horner, Rational coefficients, larger Rational operands, a zero polynomial, intervals, mixed Rational/Integer scoped loops, exact/inexact Integer division/modulo and binary modular powers. Each environment gets its own correctly typed fixtures representing identical numbers. Every calibration, warmup and timed output is compared with baseline, including exact result classes and interval endpoints.

Default: seven measured samples and two warmups per path; calibrated repetitions target 15 ms per sample, and variant order rotates within each workload. Each runtime runs alone. Timing includes fresh contexts, function binding, interpreted loops/calls/operators, all arithmetic and output allocation. Package build/import, fixture construction, parsing/lowering and verification are excluded. Algorithms and operation order do not change between environments. Wall/CPU samples, repeat counts, versions, input/output digests and source hashes are recorded in the JSON reports.

Full results: [Bun](results/ordinary-bun.md) ([JSON](results/ordinary-bun.json)); [Node](results/ordinary-node.md) ([JSON](results/ordinary-node.json)). Test summaries: [JSON](results/tests.json), with complete per-environment text logs alongside it. Build fingerprints: [provenance](results/build-provenance.json).

Review the exact copied-package changes: [core patch](patches/candidate-core.patch) and [optional RiX wiring](patches/integer-wiring.patch). These are review artifacts; the build applies equivalent transformations only to its generated copies.
