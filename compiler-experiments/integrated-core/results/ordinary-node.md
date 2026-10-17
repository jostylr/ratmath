# Ordinary RiX with experimental core — node

7 measured samples, 2 warmups, calibrated repeats and rotated variant order. Times are ms per complete batch.

| Workload | Baseline ms | Core-only ms | Core-only speedup | Core + Integer wiring ms | Speedup |
|---|---:|---:|---:|---:|---:|
| integer-horner | 3.3993 | 3.2986 | 1.03× | 3.0702 | 1.11× |
| rational-horner | 17.6643 | 7.0004 | 2.52× | 6.9171 | 2.55× |
| rational-coefficients-horner | 18.2570 | 7.0605 | 2.59× | 7.1348 | 2.56× |
| larger-rational-horner | 116.2248 | 41.1607 | 2.82× | 41.3297 | 2.81× |
| zero-rational-horner | 1.6513 | 1.6591 | 1.00× | 1.5816 | 1.04× |
| interval-horner | 0.3611 | 0.3487 | 1.04× | 0.3350 | 1.08× |
| mixed-rational-loop-256 | 26.5040 | 10.7713 | 2.46× | 10.6984 | 2.48× |
| mixed-rational-loop-1024 | 153.0799 | 52.9263 | 2.89× | 53.1730 | 2.88× |
| integer-division-inexact | 6.4514 | 6.4490 | 1.00× | 0.2616 | 24.66× |
| integer-division-exact | 0.2499 | 0.2491 | 1.00× | 0.2584 | 0.97× |
| integer-modulo-inexact | 6.4887 | 6.5381 | 0.99× | 0.1646 | 39.42× |
| integer-modulo-exact | 0.2686 | 0.2695 | 1.00× | 0.1575 | 1.70× |
| binary-modular-powers | 258.1907 | 258.0791 | 1.00× | 16.2731 | 15.87× |

Core-only uses identical RiX source files and its default operator registry. Core + Integer wiring changes only the copied INTDIV/MOD/DIVMOD built-ins to use new core methods; production RiX is unchanged. No source annotations, compilation, Host math helpers, unboxed polynomial kernels or altered RiX algorithms are used. Full exact values and types match the baseline.
