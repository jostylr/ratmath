# Core arithmetic candidates — node

64 pairs/batch, 7 rounds, 2 warmups; calibrated repeats, rotated path order. All outputs checked outside timing.

| Workload | Current ms | Public helper speedup | Snapshot control ms | Private factory speedup vs control |
|---|---:|---:|---:|---:|
| integer-floor-32-inexact | 0.01259 | 25.57× | — | — |
| integer-modulo-32-inexact | 0.01447 | 24.69× | — | — |
| integer-remainder-32-inexact | 0.00104 | 1.87× | — | — |
| integer-divmod-32-inexact | 0.02725 | 34.95× | — | — |
| integer-floor-32-exact | 0.00264 | 4.65× | — | — |
| integer-modulo-32-exact | 0.00464 | 8.45× | — | — |
| integer-remainder-32-exact | 0.00111 | 2.14× | — | — |
| integer-divmod-32-exact | 0.00746 | 10.35× | — | — |
| integer-floor-256-inexact | 0.20404 | 16.79× | — | — |
| integer-modulo-256-inexact | 0.20555 | 31.66× | — | — |
| integer-remainder-256-inexact | 0.00625 | 0.99× | — | — |
| integer-divmod-256-inexact | 0.42786 | 33.95× | — | — |
| integer-floor-256-exact | 0.01237 | 1.09× | — | — |
| integer-modulo-256-exact | 0.01493 | 2.52× | — | — |
| integer-remainder-256-exact | 0.00570 | 1.00× | — | — |
| integer-divmod-256-exact | 0.02733 | 2.39× | — | — |
| integer-floor-2048-inexact | 3.28397 | 34.21× | — | — |
| integer-modulo-2048-inexact | 3.31587 | 65.99× | — | — |
| integer-remainder-2048-inexact | 0.04904 | 1.00× | — | — |
| integer-divmod-2048-inexact | 6.58182 | 68.43× | — | — |
| integer-floor-2048-exact | 0.09532 | 1.02× | — | — |
| integer-modulo-2048-exact | 0.10869 | 2.22× | — | — |
| integer-remainder-2048-exact | 0.04786 | 0.99× | — | — |
| integer-divmod-2048-exact | 0.20650 | 2.17× | — | — |
| mixed-add-64 | 0.04166 | 0.81× | 0.04059 | 8.24× |
| mixed-subtract-64 | 0.04132 | 0.81× | 0.04168 | 7.42× |
| integer-left-add-64 | 0.03992 | 0.78× | — | — |
| mixed-multiply-64 | 0.03924 | 0.82× | 0.03940 | 4.80× |
| mixed-divide-64 | 0.00951 | 0.44× | 0.00947 | 1.14× |
| equal-denominator-add-64 | 0.16954 | 1.97× | 0.17075 | 4.26× |
| equal-denominator-subtract-64 | 0.02956 | 1.00× | 0.02971 | 3.03× |
| shared-denominator-add-64 | 0.16883 | 1.55× | 0.17059 | 2.99× |
| unrelated-add-64 | 0.18773 | 0.82× | 0.17901 | 4.99× |
| cancel-multiply-64 | 0.02686 | 0.55× | 0.02673 | 0.93× |
| unrelated-multiply-64 | 0.16955 | 0.69× | 0.17027 | 2.74× |
| cancel-divide-64 | 0.01266 | 0.41× | 0.01262 | 0.93× |
| mixed-add-256 | 0.51709 | 0.98× | 0.51798 | 92.82× |
| mixed-subtract-256 | 0.52278 | 0.98× | 0.52541 | 91.42× |
| integer-left-add-256 | 0.51554 | 0.97× | — | — |
| mixed-multiply-256 | 0.51390 | 0.98× | 0.52787 | 49.55× |
| mixed-divide-256 | 0.02132 | 0.96× | 0.02142 | 2.35× |
| equal-denominator-add-256 | 0.77918 | 0.73× | 0.78562 | 1.45× |
| equal-denominator-subtract-256 | 0.04162 | 1.24× | 0.04200 | 3.35× |
| shared-denominator-add-256 | 0.76638 | 0.73× | 0.77542 | 1.43× |
| unrelated-add-256 | 1.23301 | 0.71× | 1.23363 | 2.42× |
| cancel-multiply-256 | 0.03376 | 0.57× | 0.03354 | 0.85× |
| unrelated-multiply-256 | 1.23085 | 0.55× | 1.23290 | 1.21× |
| cancel-divide-256 | 0.01634 | 0.47× | 0.01652 | 0.92× |
| mixed-add-1024 | 3.02215 | 1.00× | 3.03267 | 497.76× |
| mixed-subtract-1024 | 3.01377 | 1.00× | 3.01635 | 486.62× |
| integer-left-add-1024 | 3.04026 | 1.00× | — | — |
| mixed-multiply-1024 | 3.04816 | 1.00× | 3.06940 | 141.05× |
| mixed-divide-1024 | 0.06003 | 2.42× | 0.06037 | 5.30× |
| equal-denominator-add-1024 | 4.53206 | 0.73× | 4.55217 | 1.48× |
| equal-denominator-subtract-1024 | 0.12390 | 2.46× | 0.12357 | 5.15× |
| shared-denominator-add-1024 | 4.54576 | 0.73× | 4.55740 | 1.46× |
| unrelated-add-1024 | 7.60400 | 0.71× | 7.68704 | 2.48× |
| cancel-multiply-1024 | 0.07256 | 1.00× | 0.07370 | 1.39× |
| unrelated-multiply-1024 | 7.55400 | 0.55× | 7.56152 | 1.24× |
| cancel-divide-1024 | 0.04133 | 0.99× | 0.04138 | 1.70× |

Speedups below 1 indicate a regression. The public helper still normalizes its final production Rational; the private candidate can skip proven redundant normalization inside an isolated class copy. Floor/modulo and remainder retain their distinct signed semantics.
