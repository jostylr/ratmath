# Combined polynomial evaluation inside the experimental fast core

This extends the complete copied core from `integrated-core`. RiX Horner and every combined-operation path resolve the **same local core classes, private Rational factory and scalar fast paths**. Production core, RiX source and dependency links stay unchanged. Generated packages live only in `polynomial-core/tmp/combined`.

## Reproduce

From the repository root, build the existing fast core first if needed:

```sh
node compiler-experiments/integrated-core/build.js
node compiler-experiments/polynomial-core/build.js
node compiler-experiments/polynomial-core/review.js
node compiler-experiments/polynomial-core/tests.js
bun compiler-experiments/polynomial-core/bench.js
node compiler-experiments/polynomial-core/bench.js
bun compiler-experiments/polynomial-core/run.js
```

Run benchmarks sequentially, after tests. `--quick` makes smaller smoke workloads. The polynomial builder verifies the existing copy/source fingerprints and replaces only its own generated package tree. It does not rebuild or rewrite the preceding experiment. No package installation is needed. If source fingerprints changed, rebuild `integrated-core` before rebuilding this experiment.

The local runner installs four explicit host capabilities. Use them in RiX:

```rix
coefficients := [2,-3,1];  ## 2*x^2 - 3*x + 1
points := [0,1/3,2/3,1];
.polynomialBatchFused(coefficients,points);
```

This returns `[1, 2/9, -1/9, 0]`, with ordinary core numeric objects in an ordinary RiX sequence. For a saved script:

```sh
bun compiler-experiments/polynomial-core/run.js path/to/script.rix
```

`.polynomialOne(coefficients,x)` uses scalar core methods; `.polynomialFused(coefficients,x)` uses the combined fraction path. `.polynomialBatch` and `.polynomialBatchFused` also move point traversal into core. RiX can still build coefficients, explore algorithms, define functions and inspect results. These capabilities are installed only by this experiment's runner, not by the production CLI.

## What is combined

Copied core exports `evaluatePolynomial(coefficients,x)`, `evaluatePolynomialFused(coefficients,x)` and `evaluatePolynomialBatch(coefficients,points,{fused:false})` for JavaScript arrays containing core objects. Coefficients are **descending**, including the leading coefficient and constant. Each version starts at Integer zero and performs exactly `r = r*x + coefficient` for every coefficient, including the first.

- The method operation calls `.multiply(x).add(coefficient)` in a JavaScript loop. It uses exactly the earlier fast arithmetic paths and allocates the normal intermediate results.
- The fused operation retains numerator/denominator BigInts between steps, using the **same reduced multiplication and addition kernels at every step**. A guarded static method inside the copied Rational class invokes its private factory once for the final result. All-Integer inputs use a BigInt accumulator and return Integer. It does not delay reduction, prune zeros, change Horner's order or cache coefficients.
- Intervals and numeric subclasses fall back to the method operation. Interval operation order/enclosures stay the same; subtype fallbacks retain the existing core methods' results or errors. The explicit API supports Integer, Rational and RationalInterval objects; other representations and sparse coefficients are rejected.

Empty coefficient lists return Integer zero. A nonempty evaluation involving Rational inputs retains Rational result identity, even when the value is integral or zero. Formatting and JSON revival work as usual. Input arrays and numeric objects are not mutated. Batch output is wrapped with RiX's normal sequence constructor, preserving methods such as `.Len()` and `.Get()`.

These are explicit core operations with core arithmetic semantics. They do not consult custom RiX operator or numeric-method extensions, and the runner does not automatically rewrite arbitrary RiX functions. The benchmark uses the default arithmetic environment. No production capability configuration or public unsafe reduced-fraction constructor is added; the review patch is experimental JavaScript, not a production API/types proposal.

## Results — October 16, 2026

Apple M4 Pro, macOS ARM64; Bun 1.4.0, Node 26.10.0. These are medians in milliseconds for the entire point batch. **RiX Horner already uses the optimized core**, so speedups here are additional to the preceding core-only improvements.

### Bun

| Workload | RiX Horner ms | Core batch ms | Speedup | Fused batch ms | Speedup |
|---|---:|---:|---:|---:|---:|
| Integer, degree 32 / 32 points | 3.1292 | 0.0393 | 79.64× | 0.0347 | 90.09× |
| Rational points, degree 16 / 16 points | 3.1874 | 0.2451 | 13.00× | 0.2237 | 14.25× |
| Rational coefficients and points, degree 16 / 16 points | 3.4903 | 0.2990 | 11.67× | 0.2822 | 12.37× |
| 128-bit Rational points, degree 32 / 8 points | 16.7375 | 0.7255 | 23.07× | 0.7084 | 23.63× |
| Zero polynomial, degree 128 / 4 points | 1.6639 | 0.0627 | 26.55× | 0.0205 | 81.23× |
| Intervals, degree 8 / 8 points | 0.3619 | 0.0734 | 4.93× | 0.0756 | 4.79× |
| Rational coefficients, Integer points, degree 16 / 32 points | 1.9063 | 0.1723 | 11.07× | 0.1385 | 13.76× |
| Rational constant / 16 points | 0.1030 | 0.0029 | 35.13× | 0.0022 | 47.57× |

### Node

| Workload | RiX Horner ms | Core batch ms | Speedup | Fused batch ms | Speedup |
|---|---:|---:|---:|---:|---:|
| Integer, degree 32 / 32 points | 3.4212 | 0.0357 | 95.94× | 0.0459 | 74.56× |
| Rational points, degree 16 / 16 points | 7.0439 | 0.3230 | 21.81× | 0.2873 | 24.52× |
| Rational coefficients and points, degree 16 / 16 points | 7.1612 | 0.3699 | 19.36× | 0.3385 | 21.16× |
| 128-bit Rational points, degree 32 / 8 points | 42.4785 | 1.8134 | 23.42× | 1.7881 | 23.76× |
| Zero polynomial, degree 128 / 4 points | 1.7089 | 0.0766 | 22.31× | 0.0263 | 65.08× |
| Intervals, degree 8 / 8 points | 0.3406 | 0.0653 | 5.21× | 0.0654 | 5.21× |
| Rational coefficients, Integer points, degree 16 / 32 points | 2.0354 | 0.1840 | 11.06× | 0.1338 | 15.21× |
| Rational constant / 16 points | 0.1113 | 0.0046 | 24.40× | 0.0035 | 32.07× |

Most of the gain comes from keeping Horner's loop and intermediate values inside core, avoiding interpreter evaluation and its value boundaries. This is supported by the method-only core operation approaching the matched direct JavaScript control. Allocation/copy/GCD costs are not separately profiled here.

For degree-16 Rational points, the method batch is 13.00× faster than RiX Horner in Bun and 21.81× in Node. Fusion adds 1.10× / 1.12× over that batch. For the larger Rational workload, the method batch is already 23.07× / 23.42× faster and fusion adds only 1.02× / 1.01×. BigInt arithmetic dominates more of the combined operation there. For Rational coefficients at Integer points, fusion adds about 1.24× / 1.38×; for the zero polynomial it adds 3.06× / 2.92×.

Fusion is not a universal win: the all-Integer fused batch is slower than the method batch in Node (0.0459 vs 0.0357 ms), while intervals use the same fallback and show no extra benefit. Keep the simple combined operation as the control rather than assuming unboxing always helps.

Per-point calls preserve RiX traversal. For the degree-16 Rational example they achieve 11.78× / 21.01× with ordinary methods, versus 13.00× / 21.81× for the method batch. For the constant polynomial, batching matters much more: each point is so cheap that host calls and RiX traversal dominate. Full seven-path tables, medians/ranges and raw samples are in [Bun](results/polynomial-bun.md) ([JSON](results/polynomial-bun.json)) and [Node](results/polynomial-node.md) ([JSON](results/polynomial-node.json)).

## Methodology and validation

Eight deterministic workloads, seven execution paths, seven measured rounds and two warmups. Calibrated repeats target 15 ms per sample; variant order rotates within each workload. Bun and Node run sequentially. Timed work includes core argument validation, host calls, full arithmetic and typed output allocation, plus fresh contexts/function binding for RiX paths. Imports/build, parsing/lowering, fixture materialization and verification are excluded. No cached polynomial plan or excluded plan-preparation cost is involved. Direct JavaScript paths are controls for the remaining interpreter/host boundaries.

The six original polynomial workloads reuse exactly the preceding experiment's deterministic fixture generator (seed `0x7f42b139`). Two additional workloads cover Rational coefficients at Integer points and a constant. Comparisons are within this run; do not infer speedups by dividing timings across different reports/processes. The large operands retain identical precision and operation order. Measurements are from one process per runtime on one machine; small timing differences can be noise.

**All 555 unmodified core tests pass against the combined-operation core** (26 files; 75,706 assertions). **173 differential cases / 1,211 seven-path comparisons pass in both Bun and Node**, with original, unmodified-core RiX as the reference. Forty seeded cases also match an independent exact power-sum algorithm. Additional checks cover malformed inputs, empty polynomials/batches, cancellation/negative values, local class identity, subclasses/guarded fallbacks, shadowed fields, interval results, result types, input mutation, formatting, JSON revival and ordinary RiX sequence methods. Every calibration/warmup/measured batch verifies its final complete result outside timing.

[Test summary](results/tests.json), [core log](results/core-combined.txt), [Bun checks](results/verification-bun.json), [Node checks](results/verification-node.json). The complete RiX test suite was not rerun for this addition; its source is unchanged. The preceding experiment's focused numeric integration checks remain documented there.

The [review patch](patches/combined-operation.patch) shows only the changes relative to the preceding fast core; [build provenance](results/build-provenance.json) records original and generated source fingerprints. Production sources/tests/plugins and the production core dependency link are checked unchanged during installation.

## Next experiments

1. Add a prepared polynomial object that validates/coerces coefficients once, and measure its preparation and reuse break-even separately.
2. Use larger degrees and operand sizes to find where exact arithmetic overtakes interpreter overhead; profile allocation/copy and GCD work to explain the remaining gap.
3. Compare a deliberately different polynomial algorithm only as a separate experiment, especially for intervals where algebraic rewrites can change enclosures.
