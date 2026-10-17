# Node sampling profiles

500 microsecond sampling interval; 1.5 seconds per case after warmup. Diagnostics only, separate from clean timings. Copy-GCD percentages attribute normalization to its call stack.

| Variant | Workload/path | Normalization below copy | Other core | Samples | Raw profile |
|---|---|---:|---:|---:|---|
| control | integer-horner / RiX | 0.0% | 13.2% | 1997 | [profile](control-integer-horner-rix.cpuprofile) |
| control | rational-horner / RiX | 79.2% | 6.2% | 1995 | [profile](control-rational-horner-rix.cpuprofile) |
| control | larger-rational-horner / RiX | 88.6% | 4.5% | 2038 | [profile](control-larger-rational-horner-rix.cpuprofile) |
| control | larger-rational-horner / JS | 0.0% | 97.2% | 1990 | [profile](control-larger-rational-horner-js.cpuprofile) |
| literals | integer-horner / RiX | 0.0% | 4.2% | 1996 | [profile](literals-integer-horner-rix.cpuprofile) |
| literals | rational-horner / RiX | 0.0% | 30.2% | 1993 | [profile](literals-rational-horner-rix.cpuprofile) |
| literals | larger-rational-horner / RiX | 0.0% | 66.5% | 1991 | [profile](literals-larger-rational-horner-rix.cpuprofile) |

## control: integer-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| evaluate | rix/src/eval/evaluator.js:1234 | 12.4% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 11.0% |
| _callSystemMultifunction | rix/src/eval/registry.js:148 | 7.3% |
| parseNumber | packages/core/src/number-parser.js:409 | 6.4% |
| _prepareVariant | rix/src/eval/registry.js:63 | 5.9% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 4.9% |
| getEnv | rix/src/runtime/context.js:422 | 3.2% |
| evalFn | rix/src/eval/evaluator.js:1279 | 3.0% |
| cleanDigits | packages/core/src/number-parser.js:31 | 2.8% |
| withSharedBody | rix/src/runtime/context.js:517 | 2.7% |

## control: rational-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| #gcd | packages/core/src/rational.js:328 | 79.2% |
| gcd | packages/core/src/experimental-reduced.js:4 | 3.6% |
| post | node:inspector:115 | 2.6% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 1.5% |
| evaluate | rix/src/eval/evaluator.js:1234 | 1.1% |
| _callSystemMultifunction | rix/src/eval/registry.js:148 | 0.9% |
| parseNumber | packages/core/src/number-parser.js:409 | 0.8% |
| _prepareVariant | rix/src/eval/registry.js:63 | 0.7% |
| (program) | :0 | 0.7% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 0.6% |

## control: larger-rational-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| #gcd | packages/core/src/rational.js:328 | 88.6% |
| gcd | packages/core/src/experimental-reduced.js:4 | 4.2% |
| post | node:inspector:115 | 3.2% |
| (garbage collector) | :0 | 0.6% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 0.4% |
| evaluate | rix/src/eval/evaluator.js:1234 | 0.4% |
| (program) | :0 | 0.4% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 0.2% |
| impl | rix/src/runtime/type-system.js:1243 | 0.1% |
| shallowCopyValue | rix/src/runtime/cell.js:73 | 0.1% |

## control: larger-rational-horner, JS Horner, same methods

| Function (self time) | Source | Sampled share |
|---|---|---:|
| gcd | packages/core/src/experimental-reduced.js:4 | 92.2% |
| reduced | packages/core/src/experimental-reduced.js:11 | 2.6% |
| post | node:inspector:115 | 2.0% |
| #arithmeticFast | packages/core/src/rational.js:293 | 0.8% |
| (program) | :0 | 0.6% |
| isPlainInteger | packages/core/src/experimental-reduced.js:43 | 0.5% |
| _canUseReduced | packages/core/src/rational.js:284 | 0.3% |
| #fromReduced | packages/core/src/rational.js:259 | 0.2% |
| Rational | packages/core/src/rational.js:125 | 0.2% |
| (garbage collector) | :0 | 0.1% |

## literals: integer-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| evaluate | rix/src/eval/evaluator.js:1234 | 13.7% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 10.5% |
| _callSystemMultifunction | rix/src/eval/registry.js:148 | 7.4% |
| _prepareVariant | rix/src/eval/registry.js:63 | 7.2% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 5.2% |
| post | node:inspector:115 | 4.3% |
| evalFn | rix/src/eval/evaluator.js:1279 | 3.7% |
| getEnv | rix/src/runtime/context.js:422 | 3.3% |
| withSharedBody | rix/src/runtime/context.js:517 | 2.9% |
| (program) | :0 | 2.7% |

## literals: rational-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| gcd | packages/core/src/experimental-reduced.js:4 | 20.9% |
| evaluate | rix/src/eval/evaluator.js:1234 | 8.7% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 7.4% |
| _callSystemMultifunction | rix/src/eval/registry.js:148 | 5.5% |
| _prepareVariant | rix/src/eval/registry.js:63 | 4.9% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 3.2% |
| post | node:inspector:115 | 2.5% |
| evalFn | rix/src/eval/evaluator.js:1279 | 2.3% |
| getEnv | rix/src/runtime/context.js:422 | 2.2% |
| withSharedBody | rix/src/runtime/context.js:517 | 1.9% |

## literals: larger-rational-horner, RiX Horner, fast core

| Function (self time) | Source | Sampled share |
|---|---|---:|
| gcd | packages/core/src/experimental-reduced.js:4 | 61.8% |
| post | node:inspector:115 | 4.1% |
| evaluate | rix/src/eval/evaluator.js:1234 | 4.0% |
| resolveMethod | rix/src/runtime/methods.js:2042 | 3.5% |
| _prepareVariant | rix/src/eval/registry.js:63 | 2.6% |
| _callSystemMultifunction | rix/src/eval/registry.js:148 | 1.9% |
| reduced | packages/core/src/experimental-reduced.js:11 | 1.8% |
| _invokeSystemMultifunction | rix/src/eval/registry.js:86 | 1.6% |
| (program) | :0 | 1.4% |
| _canUseReduced | packages/core/src/rational.js:284 | 1.2% |

Shares include profiler/GC/host samples and depend on sampling/JIT attribution. Self time is aggregated by function/source line; stack-inclusive entries in JSON are not additive. Profiles do not establish exact wall-time fractions, and these Node samples do not directly measure Bun.
