# Ordinary RiX with experimental core — node

7 measured samples, 2 warmups, calibrated repeats and rotated variant order. Times are ms per complete batch.

| Workload | Baseline ms | Core-only ms | Core-only speedup | Core + Integer wiring ms | Speedup |
|---|---:|---:|---:|---:|---:|
| integer-horner | 3.4714 | 3.2195 | 1.08× | 3.2540 | 1.07× |
| rational-horner | 18.2324 | 7.1121 | 2.56× | 7.0570 | 2.58× |
| rational-coefficients-horner | 18.3560 | 7.2235 | 2.54× | 7.2109 | 2.55× |
| larger-rational-horner | 117.1957 | 41.7155 | 2.81× | 42.0905 | 2.78× |
| zero-rational-horner | 1.7097 | 1.6616 | 1.03× | 1.7037 | 1.00× |
| interval-horner | 0.3686 | 0.3616 | 1.02× | 0.3754 | 0.98× |
| mixed-rational-loop-256 | 27.3650 | 11.0757 | 2.47× | 11.1214 | 2.46× |
| mixed-rational-loop-1024 | 155.7760 | 53.7062 | 2.90× | 53.8531 | 2.89× |
| integer-division-inexact | 6.6891 | 6.6804 | 1.00× | 0.2764 | 24.20× |
| integer-division-exact | 0.2588 | 0.2607 | 0.99× | 0.2677 | 0.97× |
| integer-modulo-inexact | 6.6111 | 6.6441 | 1.00× | 0.1698 | 38.93× |
| integer-modulo-exact | 0.2785 | 0.2782 | 1.00× | 0.1626 | 1.71× |
| binary-modular-powers | 256.8119 | 257.2463 | 1.00× | 16.4225 | 15.64× |

Core-only uses identical RiX source files and its default operator registry. Core + Integer wiring changes only the copied INTDIV/MOD/DIVMOD built-ins to use new core methods; production RiX is unchanged. No source annotations, compilation, Host math helpers, unboxed polynomial kernels or altered RiX algorithms are used. Full exact values and types match the baseline.
