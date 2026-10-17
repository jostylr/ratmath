# Core arithmetic candidates — bun

64 pairs/batch, 7 rounds, 2 warmups; calibrated repeats, rotated path order. All outputs checked outside timing.

| Workload | Current ms | Public helper speedup | Snapshot control ms | Private factory speedup vs control |
|---|---:|---:|---:|---:|
| integer-floor-32-inexact | 0.01105 | 6.64× | — | — |
| integer-modulo-32-inexact | 0.01228 | 10.61× | — | — |
| integer-remainder-32-inexact | 0.00081 | 0.87× | — | — |
| integer-divmod-32-inexact | 0.02396 | 10.64× | — | — |
| integer-floor-32-exact | 0.00219 | 1.57× | — | — |
| integer-modulo-32-exact | 0.00313 | 3.56× | — | — |
| integer-remainder-32-exact | 0.00069 | 0.89× | — | — |
| integer-divmod-32-exact | 0.00510 | 2.96× | — | — |
| integer-floor-256-inexact | 0.08041 | 12.46× | — | — |
| integer-modulo-256-inexact | 0.08436 | 23.57× | — | — |
| integer-remainder-256-inexact | 0.00311 | 0.96× | — | — |
| integer-divmod-256-inexact | 0.16204 | 23.28× | — | — |
| integer-floor-256-exact | 0.00671 | 1.21× | — | — |
| integer-modulo-256-exact | 0.00932 | 2.94× | — | — |
| integer-remainder-256-exact | 0.00308 | 0.98× | — | — |
| integer-divmod-256-exact | 0.01429 | 2.39× | — | — |
| integer-floor-2048-inexact | 1.05691 | 19.15× | — | — |
| integer-modulo-2048-inexact | 1.03959 | 36.73× | — | — |
| integer-remainder-2048-inexact | 0.02816 | 1.01× | — | — |
| integer-divmod-2048-inexact | 2.26426 | 39.52× | — | — |
| integer-floor-2048-exact | 0.05395 | 1.00× | — | — |
| integer-modulo-2048-exact | 0.06198 | 2.40× | — | — |
| integer-remainder-2048-exact | 0.02598 | 1.00× | — | — |
| integer-divmod-2048-exact | 0.11636 | 2.17× | — | — |
| mixed-add-64 | 0.03102 | 0.98× | 0.03125 | 6.73× |
| mixed-subtract-64 | 0.03091 | 0.97× | 0.03070 | 5.85× |
| integer-left-add-64 | 0.02702 | 0.98× | — | — |
| mixed-multiply-64 | 0.02666 | 0.94× | 0.02622 | 3.53× |
| mixed-divide-64 | 0.00920 | 0.78× | 0.00877 | 1.01× |
| equal-denominator-add-64 | 0.05361 | 1.07× | 0.05288 | 2.06× |
| equal-denominator-subtract-64 | 0.01209 | 0.83× | 0.01209 | 1.24× |
| shared-denominator-add-64 | 0.05533 | 0.96× | 0.05576 | 1.81× |
| unrelated-add-64 | 0.06928 | 0.75× | 0.06952 | 2.51× |
| cancel-multiply-64 | 0.01281 | 0.82× | 0.01257 | 1.14× |
| unrelated-multiply-64 | 0.06526 | 0.61× | 0.06469 | 1.48× |
| cancel-divide-64 | 0.00665 | 0.60× | 0.00667 | 0.76× |
| mixed-add-256 | 0.17250 | 0.99× | 0.17114 | 36.17× |
| mixed-subtract-256 | 0.17001 | 0.99× | 0.17014 | 32.45× |
| integer-left-add-256 | 0.16366 | 1.00× | — | — |
| mixed-multiply-256 | 0.16394 | 1.01× | 0.16399 | 21.28× |
| mixed-divide-256 | 0.01357 | 1.13× | 0.01349 | 1.53× |
| equal-denominator-add-256 | 0.22529 | 0.71× | 0.22451 | 1.41× |
| equal-denominator-subtract-256 | 0.01940 | 1.12× | 0.01959 | 1.74× |
| shared-denominator-add-256 | 0.23305 | 0.70× | 0.23178 | 1.37× |
| unrelated-add-256 | 0.38149 | 0.71× | 0.38283 | 2.37× |
| cancel-multiply-256 | 0.01682 | 0.85× | 0.01678 | 1.14× |
| unrelated-multiply-256 | 0.38653 | 0.56× | 0.38235 | 1.24× |
| cancel-divide-256 | 0.00920 | 0.78× | 0.00925 | 1.03× |
| mixed-add-1024 | 0.93309 | 1.01× | 0.90393 | 155.15× |
| mixed-subtract-1024 | 0.92975 | 0.99× | 0.93835 | 142.86× |
| integer-left-add-1024 | 0.94793 | 0.98× | — | — |
| mixed-multiply-1024 | 0.99768 | 1.01× | 0.99807 | 102.02× |
| mixed-divide-1024 | 0.02692 | 1.95× | 0.02741 | 2.68× |
| equal-denominator-add-1024 | 1.60526 | 0.82× | 1.62013 | 1.66× |
| equal-denominator-subtract-1024 | 0.06591 | 2.16× | 0.06579 | 3.36× |
| shared-denominator-add-1024 | 1.63152 | 0.85× | 1.63482 | 1.69× |
| unrelated-add-1024 | 2.64167 | 0.73× | 2.60043 | 2.57× |
| cancel-multiply-1024 | 0.03974 | 1.52× | 0.03905 | 1.81× |
| unrelated-multiply-1024 | 2.51917 | 0.56× | 2.55336 | 1.37× |
| cancel-divide-1024 | 0.02556 | 1.82× | 0.02555 | 2.19× |

Speedups below 1 indicate a regression. The public helper still normalizes its final production Rational; the private candidate can skip proven redundant normalization inside an isolated class copy. Floor/modulo and remainder retain their distinct signed semantics.
