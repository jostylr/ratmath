# Core arithmetic and combined-operation experiments

This folder measures core-style improvements without changing production RatMath or RiX. The candidates are ordinary JavaScript and exact BigInt arithmetic. They separate faster scalar operations, skipping mathematically redundant normalization, better RiX algorithms, and giving a helper an entire computation.

## Run

From the repository root, with the existing dependencies:

```sh
bun compiler-experiments/core-arithmetic/emit.js
bun compiler-experiments/core-arithmetic/verify.js
node compiler-experiments/core-arithmetic/verify.js
bun compiler-experiments/core-arithmetic/bench.js
node compiler-experiments/core-arithmetic/bench.js
bun compiler-experiments/core-arithmetic/combo-bench.js
node compiler-experiments/core-arithmetic/combo-bench.js
bun compiler-experiments/core-arithmetic/demo.js
node compiler-experiments/core-arithmetic/demo.js
```

Use `--quick` for smoke benchmarks. No native compiler or new dependency is needed. The two full benchmarks use seven measured samples and two warmups, with calibrated repetitions targeting 15 ms per sample and rotated path order within each workload. Each runtime runs alone; every batch result is checked outside timing. Fixtures vary across 64 pairs per arithmetic batch and across each polynomial point batch. Parsing, fixtures, input construction, runtime initialization, snapshot imports and compilation are excluded. Actual operation calls, allocations and results are timed. Plan preparation is timed unless a row explicitly says cached; cold compilation and plan setup are recorded separately. JSON reports retain raw wall/CPU samples, medians/ranges, repetition counts, machine/runtime versions and source/input fingerprints.

## Scalar candidates

[arithmetic.js](arithmetic.js) exposes Integer floor division, positive-divisor floor modulo, remainder and combined quotient/remainder. Floor operations are compared with equivalent compositions of existing core methods, because `Integer.divide()` returns an exact quotient rather than its floor. Existing `Integer.modulo()` is already a direct BigInt remainder, so it is compared separately and its signed semantics are retained. For example, `-7 % 3` as remainder is -1, while floor modulo is 2. The experiment does not change either definition.

Rational candidates handle mixed Integer operands directly, use equal-denominator addition/subtraction, reduce addition through the denominator GCD, and cross-cancel multiplication/division. There are two distinct implementation strategies:

1. **Public helper:** compute a reduced pair and return today's production `Rational`. Its public constructor normalizes again, so some of the savings disappear and redundant work can cause regressions.
2. **Private-factory prototype:** a copy of `rational.js` inside `generated/` uses the same arithmetic kernels and an experimental private constructor for a pair proved reduced. It allocates a zero Rational, then sets its canonical private fields; lazy caches start empty. The original constructor's general normalization remains unchanged. A second, unmodified class copy is measured as a control.

The copied classes are **different JavaScript classes**, not drop-in values for production core or RiX. They demonstrate changes that could be implemented *inside the real Rational class* later. Public helpers, polynomial helpers and RiX host capabilities return current core objects. Snapshot generation records the original source hash and all transformations. No prototype or shared production registry is patched.

The reduced-pair kernels are internal. Their callers require canonical inputs with positive denominators; no public flag lets callers assert that arbitrary fractions are reduced. Integer addition/subtraction preserves coprimality, and the cancellation formulas prove the output invariant. Checks cover positive denominators, zero normalization, signed values, exact equality, division errors and formatting. A production implementation would also need the full core compatibility suite before migration.

## How RiX can communicate a combined computation

These are implemented experiment APIs, with existing RiX syntax:

```rix
## Explicit one-shot operation: one boundary for a whole point batch.
.polynomial(coefficients,points);

## Reusable and inspectable plan in an exploratory context.
plan := .preparePolynomial(coefficients);
plan.Get("degree");
plan.Evaluate(points);

## Data can describe an operation, rather than hiding it in operators.
request := {= operation="polynomial",coefficients=coefficients,points=points };
.compute(request);
```

Coefficients are ordered highest degree first. The helper builds a common coefficient denominator, evaluates Horner numerators with BigInts, and constructs one result per point. A plan snapshots the coefficients at preparation time; editing the original sequence does not silently change it. The JavaScript plan's `descriptor` exposes the algorithm, exactness, degree, scaled coefficient numerators and common denominator. Batch and reusable-plan APIs let RiX retain inspection, parameter experimentation and orchestration while arithmetic is offloaded. The data-descriptor path makes the mathematical operation explicit; this is not a general optimizer for arbitrary expressions.

`rix.js` registers these functions only in a copied local Host capability context. Production `.Core` is untouched. Capability calls run synchronously in this experiment.

## Keeping the algorithm in RiX

[horner.rix](scripts/horner.rix) is an ordinary RiX implementation of Horner evaluation. [powers.rix](scripts/powers.rix) recomputes powers independently, giving an algorithm comparison: Horner needs O(degree) arithmetic steps, rather than O(degree²) for that deliberately simple power-sum implementation. This is separate from interpreter/compiler overhead.

[fraction-horner.rix](scripts/fraction-horner.rix) carries an unreduced numerator and denominator as two Integers and performs division once at the end. It targets nonempty Integer coefficients and Rational points. The algorithm is still authored and editable in RiX. [fraction-horner-marked.rix](scripts/fraction-horner-marked.rix) adds `## @bigint` to just that Integer kernel; the existing experimental compiler accelerates it, while RiX retains point traversal, numerator/denominator extraction and final result construction. Whole-number answers may return an Integer after the final division, whereas ordinary Rational Horner returns a Rational; comparisons check exact numeric equivalence. General Rational coefficients use the ordinary Horner/host-plan paths.

This provides three levels of exploration: change the RiX algorithm; compile a suitable numeric function; or select an explicit combined-operation helper. Polynomial intent does not require new parser syntax or replacing the exploratory environment.

The current production-object fast paths can also be selected in a private RiX operator registry. Their measurements show what remains when scopes and interpretation are retained. Snapshot private-factory objects are deliberately not injected into RiX.

## Growth and semantics

Deferring normalization can retain large unnecessary denominators. The zero-polynomial stress case records unreduced versus reduced bit lengths and compares a plan that prunes leading zero coefficients. That simplification is valid for exact point arithmetic and avoids constructing useless huge intermediates. It is an explicit JavaScript plan option in this prototype. Power-sum evaluation is omitted for this stress case because recomputing all those powers is not the question being tested.

Intervals fall back to the existing core Horner operation order. Horner and expanded power sums can produce different interval enclosures, so the experiments do not declare those forms interchangeable for interval inputs. Arithmetic candidates also retain original methods for unsupported/decorated inputs; the measured fast kernels are for plain exact values.

## Initial findings — October 14, 2026

Apple M4 Pro, macOS ARM64; Bun 1.4.0 / Node 26.10.0. Selected scalar speedups:

| Candidate and comparison | Bun | Node |
|---|---:|---:|
| 2048-bit floor division vs current quotient/floor composition | 19.15× | 34.21× |
| 2048-bit floor modulo vs current composition | 36.73× | 65.99× |
| 256-bit Rational + Integer: private factory vs snapshot control | 36.17× | 92.82× |
| 256-bit equal-denominator addition: private factory vs control | 1.41× | 1.45× |
| 256-bit unrelated multiplication: private factory vs control | 1.24× | 1.21× |
| 64-bit cancellation division: private factory vs control | 0.76× | 0.93× |

Existing Integer remainder is already a direct BigInt operation and stays essentially unchanged on the larger inputs. Exact divisions avoid Rational construction already, so their floor-division gains are much smaller. Do not interpret the floor-modulo gain as a gain over the existing remainder method.

Mixed Rational/Integer addition is the clearest private-factory opportunity: adding an Integer to a canonical Rational preserves coprimality, so the final GCD is redundant. On the 1024-bit fixture the private candidate was 155× / 498× faster than its snapshot control; this is a specific expensive-normalization case, not a general library speedup. Public helpers retained that normalization and were approximately unchanged there. Cross-cancellation has smaller, variable benefits and some regressions; adding it before the public constructor can perform unnecessary GCD work twice.

For degree-16 polynomials with Integer coefficients and 16 Rational points, full-batch medians:

| Path | Bun ms | Node ms |
|---|---:|---:|
| RiX power sum | 34.4018 | 102.3287 |
| JS Horner, core methods | 3.2773 | 11.2177 |
| RiX Horner | 6.0439 | 18.1130 |
| RiX Integer-pair Horner | 1.3595 | 2.0442 |
| RiX marked Integer-pair Horner | 0.8080 | 1.4640 |
| RiX one batch capability | 0.2368 | 0.7567 |
| snapshot control Horner | 3.2741 | 11.3241 |
| snapshot candidate Horner | 0.2076 | 0.3042 |

Horner alone improves the deliberately simple power-sum RiX algorithm by about 5.7× in both runtimes. Changing the accumulator representation in RiX adds another 4.4× / 8.9× over ordinary RiX Horner; compiling that Integer kernel gives 7.5× / 12.4× overall. A single host batch gives 25.5× / 23.9× over ordinary RiX Horner while returning current core objects. The optimized snapshot class is faster still on Node, demonstrating that strategically cancelling small factors while skipping proved redundant reductions can beat blindly deferring everything to one large final GCD.

Integer-only Horner is already inexpensive in current core JavaScript. More general public guards and polynomial planning can slow it down; the benefit of compiled RiX or a host batch there is mainly avoiding interpreter work. For the Integer batch, per-point offloading costs 3.5–5.6× as much as one batch call. For the heavier Rational batch, that boundary difference is only about 7–23% because the arithmetic dominates.

The zero-polynomial stress case retains a 16,341-bit unreduced denominator for an answer of zero. Cached fused evaluation is roughly 1.7–1.9× slower than current core Horner there. Pruning leading zero coefficients avoids that work. Common-denominator planning may also grow for unrelated Rational coefficient denominators; the current Rational-coefficient workload uses small denominators 3, 5 and 7, so wider independent denominators remain an important next test.

The practical interface direction is to keep ordinary RiX algorithms and the marked Integer-kernel path, alongside explicit whole-operation capabilities and reusable plans. Mathematical intent (polynomial coefficients, order, exact arithmetic and chosen strategy) can be data visible to the exploratory environment. This experiment does not automatically recognize arbitrary operator chains or choose a backend.

Verification passed in Bun and Node: 1,994 scalar cases and 88 polynomial points across multiple paths, including snapshot canonicality/formatting, signed errors, types, compiled RiX kernels, descriptors/plans, coefficient snapshot behavior and interval fallback. All 280 recorded production source hashes remain unchanged.

Next experiments: implement the private-factory prototype inside a temporary integrated core checkout and run the full compatibility suite; compare proof-aware versus deferred/adaptive polynomial reduction; test larger/unrelated coefficient denominators and degrees; measure repeated-process distributions; and extend the RiX compiler to return batches of fraction pairs so its boundary cost can approach the host batch.

## Full results

Arithmetic: [Bun](results/arithmetic-bun.md) ([JSON](results/arithmetic-bun.json)); [Node](results/arithmetic-node.md) ([JSON](results/arithmetic-node.json)). Combined operations: [Bun](results/polynomial-bun.md) ([JSON](results/polynomial-bun.json)); [Node](results/polynomial-node.md) ([JSON](results/polynomial-node.json)).

These are initial measurements on one machine, with input-specific speedups. The private factory prototype is not a production patch. Next decisions should be based on the separate scalar, whole-algorithm and boundary measurements, including the regressions, rather than attributing every improvement to faster BigInt arithmetic.
