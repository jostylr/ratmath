# Ordinary RiX with experimental core — bun

7 measured samples, 2 warmups, calibrated repeats and rotated variant order. Times are ms per complete batch.

| Workload | Baseline ms | Core-only ms | Core-only speedup | Core + Integer wiring ms | Speedup |
|---|---:|---:|---:|---:|---:|
| integer-horner | 2.7561 | 2.6510 | 1.04× | 2.6813 | 1.03× |
| rational-horner | 5.8839 | 2.7207 | 2.16× | 2.7598 | 2.13× |
| rational-coefficients-horner | 6.2336 | 2.9387 | 2.12× | 2.8136 | 2.22× |
| larger-rational-horner | 36.1592 | 13.4471 | 2.69× | 13.4777 | 2.68× |
| zero-rational-horner | 1.3555 | 1.3778 | 0.98× | 1.4067 | 0.96× |
| interval-horner | 0.3047 | 0.3226 | 0.94× | 0.3193 | 0.95× |
| mixed-rational-loop-256 | 9.4164 | 4.8461 | 1.94× | 4.8796 | 1.93× |
| mixed-rational-loop-1024 | 46.5446 | 17.2968 | 2.69× | 17.3734 | 2.68× |
| integer-division-inexact | 2.1966 | 2.2094 | 0.99× | 0.1436 | 15.29× |
| integer-division-exact | 0.1393 | 0.1398 | 1.00× | 0.1375 | 1.01× |
| integer-modulo-inexact | 2.2916 | 2.2991 | 1.00× | 0.0894 | 25.64× |
| integer-modulo-exact | 0.1582 | 0.1569 | 1.01× | 0.0819 | 1.93× |
| binary-modular-powers | 91.7493 | 92.2283 | 0.99× | 10.7420 | 8.54× |

Core-only uses identical RiX source files and its default operator registry. Core + Integer wiring changes only the copied INTDIV/MOD/DIVMOD built-ins to use new core methods; production RiX is unchanged. No source annotations, compilation, Host math helpers, unboxed polynomial kernels or altered RiX algorithms are used. Full exact values and types match the baseline.
